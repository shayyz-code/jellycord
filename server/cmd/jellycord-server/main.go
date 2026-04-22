package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/shayyz-code/jellycord/server/internal/auth"
	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/httpapi"
	"github.com/shayyz-code/jellycord/server/internal/store"
)

func main() {
	cfg := config.Load()

	rdbOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("invalid JELLYCORD_REDIS_URL: %v", err)
	}
	rdb := redis.NewClient(rdbOpts)
	defer rdb.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping failed: %v", err)
	}

	st := store.New(rdb)
	if err := bootstrapAdmin(ctx, st); err != nil {
		log.Fatalf("bootstrap admin failed: %v", err)
	}

	j, err := auth.NewJWT(cfg.JWTSecret)
	if err != nil {
		log.Fatalf("jwt init failed: %v", err)
	}

	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      httpapi.New(cfg, st, j).Mux(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("jellycord-server listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
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
		log.Printf("bootstrap admin created: %s", username)
		return nil
	}
	if errors.Is(err, store.ErrUserExists) {
		log.Printf("bootstrap admin already exists: %s", username)
		return nil
	}
	return err
}

func waitForShutdown(srv *http.Server) {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
