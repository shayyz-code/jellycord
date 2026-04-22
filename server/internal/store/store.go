package store

import (
	"context"
	"crypto/subtle"
	"errors"
	"strings"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrUserExists = errors.New("user already exists")
var ErrUserNotFound = errors.New("user not found")

type User struct {
	Username     string `json:"username"`
	Role         string `json:"role"` // "admin" or "user"
	PasswordHash string `json:"-"`
}

type Store struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Store {
	return &Store{rdb: rdb}
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

func normalizeUsername(u string) string {
	u = strings.TrimSpace(u)
	u = strings.ToLower(u)
	return u
}

