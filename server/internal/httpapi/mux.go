package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"nhooyr.io/websocket"

	"github.com/shayyz-code/jellycord/server/internal/auth"
	"github.com/shayyz-code/jellycord/server/internal/chat"
	"github.com/shayyz-code/jellycord/server/internal/config"
	"github.com/shayyz-code/jellycord/server/internal/store"
)

type ctxKey string

const (
	ctxClaimsKey ctxKey = "jellycord.jwt.claims"
)

type Server struct {
	cfg   config.Config
	store *store.Store
	jwt   *auth.JWT
	hub   *chat.Hub
}

func New(cfg config.Config, st *store.Store, j *auth.JWT) *Server {
	return &Server{cfg: cfg, store: st, jwt: j, hub: chat.NewHub()}
}

func (s *Server) Mux() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})

	mux.HandleFunc("POST /auth/login", s.handleLogin)
	mux.HandleFunc("GET /me", s.requireAuth(s.handleMe))
	mux.HandleFunc("POST /admin/users", s.requireAdminKey(s.handleAdminCreateUser))
	mux.HandleFunc("GET /ws", s.requireAuth(s.handleWS))

	return mux
}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	room := strings.TrimSpace(r.URL.Query().Get("room"))
	if room == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "room is required"})
		return
	}

	claims, ok := claimsFromCtx(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		CompressionMode: websocket.CompressionDisabled,
	})
	if err != nil {
		return
	}
	defer c.Close(websocket.StatusNormalClosure, "")

	sub := s.hub.Subscribe(room)
	defer sub.Close()

	// Writer: broadcast messages -> websocket
	writeDone := make(chan struct{})
	go func() {
		defer close(writeDone)
		for m := range sub.C {
			_ = wsWriteJSON(r.Context(), c, map[string]any{
				"type":       "message",
				"room":       m.Room,
				"from":       m.From,
				"text":       m.Text,
				"sent_at_ms": m.SentAtMs,
			})
		}
	}()

	// Reader: websocket -> publish
	for {
		var in struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}
		if err := wsReadJSON(r.Context(), c, &in); err != nil {
			break
		}
		if in.Type != "message" {
			continue
		}
		text := strings.TrimSpace(in.Text)
		if text == "" {
			continue
		}
		s.hub.Publish(r.Context(), chat.Message{
			Room:     room,
			From:     claims.Username,
			Text:     text,
			SentAtMs: time.Now().UnixMilli(),
		})
	}

	<-writeDone
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	u, err := s.store.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid credentials"})
		return
	}

	tok, err := s.jwt.Mint(u.Username, u.Role, 24*time.Hour)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to mint token"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token": tok,
		"user":  map[string]any{"username": u.Username, "role": u.Role},
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromCtx(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"username": claims.Username,
		"role":     claims.Role,
	})
}

func (s *Server) handleAdminCreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	if err := s.store.CreateUser(r.Context(), req.Username, req.Password, req.Role); err != nil {
		if errors.Is(err, store.ErrUserExists) {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "user already exists"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	u, _ := s.store.GetUser(r.Context(), req.Username)
	writeJSON(w, http.StatusCreated, map[string]any{"user": map[string]any{"username": u.Username, "role": u.Role}})
}

func (s *Server) requireAdminKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-Admin-Key")
		if key == "" || key != s.cfg.AdminKey {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "admin key required"})
			return
		}
		next(w, r)
	}
}

func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tok, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing bearer token"})
			return
		}
		claims, err := s.jwt.Parse(tok)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid token"})
			return
		}
		ctx := context.WithValue(r.Context(), ctxClaimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func bearerToken(h string) (string, bool) {
	h = strings.TrimSpace(h)
	const p = "Bearer "
	if !strings.HasPrefix(h, p) {
		return "", false
	}
	return strings.TrimSpace(strings.TrimPrefix(h, p)), true
}

func claimsFromCtx(ctx context.Context) (auth.Claims, bool) {
	v := ctx.Value(ctxClaimsKey)
	claims, ok := v.(auth.Claims)
	return claims, ok
}

func readJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func wsReadJSON(ctx context.Context, c *websocket.Conn, dst any) error {
	_, b, err := c.Read(ctx)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dst)
}

func wsWriteJSON(ctx context.Context, c *websocket.Conn, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.Write(ctx, websocket.MessageText, b)
}

