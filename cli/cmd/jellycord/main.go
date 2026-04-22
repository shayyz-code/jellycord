package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/term"
	"nhooyr.io/websocket"

	"github.com/joho/godotenv"
	"github.com/shayyz-code/jellycord/cli/internal/client"
	"github.com/shayyz-code/jellycord/cli/internal/config"
)

const (
	defaultServerURL = "http://127.0.0.1:8080"
	defaultRoom      = "general"

	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorWhite  = "\033[37m"
	colorBold   = "\033[1m"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Load .env file if it exists
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		fatalf("failed to load config: %v", err)
	}
	args := os.Args[1:]
	if len(args) == 0 {
		printBanner()
		runChat(ctx, cfg, nil)
		return
	}

	switch args[0] {
	case "help", "-h", "--help":
		printBanner()
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
		fmt.Printf("%sUnknown command: %s%s\n\n", colorRed, args[0], colorReset)
		printHelp()
	}
}

func printBanner() {
	banner := `
       _      _ _        _____              _ 
      | |    | | |      / ____|            | |
      | | ___| | |_   _| |     ___  _ __ __| |
  _   | |/ _ \ | | | | | |    / _ \| '__/ _` + "`" + ` |
 | |__| |  __/ | | |_| | |___| (_) | | | (_| |
  \____/ \___|_|_|\__, |\_____\___/|_|  \__,_|
                   __/ |                      
                  |___/                       
`
	fmt.Printf("%s%s%s\n", colorCyan, banner, colorReset)
}

func printHelp() {
	fmt.Printf("%sJellycord CLI - Production Grade Chat%s\n\n", colorBold, colorReset)
	fmt.Println("Usage:")
	fmt.Printf("  %sjellycord%s                     # start chat (interactive login if needed)\n", colorGreen, colorReset)
	fmt.Printf("  %sjellycord chat%s [--room ROOM] [--server URL]\n", colorGreen, colorReset)
	fmt.Printf("  %sjellycord login%s [--username U] [--password P] [--server URL]\n", colorGreen, colorReset)
	fmt.Printf("  %sjellycord logout%s\n", colorGreen, colorReset)
	fmt.Printf("  %sjellycord whoami%s [--server URL]\n", colorGreen, colorReset)
	fmt.Printf("  %sjellycord admin create-user%s [--username U] [--password P] [--role user|admin] [--server URL] [--admin-key KEY]\n", colorGreen, colorReset)
	fmt.Println()
}

func runLogin(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("login", flag.ExitOnError)
	server := fs.String("server", "", "server base URL")
	username := fs.String("username", "", "username")
	password := fs.String("password", "", "password")
	_ = fs.Parse(args)

	serverURL, err := effectiveServerURL(cfg, *server)
	if err != nil {
		fatalf("invalid server URL: %v", err)
	}

	u := strings.TrimSpace(*username)
	p := strings.TrimSpace(*password)
	if u == "" || p == "" {
		fmt.Printf("%s--- Login to %s ---%s\n", colorCyan, serverURL, colorReset)
		u, p = promptCredentials(u, p)
	}
	out, err := performLogin(ctx, serverURL, u, p)
	if err != nil {
		fatalf("login failed: %v", err)
	}

	cfg.Token = out.Token
	cfg.ServerURL = serverURL
	cfg.Username = u
	if out.User.Username != "" {
		cfg.Username = out.User.Username
	}
	if err := config.Save(cfg); err != nil {
		fatalf("failed saving config: %v", err)
	}
	fmt.Printf("%sLogged in as %s%s%s\n", colorGreen, colorBold, cfg.Username, colorReset)
}

func runLogout(cfg config.Config) {
	cfg.Token = ""
	cfg.Username = ""
	if err := config.Save(cfg); err != nil {
		fatalf("failed saving config: %v", err)
	}
	fmt.Printf("%sLogged out successfully.%s\n", colorYellow, colorReset)
}

