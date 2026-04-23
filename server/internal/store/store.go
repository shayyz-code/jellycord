package store

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/shayyz-code/jellycord/server/internal/chat"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrUserExists = errors.New("user already exists")
var ErrUserNotFound = errors.New("user not found")

type User struct {
	Username     string `json:"username"`
	Role         string `json:"role"` // "admin" or "user"
	PasswordHash string `json:"-"`
}

type Profile struct {
	Username     string `json:"username"`
	Name         string `json:"name"`
	Bio          string `json:"bio"`
	Avatar       string `json:"avatar"`
	Character    string `json:"character"`
	Banner       string `json:"banner"`
	PrimaryColor string `json:"primary_color"`
	Links        string `json:"links"` // JSON string
}

type Status struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Content   string `json:"content"`
	Mood      string `json:"mood"`
	CreatedAt string `json:"created_at"`
}

type Store struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Store {
	return &Store{rdb: rdb}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.rdb.Ping(ctx).Err()
}

func (s *Store) SaveMessage(ctx context.Context, msg chat.Message) error {
	if msg.Type != "message" {
		return nil
	}
	key := historyKey(msg.Room)
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	pipe := s.rdb.Pipeline()
	pipe.LPush(ctx, key, data)
	pipe.LTrim(ctx, key, 0, 99)
	_, err = pipe.Exec(ctx)
	return err
}

func (s *Store) GetMessageHistory(ctx context.Context, room string, limit int) ([]chat.Message, error) {
	key := historyKey(room)
	data, err := s.rdb.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}
	msgs := make([]chat.Message, 0, len(data))
	for _, raw := range data {
		var m chat.Message
		if err := json.Unmarshal([]byte(raw), &m); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (s *Store) ListRooms(ctx context.Context) ([]string, error) {
	iter := s.rdb.Scan(ctx, 0, "jellycord:history:*", 0).Iterator()
	rooms := []string{}
	prefix := "jellycord:history:"
	for iter.Next(ctx) {
		key := iter.Val()
		room := strings.TrimPrefix(key, prefix)
		rooms = append(rooms, room)
	}
	if err := iter.Err(); err != nil {
		return nil, err
	}
	return rooms, nil
}

func historyKey(room string) string {
	return "jellycord:history:" + room
}

func (s *Store) CreateUser(ctx context.Context, username, password, role string) error {
	username = normalizeUsername(username)
	if username == "" || password == "" {
		return errors.New("username and password are required")
	}
	if role == "" {
		role = "user"
	}
	if role != "user" && role != "admin" {
		return errors.New("invalid role")
	}

	key := userKey(username)
	exists, err := s.rdb.Exists(ctx, key).Result()
	if err != nil {
		return err
	}
	if exists != 0 {
		return ErrUserExists
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Store as a hash so we can extend later.
	_, err = s.rdb.HSet(ctx, key,
		"username", username,
		"role", role,
		"password_hash", string(hashBytes),
	).Result()
	return err
}

func (s *Store) Authenticate(ctx context.Context, username, password string) (User, error) {
	username = normalizeUsername(username)
	key := userKey(username)

	m, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		return User{}, err
	}
	if len(m) == 0 {
		return User{}, ErrInvalidCredentials
	}

	storedUser := m["username"]
	storedRole := m["role"]
	storedHash := m["password_hash"]
	if storedUser == "" || storedHash == "" {
		return User{}, ErrInvalidCredentials
	}

	// Constant-time compare for username normalization mismatch edge cases.
	if subtle.ConstantTimeCompare([]byte(storedUser), []byte(username)) != 1 {
		return User{}, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}

	if storedRole == "" {
		storedRole = "user"
	}

	return User{
		Username: username,
		Role:     storedRole,
	}, nil
}

func (s *Store) GetUser(ctx context.Context, username string) (User, error) {
	username = normalizeUsername(username)
	key := userKey(username)

	m, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		return User{}, err
	}
	if len(m) == 0 {
		return User{}, ErrUserNotFound
	}
	role := m["role"]
	if role == "" {
		role = "user"
	}
	return User{Username: username, Role: role}, nil
}

func userKey(username string) string {
	return "jellycord:user:" + username
}

func profileKey(username string) string {
	return "jellycord:profile:" + username
}

func statusKey(username string) string {
	return "jellycord:statuses:" + username
}

func (s *Store) GetProfile(ctx context.Context, username string) (Profile, error) {
	username = normalizeUsername(username)
	key := profileKey(username)
	m, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		return Profile{}, err
	}
	if len(m) == 0 {
		return Profile{Username: username}, nil
	}
	return Profile{
		Username:     username,
		Name:         m["name"],
		Bio:          m["bio"],
		Avatar:       m["avatar"],
		Character:    m["character"],
		Banner:       m["banner"],
		PrimaryColor: m["primary_color"],
		Links:        m["links"],
	}, nil
}

func (s *Store) UpdateProfile(ctx context.Context, p Profile) error {
	p.Username = normalizeUsername(p.Username)
	key := profileKey(p.Username)
	_, err := s.rdb.HSet(ctx, key,
		"name", p.Name,
		"bio", p.Bio,
		"avatar", p.Avatar,
		"character", p.Character,
		"banner", p.Banner,
		"primary_color", p.PrimaryColor,
		"links", p.Links,
	).Result()
	return err
}

func (s *Store) CreateStatus(ctx context.Context, st Status) error {
	st.Username = normalizeUsername(st.Username)
	if st.ID == "" {
		st.ID = time.Now().Format("20060102150405") + "-" + st.Username
	}
	if st.CreatedAt == "" {
		st.CreatedAt = time.Now().Format(time.RFC3339)
	}

	data, err := json.Marshal(st)
	if err != nil {
		return err
	}

	key := statusKey(st.Username)
	globalKey := "jellycord:global:statuses"

	pipe := s.rdb.Pipeline()
	pipe.LPush(ctx, key, data)
	pipe.LTrim(ctx, key, 0, 99)
	pipe.LPush(ctx, globalKey, data)
	pipe.LTrim(ctx, globalKey, 0, 99)
	_, err = pipe.Exec(ctx)
	return err
}

func (s *Store) GetStatuses(ctx context.Context, username string, limit int) ([]Status, error) {
	var key string
	if username != "" {
		key = statusKey(normalizeUsername(username))
	} else {
		key = "jellycord:global:statuses"
	}

	data, err := s.rdb.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	statuses := make([]Status, 0, len(data))
	for _, raw := range data {
		var st Status
		if err := json.Unmarshal([]byte(raw), &st); err != nil {
			continue
		}
		statuses = append(statuses, st)
	}
	return statuses, nil
}

func (s *Store) DeleteStatus(ctx context.Context, username, statusID string) error {
	key := statusKey(normalizeUsername(username))
	data, err := s.rdb.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return err
	}

	for _, raw := range data {
		var st Status
		_ = json.Unmarshal([]byte(raw), &st)
		if st.ID == statusID {
			s.rdb.LRem(ctx, key, 1, raw)
			break
		}
	}
	return nil
}

func normalizeUsername(u string) string {
	u = strings.TrimSpace(u)
	u = strings.ToLower(u)
	return u
}
