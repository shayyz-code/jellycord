package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/shayyz-code/jellycord/cli/internal/client"
	clicfg "github.com/shayyz-code/jellycord/cli/internal/config"
)

func main() {
	fmt.Print(jellyCordBanner())

	if len(os.Args) < 2 {
		printHelp()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "login":
		cmdLogin(os.Args[2:])
	case "chat":
		cmdChat(os.Args[2:])
	case "help", "-h", "--help":
		printHelp()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", os.Args[1])
		printHelp()
		os.Exit(2)
	}
}

func jellyCordBanner() string {
	return `
       _      _ _        _____              _ 
      | |    | | |      / ____|            | |
      | | ___| | |_   _| |     ___  _ __ __| |
  _   | |/ _ \ | | | | | |    / _ \| '__/ _` + "`" + ` |
 | |__| |  __/ | | |_| | |___| (_) | | | (_| |
  \____/ \___|_|_|\__, |\_____\___/|_|  \__,_|
                   __/ |                      
                  |___/                       
`
}

func printHelp() {
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  jellycord login --server http://localhost:8080 --username alice --password pass123")
	fmt.Println("  jellycord chat  --server http://localhost:8080 --room general")
	fmt.Println()
	fmt.Println("Notes:")
	fmt.Println("  - Users must be created by an admin on the server.")
	fmt.Println("  - Login stores a JWT locally; chat uses it to connect to /ws.")
}

func cmdLogin(args []string) {
	fs := flag.NewFlagSet("login", flag.ExitOnError)
	server := fs.String("server", "http://localhost:8080", "server base URL")
	username := fs.String("username", "", "username")
	password := fs.String("password", "", "password")
	_ = fs.Parse(args)

	if *username == "" || *password == "" {
		fmt.Fprintln(os.Stderr, "username and password are required")
		os.Exit(2)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	body, _ := json.Marshal(map[string]string{"username": *username, "password": *password})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(*server, "/")+"/auth/login", bytes.NewReader(body))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		fmt.Fprintln(os.Stderr, "failed to decode response:", err)
		os.Exit(1)
	}
	if resp.StatusCode != 200 || out.Token == "" {
		fmt.Fprintln(os.Stderr, "login failed")
		os.Exit(1)
	}

	if err := clicfg.Save(clicfg.Config{Token: out.Token}); err != nil {
		fmt.Fprintln(os.Stderr, "failed to save config:", err)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("Logged in. Token saved.")
}

func cmdChat(args []string) {
	fs := flag.NewFlagSet("chat", flag.ExitOnError)
	server := fs.String("server", "http://localhost:8080", "server base URL")
	room := fs.String("room", "general", "room name")
	_ = fs.Parse(args)

	cfg, err := clicfg.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to load config:", err)
		os.Exit(1)
	}
	if cfg.Token == "" {
		fmt.Fprintln(os.Stderr, "not logged in. run: jellycord login ...")
		os.Exit(2)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cc, err := client.DialChat(ctx, *server, *room, cfg.Token)
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to connect:", err)
		os.Exit(1)
	}
	defer cc.Close(1000, "bye")

	fmt.Println()
	fmt.Printf("Joined room %q. Type messages and press Enter. Ctrl+C to exit.\n", *room)

	// Reader from server
	go func() {
		for {
			m, err := cc.ReadMessage(ctx)
			if err != nil {
				return
			}
			if m.Type == "message" {
				fmt.Printf("[%s] %s\n", m.From, m.Text)
			}
		}
	}()

	// Reader from stdin -> server
	in := make([]byte, 0, 4096)
	buf := make([]byte, 1)
	for {
		select {
		case <-ctx.Done():
			fmt.Println()
			return
		default:
		}

		n, err := os.Stdin.Read(buf)
		if err != nil || n == 0 {
			return
		}
		if buf[0] == '\n' {
			line := strings.TrimRight(string(in), "\r")
			in = in[:0]
			_ = cc.SendText(ctx, line)
			continue
		}
		in = append(in, buf[0])
	}
}

