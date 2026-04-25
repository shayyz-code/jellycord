package httpapi

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"runtime/debug"
	"strconv"
	"strings"
	"sync/atomic"
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
	reqID atomic.Uint64
}

func New(cfg config.Config, st *store.Store, j *auth.JWT) *Server {
	return &Server{cfg: cfg, store: st, jwt: j, hub: chat.NewHub(st.SaveMessage)}
}

func (s *Server) Mux() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /livez", s.handleHealth)
	mux.HandleFunc("GET /readyz", s.handleReadyz)

	mux.HandleFunc("POST /auth/login", s.handleLogin)
	mux.HandleFunc("POST /auth/register", s.handleRegister)
	mux.HandleFunc("GET /me", s.requireAuth(s.handleMe))
	mux.HandleFunc("GET /rooms", s.requireAuth(s.handleRooms))
	mux.HandleFunc("GET /profile/{username}", s.handleGetProfile)
	mux.HandleFunc("POST /profile", s.requireAuth(s.handleUpdateProfile))
	mux.HandleFunc("GET /statuses", s.handleGetStatuses)
	mux.HandleFunc("POST /statuses", s.requireAuth(s.handleCreateStatus))
	mux.HandleFunc("DELETE /statuses/{id}", s.requireAuth(s.handleDeleteStatus))
	mux.HandleFunc("POST /admin/users", s.requireAdmin(s.handleAdminCreateUser))
	mux.HandleFunc("GET /ws", s.requireAuth(s.handleWS))
	mux.HandleFunc("GET /history", s.requireAuth(s.handleHistory))

	return mux
}

func (s *Server) Handler() http.Handler {
	return s.withMiddleware(s.Mux())
}

func (s *Server) withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// WebSocket requests should not be handled by CORS middleware if they are GET /ws
		// because the websocket.Accept handles origin checks.
		// However, we still want headers for normal REST requests.
		isWS := strings.EqualFold(r.Header.Get("Upgrade"), "websocket")
		if !isWS {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}

		id := s.nextRequestID()
		start := time.Now()
		rw := newStatusWriter(w)
		rw.Header().Set("X-Request-Id", id)

		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("request panic",
					"request_id", id,
					"method", r.Method,
					"path", r.URL.Path,
					"error", rec,
					"stack", string(debug.Stack()),
				)
				writeJSON(rw, http.StatusInternalServerError, map[string]any{"error": "internal server error"})
			}
			slog.Info("request completed",
				"request_id", id,
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.Status(),
				"duration_ms", time.Since(start).Milliseconds(),
				"ip", clientIP(r),
			)
		}()

		next.ServeHTTP(rw, r)
	})
}

func (s *Server) nextRequestID() string {
	n := s.reqID.Add(1)
	return strconv.FormatUint(n, 10)
}

func clientIP(r *http.Request) string {
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xrip := strings.TrimSpace(r.Header.Get("X-Real-Ip")); xrip != "" {
		return xrip
	}
	return r.RemoteAddr
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func newStatusWriter(w http.ResponseWriter) *statusWriter {
	return &statusWriter{ResponseWriter: w, status: http.StatusOK}
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Status() int {
	return w.status
}

func (w *statusWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := w.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, errors.New("hijacker not supported")
}

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleRooms(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	rooms, err := s.store.ListRooms(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to list rooms"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rooms": rooms})
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	room := strings.TrimSpace(r.URL.Query().Get("room"))
	if room == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "room is required"})
		return
	}
	limitStr := strings.TrimSpace(r.URL.Query().Get("limit"))
	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	msgs, err := s.store.GetMessageHistory(ctx, room, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to get history"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"messages": msgs})
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"status": "not_ready", "error": "redis unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready"})
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
		CompressionMode:    websocket.CompressionDisabled,
		InsecureSkipVerify: true, // For development, let it work with any origin
	})
	if err != nil {
		slog.Error("websocket accept failed", "error", err)
		return
	}
	defer c.Close(websocket.StatusNormalClosure, "")

	sub := s.hub.Subscribe(room)
	defer sub.Close()

	// Notify join
	s.hub.Publish(r.Context(), chat.Message{
		Type:     "join",
		Room:     room,
		From:     claims.Username,
		SentAtMs: time.Now().UnixMilli(),
	})

	// Notify leave on disconnect
	defer s.hub.Publish(context.Background(), chat.Message{
		Type:     "leave",
		Room:     room,
		From:     claims.Username,
		SentAtMs: time.Now().UnixMilli(),
	})

	// Keep-alive heartbeat
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				err := c.Ping(r.Context())
				if err != nil {
					return
				}
			case <-r.Context().Done():
				return
			}
		}
	}()

	// Writer: broadcast messages -> websocket
	writeDone := make(chan struct{})
	go func() {
		defer close(writeDone)
		for m := range sub.C {
			_ = wsWriteJSON(r.Context(), c, m)
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
			Type:     "message",
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

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	if err := s.store.CreateUser(r.Context(), req.Username, req.Password, "user"); err != nil {
		if errors.Is(err, store.ErrUserExists) {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "user already exists"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	u, _ := s.store.GetUser(r.Context(), req.Username)
	tok, err := s.jwt.Mint(u.Username, u.Role, 24*time.Hour)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to mint token"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token": tok,
		"user":  map[string]any{"username": u.Username, "role": u.Role},
	})
}

func (s *Server) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	p, err := s.store.GetProfile(r.Context(), username)
	if err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "profile not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to get profile"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromCtx(r.Context())
	var p store.Profile
	if err := readJSON(r, &p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	p.Username = claims.Username // Ensure they only update their own profile
	if err := s.store.UpdateProfile(r.Context(), p); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to update profile"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleGetStatuses(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	statuses, err := s.store.GetStatuses(r.Context(), username, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to get statuses"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"statuses": statuses})
}

func (s *Server) handleCreateStatus(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromCtx(r.Context())
	var req struct {
		Content string `json:"content"`
		Mood    string `json:"mood"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	st := store.Status{
		Username: claims.Username,
		Content:  req.Content,
		Mood:     req.Mood,
	}
	if err := s.store.CreateStatus(r.Context(), st); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to create status"})
		return
	}
	writeJSON(w, http.StatusCreated, st)
}

func (s *Server) handleDeleteStatus(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromCtx(r.Context())
	statusID := r.PathValue("id")
	if err := s.store.DeleteStatus(r.Context(), claims.Username, statusID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to delete status"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
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

func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-Admin-Key")
		if key != "" && key == s.cfg.AdminKey {
			next(w, r)
			return
		}

		tok, ok := bearerToken(r.Header.Get("Authorization"))
		if ok {
			claims, err := s.jwt.Parse(tok)
			if err == nil && claims.Role == "admin" {
				next(w, r)
				return
			}
		}

		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "admin access required"})
		return
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
