package httpapi

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/shayyz-code/jellycord/server/internal/auth"
	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/store"

	"nhooyr.io/websocket"
)

func TestWS_AuthRequired(t *testing.T) {
	cfg := config.Config{
		Addr:      ":0",
		RedisURL:  "redis://localhost:6379/0",
		JWTSecret: "test-secret",
		AdminKey:  "admin",
	}

	j, err := auth.NewJWT(cfg.JWTSecret)
	if err != nil {
		t.Fatal(err)
	}

	// Stub store/redis for mux construction; this test doesn't touch Redis.
	st := store.New(redis.NewClient(&redis.Options{Addr: "127.0.0.1:6379"}))

	s := New(cfg, st, j)
	ts := httptest.NewServer(s.Mux())
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, _, err = websocket.Dial(ctx, ts.URL+"/ws?room=room-a", nil)
	if err == nil {
		t.Fatalf("expected dial to fail without auth")
	}
}

