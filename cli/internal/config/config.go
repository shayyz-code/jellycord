package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Config struct {
	Token     string `json:"token"`
	ServerURL string `json:"server_url"`
	Username  string `json:"username"`
	LastRoom  string `json:"last_room"`
}

func Load() (Config, error) {
	p, err := path()
	if err != nil {
		return Config{}, err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Config{}, nil
		}
		return Config{}, err
	}
	var c Config
	if err := json.Unmarshal(b, &c); err != nil {
		return Config{}, err
	}
	return c, nil
}

func Save(c Config) error {
	p, err := path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, b, 0o600)
}

func path() (string, error) {
	// Priority 1: JELLYCORD_CONFIG environment variable
	if p := os.Getenv("JELLYCORD_CONFIG"); p != "" {
		return p, nil
	}

	// Priority 2: ~/.jellycord.json (User Home)
	home, err := os.UserHomeDir()
	if err == nil {
		p := filepath.Join(home, ".jellycord.json")
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	// Priority 3: OS-specific config dir (Standard)
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "jellycord", "config.json"), nil
}
