package config

import "os"

type Config struct {
	Addr     string
	RedisURL string
}

func Load() Config {
	return Config{
		Addr:     envOr("JELLYCORD_ADDR", ":8080"),
		RedisURL: envOr("JELLYCORD_REDIS_URL", "redis://localhost:6379/0"),
	}
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

