package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	_ "github.com/lib/pq"
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
	db  *sql.DB
}

func New(rdb *redis.Client, db *sql.DB) *Store {
	return &Store{rdb: rdb, db: db}
}

func (s *Store) InitSchema(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			username TEXT PRIMARY KEY,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS profiles (
			username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
			name TEXT,
			bio TEXT,
			avatar TEXT,
			character TEXT,
			banner TEXT,
			primary_color TEXT,
			links TEXT DEFAULT '{}',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS statuses (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
			content TEXT NOT NULL,
			mood TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_statuses_username ON statuses(username)`,
		`CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at DESC)`,
	}

	for _, q := range queries {
		if _, err := s.db.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) Ping(ctx context.Context) error {
	if err := s.rdb.Ping(ctx).Err(); err != nil {
		return err
	}
	return s.db.PingContext(ctx)
}

// --- Chat History (Redis) ---

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

// --- Auth (Postgres) ---

func (s *Store) CreateUser(ctx context.Context, username, password, role string) error {
	username = normalizeUsername(username)
	if username == "" || password == "" {
		return errors.New("username and password are required")
	}
	if role == "" {
		role = "user"
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, 
		"INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
		username, string(hashBytes), role)
	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return ErrUserExists
		}
		return err
	}

	// Create initial profile
	_, err = tx.ExecContext(ctx, "INSERT INTO profiles (username) VALUES ($1)", username)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) Authenticate(ctx context.Context, username, password string) (User, error) {
	username = normalizeUsername(username)
	var u User
	err := s.db.QueryRowContext(ctx, "SELECT username, password_hash, role FROM users WHERE username = $1", username).
		Scan(&u.Username, &u.PasswordHash, &u.Role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrInvalidCredentials
		}
		return User{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}

	return u, nil
}

func (s *Store) GetUser(ctx context.Context, username string) (User, error) {
	username = normalizeUsername(username)
	var u User
	err := s.db.QueryRowContext(ctx, "SELECT username, role FROM users WHERE username = $1", username).
		Scan(&u.Username, &u.Role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	return u, nil
}

// --- Profiles (Postgres) ---

func (s *Store) GetProfile(ctx context.Context, username string) (Profile, error) {
	username = normalizeUsername(username)
	var p Profile
	err := s.db.QueryRowContext(ctx, 
		`SELECT username, COALESCE(name, ''), COALESCE(bio, ''), COALESCE(avatar, ''), 
		        COALESCE(character, ''), COALESCE(banner, ''), COALESCE(primary_color, ''), links 
		 FROM profiles WHERE username = $1`, username).
		Scan(&p.Username, &p.Name, &p.Bio, &p.Avatar, &p.Character, &p.Banner, &p.PrimaryColor, &p.Links)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Ensure user exists before returning a default profile
			if _, err := s.GetUser(ctx, username); err != nil {
				return Profile{}, err
			}
			return Profile{Username: username}, nil
		}
		return Profile{}, err
	}
	return p, nil
}

func (s *Store) UpdateProfile(ctx context.Context, p Profile) error {
	p.Username = normalizeUsername(p.Username)
	_, err := s.db.ExecContext(ctx,
		`UPDATE profiles SET name=$1, bio=$2, avatar=$3, character=$4, banner=$5, primary_color=$6, links=$7, updated_at=NOW()
		 WHERE username=$8`,
		p.Name, p.Bio, p.Avatar, p.Character, p.Banner, p.PrimaryColor, p.Links, p.Username)
	return err
}

// --- Statuses (Postgres) ---

func (s *Store) CreateStatus(ctx context.Context, st Status) error {
	st.Username = normalizeUsername(st.Username)
	if st.ID == "" {
		st.ID = time.Now().Format("20060102150405") + "-" + st.Username
	}

	_, err := s.db.ExecContext(ctx,
		"INSERT INTO statuses (id, username, content, mood) VALUES ($1, $2, $3, $4)",
		st.ID, st.Username, st.Content, st.Mood)
	return err
}

func (s *Store) GetStatuses(ctx context.Context, username string, limit int) ([]Status, error) {
	var args []any
	var q string
	if username != "" {
		q = "SELECT id, username, content, COALESCE(mood, ''), created_at FROM statuses WHERE username = $1 ORDER BY created_at DESC LIMIT $2"
		args = []any{normalizeUsername(username), limit}
	} else {
		q = "SELECT id, username, content, COALESCE(mood, ''), created_at FROM statuses ORDER BY created_at DESC LIMIT $1"
		args = []any{limit}
	}

	rows_res, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows_res.Close()

	var statuses []Status
	for rows_res.Next() {
		var st Status
		var createdAt time.Time
		if err := rows_res.Scan(&st.ID, &st.Username, &st.Content, &st.Mood, &createdAt); err != nil {
			return nil, err
		}
		st.CreatedAt = createdAt.Format(time.RFC3339)
		statuses = append(statuses, st)
	}
	return statuses, nil
}

func (s *Store) DeleteStatus(ctx context.Context, username, statusID string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM statuses WHERE id = $1 AND username = $2", statusID, normalizeUsername(username))
	return err
}

func normalizeUsername(u string) string {
	u = strings.TrimSpace(u)
	u = strings.ToLower(u)
	return u
}
