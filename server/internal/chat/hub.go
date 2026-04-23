package chat

import (
	"context"
	"sync"
)

type Message struct {
	Type     string `json:"type"` // "message", "join", "leave"
	Room     string `json:"room"`
	From     string `json:"from"`
	Text     string `json:"text"`
	SentAtMs int64  `json:"sent_at_ms"`
}

type Subscription struct {
	Room string
	C    chan Message

	hub  *Hub
	once sync.Once
}

func (s *Subscription) Close() {
	s.once.Do(func() {
		s.hub.unsubscribe(s)
		close(s.C)
	})
}

type SaveFunc func(ctx context.Context, msg Message) error

type Hub struct {
	saver SaveFunc
	mu    sync.RWMutex
	rooms map[string]map[*Subscription]struct{}
}

func NewHub(saver SaveFunc) *Hub {
	return &Hub{saver: saver, rooms: make(map[string]map[*Subscription]struct{})}
}

func (h *Hub) Subscribe(room string) *Subscription {
	sub := &Subscription{
		Room: room,
		C:    make(chan Message, 64),
		hub:  h,
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Subscription]struct{})
	}
	h.rooms[room][sub] = struct{}{}
	return sub
}

func (h *Hub) Publish(ctx context.Context, msg Message) {
	if h.saver != nil {
		_ = h.saver(ctx, msg)
	}

	h.mu.RLock()
	subs := h.rooms[msg.Room]
	h.mu.RUnlock()
	if len(subs) == 0 {
		return
	}

	// Best-effort fanout; slow consumers drop messages (buffered channel).
	for sub := range subs {
		select {
		case sub.C <- msg:
		case <-ctx.Done():
			return
		default:
		}
	}
}

func (h *Hub) unsubscribe(sub *Subscription) {
	h.mu.Lock()
	defer h.mu.Unlock()
	subs := h.rooms[sub.Room]
	if subs == nil {
		return
	}
	delete(subs, sub)
	if len(subs) == 0 {
		delete(h.rooms, sub.Room)
	}
}
