package client

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"path"
	"strings"

	"nhooyr.io/websocket"
)

type Message struct {
	Type     string `json:"type"`
	Room     string `json:"room"`
	From     string `json:"from"`
	Text     string `json:"text"`
	SentAtMs int64  `json:"sent_at_ms"`
}

type ChatConn struct {
	conn *websocket.Conn
}

func (c *ChatConn) Close(status websocket.StatusCode, reason string) error {
	return c.conn.Close(status, reason)
}

func (c *ChatConn) Ping(ctx context.Context) error {
	return c.conn.Ping(ctx)
}

func DialChat(ctx context.Context, serverBaseURL, room, token string) (*ChatConn, error) {
	if strings.TrimSpace(room) == "" {
		return nil, errors.New("room is required")
	}
	if strings.TrimSpace(token) == "" {
		return nil, errors.New("token is required (run jellycord login)")
	}

	u, err := url.Parse(serverBaseURL)
	if err != nil {
		return nil, err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, errors.New("server must be http(s) URL")
	}
	if u.Path == "" {
		u.Path = "/"
	}

	wsScheme := "ws"
	if u.Scheme == "https" {
		wsScheme = "wss"
	}
	u.Scheme = wsScheme
	u.Path = path.Join(u.Path, "/ws")
	q := u.Query()
	q.Set("room", room)
	u.RawQuery = q.Encode()

	opts := &websocket.DialOptions{
		HTTPHeader: http.Header{
			"Authorization": []string{"Bearer " + token},
		},
	}
	conn, _, err := websocket.Dial(ctx, u.String(), opts)
	if err != nil {
		return nil, err
	}
	return &ChatConn{conn: conn}, nil
}

func (c *ChatConn) SendText(ctx context.Context, text string) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	b, err := json.Marshal(map[string]any{"type": "message", "text": text})
	if err != nil {
		return err
	}
	return c.conn.Write(ctx, websocket.MessageText, b)
}

func (c *ChatConn) ReadMessage(ctx context.Context) (Message, error) {
	_, b, err := c.conn.Read(ctx)
	if err != nil {
		return Message{}, err
	}
	var m Message
	if err := json.Unmarshal(b, &m); err != nil {
		return Message{}, err
	}
	return m, nil
}

func ListRooms(ctx context.Context, serverBaseURL, token string) ([]string, error) {
	if strings.TrimSpace(token) == "" {
		return nil, errors.New("token is required")
	}

	u, err := url.Parse(serverBaseURL)
	if err != nil {
		return nil, err
	}
	u.Path = path.Join(u.Path, "/rooms")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to list rooms: " + resp.Status)
	}
	var out struct {
		Rooms []string `json:"rooms"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out.Rooms, nil
}

func FetchHistory(ctx context.Context, serverBaseURL, room, token string) ([]Message, error) {
	if strings.TrimSpace(room) == "" {
		return nil, errors.New("room is required")
	}
	if strings.TrimSpace(token) == "" {
		return nil, errors.New("token is required")
	}

	u, err := url.Parse(serverBaseURL)
	if err != nil {
		return nil, err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, errors.New("server must be http(s) URL")
	}
	if u.Path == "" {
		u.Path = "/"
	}
	u.Path = path.Join(u.Path, "/history")
	q := u.Query()
	q.Set("room", room)
	q.Set("limit", "50")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to fetch history: " + resp.Status)
	}
	var out struct {
		Messages []Message `json:"messages"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out.Messages, nil
}

