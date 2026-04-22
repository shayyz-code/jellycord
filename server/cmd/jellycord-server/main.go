package main

import (
	"log"
	"net/http"

	"github.com/redis/go-redis/v9"

	"github.com/shayyz-code/jellycord/server/internal/auth"
	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/httpapi"
	"github.com/shayyz-code/jellycord/server/internal/store"
)

func main() {
	cfg := config.Load()

	j, err := auth.NewJWT(cfg.JWTSecret)
	if err != nil {
		log.Fatalf("jwt config error: %v", err)
	}

	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis url error: %v", err)
	}
	rdb := redis.NewClient(opt)
	st := store.New(rdb)

	api := httpapi.New(cfg, st, j)
	mux := api.Mux()

	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: mux,
	}

	log.Printf("jellycord-server listening on %s", cfg.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

