package config

import (
	"errors"
	"os"
)

type Config struct {
	Addr        string
	RedisURL    string
	PostgresURL string
	JWTSecret   string
	AdminKey    string
	Env         string
}

func Load() Config {
	return Config{
		Addr:        envOr("JELLYCORD_ADDR", ":8080"),
		RedisURL:    envOr("JELLYCORD_REDIS_URL", "redis://localhost:6379/0"),
		PostgresURL: envOr("JELLYCORD_POSTGRES_URL", "postgres://postgres:postgres@localhost:5432/jellycord?sslmode=disable"),
		JWTSecret:   envOr("JELLYCORD_JWT_SECRET", "dev-insecure-secret-change-me"),
		AdminKey:    envOr("JELLYCORD_ADMIN_KEY", "dev-admin-key-change-me"),
		Env:         envOr("JELLYCORD_ENV", "development"),
	}
}

func (c Config) Validate() error {
	if c.Addr == "" {
		return errors.New("JELLYCORD_ADDR is required")
	}
	if c.RedisURL == "" {
		return errors.New("JELLYCORD_REDIS_URL is required")
	}
	if c.PostgresURL == "" {
		return errors.New("JELLYCORD_POSTGRES_URL is required")
	}
	if c.JWTSecret == "" {
		return errors.New("JELLYCORD_JWT_SECRET is required")
	}
	if c.AdminKey == "" {
		return errors.New("JELLYCORD_ADMIN_KEY is required")
	}

	if c.IsProduction() {
		if c.JWTSecret == "dev-insecure-secret-change-me" {
			return errors.New("refusing to start in production with default JELLYCORD_JWT_SECRET")
		}
		if c.AdminKey == "dev-admin-key-change-me" {
			return errors.New("refusing to start in production with default JELLYCORD_ADMIN_KEY")
		}
	}
	return nil
}

func (c Config) IsProduction() bool {
	return c.Env == "production" || c.Env == "prod"
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