func runWhoAmI(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("whoami", flag.ExitOnError)
	server := fs.String("server", "", "server base URL")
	_ = fs.Parse(args)

	if strings.TrimSpace(cfg.Token) == "" {
		fatalf("not logged in. Run: jellycord login")
	}

	serverURL, err := effectiveServerURL(cfg, *server)
	if err != nil {
		fatalf("invalid server URL: %v", err)
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	me, err := client.Me(callCtx, serverURL, cfg.Token)
	if err != nil {
		fatalf("%v", err)
	}
	fmt.Printf("%sUser:%s %s\n", colorCyan, colorReset, me.Username)
	fmt.Printf("%sRole:%s %s\n", colorCyan, colorReset, me.Role)
	fmt.Printf("%sServer:%s %s\n", colorCyan, colorReset, serverURL)
}

func runAdmin(ctx context.Context, cfg config.Config, args []string) {
	if len(args) == 0 || args[0] != "create-user" {
		fatalf("usage: jellycord admin create-user [--username U] [--password P] [--role user|admin] [--server URL] [--admin-key KEY]")
	}

	fs := flag.NewFlagSet("admin create-user", flag.ExitOnError)
	server := fs.String("server", "", "server base URL")
	adminKey := fs.String("admin-key", "", "admin key (or set JELLYCORD_ADMIN_KEY)")
	username := fs.String("username", "", "new username")
	password := fs.String("password", "", "new password")
	role := fs.String("role", "user", "user role: user|admin")
	_ = fs.Parse(args[1:])

	serverURL, err := effectiveServerURL(cfg, *server)
	if err != nil {
		fatalf("invalid server URL: %v", err)
	}

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
	if len(p) < 8 {
		fatalf("new password must be at least 8 characters")
	}
	if r == "" {
		r = "user"
	}

	callCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	out, err := client.AdminCreateUser(callCtx, serverURL, key, adminToken, u, p, r)
	if err != nil {
		fatalf("%v", err)
	}
	fmt.Printf("User created: %s (%s)\n", out.User.Username, out.User.Role)
}

func runChat(ctx context.Context, cfg config.Config, args []string) {
	fs := flag.NewFlagSet("chat", flag.ExitOnError)
	server := fs.String("server", "", "server base URL")
	room := fs.String("room", "", "chat room")
	_ = fs.Parse(args)

	serverURL, err := effectiveServerURL(cfg, *server)
	if err != nil {
		fatalf("invalid server URL: %v", err)
	}
	roomName := strings.TrimSpace(*room)
	if roomName == "" {
		roomName = strings.TrimSpace(cfg.LastRoom)
	}
	if roomName == "" {
		roomName = defaultRoom
	}

	token := strings.TrimSpace(cfg.Token)
	if token != "" {
		checkCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
		_, err := client.Me(checkCtx, serverURL, token)
		cancel()
		if err != nil && errors.Is(err, client.ErrUnauthorized) {
			fmt.Printf("%sSaved session expired. Please log in again.%s\n", colorYellow, colorReset)
			cfg.Token = ""
			cfg.Username = ""
			token = ""
		}
	}

	if token == "" {
		fmt.Printf("%sNo saved login found. Please log in.%s\n", colorYellow, colorReset)
		u, p := promptCredentials("", "")
		out, err := performLogin(ctx, serverURL, u, p)
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
		fmt.Printf("%sLogged in as %s%s%s\n", colorGreen, colorBold, cfg.Username, colorReset)
	}

	cfg.LastRoom = roomName
	if err := config.Save(cfg); err != nil {
		fatalf("failed saving config: %v", err)
	}

	connCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	cc, err := client.DialChat(connCtx, serverURL, roomName, token)
	cancel()
	if err != nil {
		fatalf("failed to connect room %q: %v", roomName, err)
	}
	defer cc.Close(websocket.StatusNormalClosure, "bye")

	fmt.Printf("%sConnected to %s (room: %s)%s\n", colorGreen, serverURL, roomName, colorReset)
	fmt.Printf("%sType and press Enter to send. Ctrl+C to quit.%s\n\n", colorCyan, colorReset)

	errCh := make(chan error, 2)

	go func() {
		for {
			m, err := cc.ReadMessage(ctx)
			if err != nil {
				errCh <- err
				return
			}
			fmt.Printf("%s[%s]%s %s\n", colorPurple, m.From, colorReset, m.Text)
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
			fmt.Fprintf(os.Stderr, "%schat ended: %v%s\n", colorRed, err, colorReset)
		}
	}
}

func promptLine(label string) string {
	fmt.Printf("%s%s%s", colorBold, label, colorReset)
	reader := bufio.NewReader(os.Stdin)
	v, _ := reader.ReadString('\n')
	return strings.TrimSpace(v)
}

func promptPassword(label string) string {
	if !term.IsTerminal(int(os.Stdin.Fd())) {
		return promptLine(label)
	}
	fmt.Printf("%s%s%s", colorBold, label, colorReset)
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stdout)
	if err != nil {
		return promptLine(label)
	}
	return strings.TrimSpace(string(b))
}

func promptCredentials(username, password string) (string, string) {
	u := strings.TrimSpace(username)
	p := strings.TrimSpace(password)
	if u == "" {
		u = promptLine("Username: ")
	}
	if p == "" {
		p = promptPassword("Password: ")
	}
	return u, p
}

func performLogin(ctx context.Context, serverURL, username, password string) (client.LoginResponse, error) {
	loginCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return client.Login(loginCtx, serverURL, username, password)
}

func effectiveServerURL(cfg config.Config, fromFlag string) (string, error) {
	raw := strings.TrimSpace(fromFlag)
	if raw == "" {
		raw = strings.TrimSpace(os.Getenv("JELLYCORD_SERVER_URL"))
	}
	if raw == "" {
		raw = strings.TrimSpace(cfg.ServerURL)
	}
	if raw == "" {
		raw = defaultServerURL
	}
	raw = strings.TrimRight(raw, "/")
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", fmt.Errorf("server must be http(s), got %q", raw)
	}
	if u.Host == "" {
		return "", fmt.Errorf("server host is required")
	}
	return raw, nil
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, colorRed+format+colorReset+"\n", args...)
	os.Exit(1)
}
