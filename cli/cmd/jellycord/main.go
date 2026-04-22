package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/term"
	"nhooyr.io/websocket"

	"github.com/shayyz-code/jellycord/cli/internal/client"
	"github.com/shayyz-code/jellycord/cli/internal/config"
)

const (
	defaultServerURL = "http://127.0.0.1:8080"
	defaultRoom      = "general"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		fatalf("failed to load config: %v", err)
	}
	if strings.TrimSpace(cfg.ServerURL) == "" {
		cfg.ServerURL = defaultServerURL
	}

	args := os.Args[1:]
	if len(args) == 0 {
		runChat(ctx, cfg, nil)
		return
	}

	switch args[0] {
	case "help", "-h", "--help":
		printHelp()
	case "login":
		runLogin(ctx, cfg, args[1:])
	case "logout":
		runLogout(cfg)
	case "chat":
		runChat(ctx, cfg, args[1:])
	case "admin":
		runAdmin(ctx, cfg, args[1:])
	case "whoami":
		runWhoAmI(ctx, cfg, args[1:])
	default:
		// Smooth UX: any unknown invocation falls back to default chat flow.
		runChat(ctx, cfg, nil)
	}
}

func printHelp() {
	fmt.Println("Jellycord CLI")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  jellycord                     # start chat (interactive login if needed)")
	fmt.Println("  jellycord chat [--room ROOM] [--server URL]")
	fmt.Println("  jellycord login [--username U] [--password P] [--server URL]")
	fmt.Println("  jellycord logout")
	fmt.Println("  jellycord whoami [--server URL]")
	fmt.Println("  jellycord admin create-user [--username U] [--password P] [--role user|admin] [--server URL] [--admin-key KEY]")
}

func runLogin(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("login", flag.ExitOnError)
	server := fs.String("server", cfg.ServerURL, "server base URL")
	username := fs.String("username", "", "username")
	password := fs.String("password", "", "password")
	_ = fs.Parse(args)

	u := strings.TrimSpace(*username)
	p := strings.TrimSpace(*password)
	if u == "" {
		u = promptLine("Username: ")
	}
	if p == "" {
		p = promptPassword("Password: ")
	}

	loginCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	out, err := client.Login(loginCtx, *server, u, p)
	if err != nil {
		fatalf("login failed: %v", err)
	}

	cfg.Token = out.Token
	cfg.ServerURL = strings.TrimRight(*server, "/")
	cfg.Username = u
	if out.User.Username != "" {
		cfg.Username = out.User.Username
	}
	if err := config.Save(cfg); err != nil {
		fatalf("failed saving config: %v", err)
	}
	fmt.Printf("Logged in as %s\n", cfg.Username)
}

func runLogout(cfg config.Config) {
	cfg.Token = ""
	cfg.Username = ""
	if err := config.Save(cfg); err != nil {
		fatalf("failed saving config: %v", err)
	}
	fmt.Println("Logged out.")
}

