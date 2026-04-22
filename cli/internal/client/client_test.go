package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"nhooyr.io/websocket"
)

func TestChatConn_SendAndReceive(t *testing.T) {
	// Minimal echo/broadcast server for testing:
	// - client sends {"type":"message","text":"hi"}
	// - server responds with {"type":"message","room":"r","from":"alice","text":"hi","sent_at_ms":1}
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close(websocket.StatusNormalClosure, "")

		_, b, err := c.Read(r.Context())
		if err != nil {
			return
		}
		var in map[string]any
		_ = json.Unmarshal(b, &in)

		out := map[string]any{
			"type":       "message",
			"room":       "r",
			"from":       "alice",
			"text":       in["text"],
			"sent_at_ms": float64(1),
		}
		ob, _ := json.Marshal(out)
		_ = c.Write(r.Context(), websocket.MessageText, ob)
	}))
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cc, err := DialChat(ctx, ts.URL, "r", "token123")
	if err != nil {
		t.Fatal(err)
	}
	defer cc.Close(websocket.StatusNormalClosure, "")

	if err := cc.SendText(ctx, "hi"); err != nil {
		t.Fatal(err)
	}

	msg, err := cc.ReadMessage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Text != "hi" || msg.Room != "r" || msg.From != "alice" {
		t.Fatalf("unexpected message: %+v", msg)
	}
}

