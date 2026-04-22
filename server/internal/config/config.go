package config

import "os"

type Config struct {
	Addr     string
	RedisURL string
	JWTSecret string
	AdminKey  string
}

func Load() Config {
	return Config{
		Addr:     envOr("JELLYCORD_ADDR", ":8080"),
		RedisURL: envOr("JELLYCORD_REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret: envOr("JELLYCORD_JWT_SECRET", "dev-insecure-secret-change-me"),
		AdminKey:  envOr("JELLYCORD_ADMIN_KEY", "dev-admin-key-change-me"),
	}
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