func runWhoAmI(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("whoami", flag.ExitOnError)
	server := fs.String("server", cfg.ServerURL, "server base URL")
	_ = fs.Parse(args)

	if strings.TrimSpace(cfg.Token) == "" {
		fatalf("not logged in. Run: jellycord login")
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	me, err := client.Me(callCtx, *server, cfg.Token)
	if err != nil {
		fatalf("%v", err)
	}
	fmt.Printf("%s (%s)\n", me.Username, me.Role)
}

func runAdmin(ctx context.Context, cfg config.Config, args []string) {
	if len(args) == 0 || args[0] != "create-user" {
		fatalf("usage: jellycord admin create-user [--username U] [--password P] [--role user|admin] [--server URL] [--admin-key KEY]")
	}

	fs := flag.NewFlagSet("admin create-user", flag.ExitOnError)
	server := fs.String("server", cfg.ServerURL, "server base URL")
	adminKey := fs.String("admin-key", "", "admin key (or set JELLYCORD_ADMIN_KEY)")
	username := fs.String("username", "", "new username")
	password := fs.String("password", "", "new password")
	role := fs.String("role", "user", "user role: user|admin")
	_ = fs.Parse(args[1:])

	key := strings.TrimSpace(*adminKey)
	if key == "" {
		key = strings.TrimSpace(os.Getenv("JELLYCORD_ADMIN_KEY"))
	}
	adminToken := strings.TrimSpace(cfg.Token)
	if key == "" && adminToken == "" {
		fmt.Println("No admin key or login token found.")
		key = promptPassword("Admin key: ")
	}

	u := strings.TrimSpace(*username)
	p := strings.TrimSpace(*password)
	r := strings.TrimSpace(*role)

	if u == "" {
		u = promptLine("New username: ")
	}
	if p == "" {
		p = promptPassword("New password: ")
	}
	if r == "" {
		r = "user"
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	out, err := client.AdminCreateUser(callCtx, *server, key, adminToken, u, p, r)
	if err != nil {
		fatalf("%v", err)
	}
	fmt.Printf("User created: %s (%s)\n", out.User.Username, out.User.Role)
}

func runChat(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("chat", flag.ExitOnError)
	server := fs.String("server", cfg.ServerURL, "server base URL")
	room := fs.String("room", defaultRoom, "chat room")
	_ = fs.Parse(args)

	serverURL := strings.TrimSpace(*server)
	if serverURL == "" {
		serverURL = defaultServerURL
	}
	roomName := strings.TrimSpace(*room)
	if roomName == "" {
		roomName = defaultRoom
	}

	token := strings.TrimSpace(cfg.Token)
	if token == "" {
		fmt.Println("No saved login found. Please log in.")
		u := promptLine("Username: ")
		p := promptPassword("Password: ")

		loginCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		out, err := client.Login(loginCtx, serverURL, u, p)
		cancel()
		if err != nil {
			fatalf("login failed: %v", err)
		}

		cfg.Token = out.Token
		cfg.ServerURL = strings.TrimRight(serverURL, "/")
		cfg.Username = u
		if out.User.Username != "" {
			cfg.Username = out.User.Username
		}
		if err := config.Save(cfg); err != nil {
			fatalf("failed saving config: %v", err)
		}
		token = out.Token
		fmt.Printf("Logged in as %s\n", cfg.Username)
	}

	connCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	cc, err := client.DialChat(connCtx, serverURL, roomName, token)
	cancel()
	if err != nil {
		fatalf("failed to connect room %q: %v", roomName, err)
	}
	defer cc.Close(websocket.StatusNormalClosure, "bye")

	fmt.Printf("Connected to %s (room: %s)\n", serverURL, roomName)
	fmt.Println("Type and press Enter to send. Ctrl+C to quit.")

	errCh := make(chan error, 2)

	go func() {
		for {
			m, err := cc.ReadMessage(ctx)
			if err != nil {
				errCh <- err
				return
			}
			fmt.Printf("[%s] %s\n", m.From, m.Text)
		}
	}()

	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			if err := cc.SendText(ctx, scanner.Text()); err != nil {
				errCh <- err
				return
			}
		}
		if err := scanner.Err(); err != nil {
			errCh <- err
			return
		}
		errCh <- errors.New("input closed")
	}()

	select {
	case <-ctx.Done():
	case err := <-errCh:
		if !errors.Is(err, context.Canceled) {
			fmt.Fprintf(os.Stderr, "chat ended: %v\n", err)
		}
	}
}

func promptLine(label string) string {
	fmt.Fprint(os.Stdout, label)
	reader := bufio.NewReader(os.Stdin)
	v, _ := reader.ReadString('\n')
	return strings.TrimSpace(v)
}

func promptPassword(label string) string {
	fmt.Fprint(os.Stdout, label)
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stdout)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
