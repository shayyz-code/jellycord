package main

import (
	"log"
	"net/http"

	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/httpapi"
)

func main() {
	cfg := config.Load()
	mux := httpapi.NewMux()

	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: mux,
	}

	log.Printf("jellycord-server listening on %s", cfg.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

