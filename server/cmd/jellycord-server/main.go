package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/shayyz-code/jellycord/server/internal/auth"
	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/httpapi"
	"github.com/shayyz-code/jellycord/server/internal/store"
)

func main() {
	// Setup structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Load .env file if it exists, allowing it to override existing env vars in dev
	if err := godotenv.Overload(); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("error loading .env file", "error", err)
	}

	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		slog.Error("invalid config", "error", err)
		os.Exit(1)
	}

	rdbOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		slog.Error("invalid JELLYCORD_REDIS_URL", "error", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(rdbOpts)
	defer rdb.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Error("redis ping failed", "error", err)
		os.Exit(1)
	}

	st := store.New(rdb)
	if err := bootstrapAdmin(ctx, st); err != nil {
		slog.Error("bootstrap admin failed", "error", err)
		os.Exit(1)
	}

	j, err := auth.NewJWT(cfg.JWTSecret)
	if err != nil {
		slog.Error("jwt init failed", "error", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.New(cfg, st, j).Handler(),
		ReadTimeout:       0,  // Disable for WebSockets
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      0,  // Disable for WebSockets
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		slog.Info("jellycord-server started", "addr", cfg.Addr, "env", os.Getenv("JELLYCORD_ENV"))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	waitForShutdown(srv)
}

func bootstrapAdmin(ctx context.Context, st *store.Store) error {
	username := os.Getenv("JELLYCORD_BOOTSTRAP_ADMIN_USERNAME")
	password := os.Getenv("JELLYCORD_BOOTSTRAP_ADMIN_PASSWORD")
	if username == "" || password == "" {
		return nil
	}
	err := st.CreateUser(ctx, username, password, "admin")
	if err == nil {
		slog.Info("bootstrap admin created", "username", username)
		return nil
	}
	if errors.Is(err, store.ErrUserExists) {
		slog.Info("bootstrap admin already exists", "username", username)
		return nil
	}
	return err
}

func waitForShutdown(srv *http.Server) {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}
