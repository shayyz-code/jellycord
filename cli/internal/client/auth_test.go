package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLogin_SuccessReturnsToken(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/login" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"token":"abc"}`))
	}))
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	out, err := Login(ctx, ts.URL, "alice", "pass")
	if err != nil {
		t.Fatal(err)
	}
	if out.Token != "abc" {
		t.Fatalf("expected token abc, got %q", out.Token)
	}
}

func TestLogin_InvalidCredentialsReturnsServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid credentials"}`))
	}))
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := Login(ctx, ts.URL, "alice", "wrong")
	if err == nil {
		t.Fatalf("expected error")
	}
	if got := err.Error(); got == "" || got == "login failed" {
		t.Fatalf("expected informative error, got %q", got)
	}
}

