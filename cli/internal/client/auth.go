package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

var ErrLoginFailed = errors.New("login failed")

type LoginResponse struct {
	Token string `json:"token"`
}

func Login(ctx context.Context, serverBaseURL, username, password string) (LoginResponse, error) {
	serverBaseURL = strings.TrimRight(serverBaseURL, "/")
	body, err := json.Marshal(map[string]string{"username": username, "password": password})
	if err != nil {
		return LoginResponse{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, serverBaseURL+"/auth/login", bytes.NewReader(body))
	if err != nil {
		return LoginResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LoginResponse{}, err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return LoginResponse{}, err
	}

	var okResp LoginResponse
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if err := json.Unmarshal(b, &okResp); err != nil {
			return LoginResponse{}, err
		}
		if strings.TrimSpace(okResp.Token) == "" {
			return LoginResponse{}, fmt.Errorf("%w: empty token", ErrLoginFailed)
		}
		return okResp, nil
	}

	// Best-effort parse the server error shape: {"error":"..."}
	var errResp struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(b, &errResp); err == nil && errResp.Error != "" {
		return LoginResponse{}, fmt.Errorf("%w: %s", ErrLoginFailed, errResp.Error)
	}
	return LoginResponse{}, fmt.Errorf("%w: http %d", ErrLoginFailed, resp.StatusCode)
}

