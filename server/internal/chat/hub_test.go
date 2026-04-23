package chat

import (
	"context"
	"testing"
	"time"
)

func TestHub_BroadcastToRoomSubscribers(t *testing.T) {
	h := NewHub(nil)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	sub1 := h.Subscribe("room-a")
	sub2 := h.Subscribe("room-a")
	subOther := h.Subscribe("room-b")
	defer sub1.Close()
	defer sub2.Close()
	defer subOther.Close()

	msg := Message{
		Room:     "room-a",
		From:     "alice",
		Text:     "hello",
		SentAtMs: 123,
	}
	h.Publish(ctx, msg)

	got1 := waitMsg(t, ctx, sub1.C)
	got2 := waitMsg(t, ctx, sub2.C)
	if got1.Text != "hello" || got2.Text != "hello" {
		t.Fatalf("expected both subs to receive message, got1=%+v got2=%+v", got1, got2)
	}

	select {
	case m := <-subOther.C:
		t.Fatalf("did not expect other room to receive, got=%+v", m)
	default:
	}
}

func waitMsg(t *testing.T, ctx context.Context, ch <-chan Message) Message {
	t.Helper()
	select {
	case m := <-ch:
		return m
	case <-ctx.Done():
		t.Fatalf("timed out waiting for message: %v", ctx.Err())
		return Message{}
	}
}

