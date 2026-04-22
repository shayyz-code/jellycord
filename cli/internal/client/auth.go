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
	User  struct {
		Username string `json:"username"`
		Role     string `json:"role"`
	} `json:"user"`
}

type MeResponse struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

type CreateUserResponse struct {
	User struct {
		Username string `json:"username"`
		Role     string `json:"role"`
	} `json:"user"`
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

func Me(ctx context.Context, serverBaseURL, token string) (MeResponse, error) {
	serverBaseURL = strings.TrimRight(serverBaseURL, "/")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, serverBaseURL+"/me", nil)
	if err != nil {
		return MeResponse{}, err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(token))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return MeResponse{}, err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return MeResponse{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return MeResponse{}, fmt.Errorf("me failed: http %d", resp.StatusCode)
	}
	var out MeResponse
	if err := json.Unmarshal(b, &out); err != nil {
		return MeResponse{}, err
	}
	return out, nil
}

func AdminCreateUser(ctx context.Context, serverBaseURL, adminKey, adminToken, username, password, role string) (CreateUserResponse, error) {
	serverBaseURL = strings.TrimRight(serverBaseURL, "/")
	body, err := json.Marshal(map[string]string{
		"username": username,
		"password": password,
		"role":     role,
	})
	if err != nil {
		return CreateUserResponse{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, serverBaseURL+"/admin/users", bytes.NewReader(body))
	if err != nil {
		return CreateUserResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if k := strings.TrimSpace(adminKey); k != "" {
		req.Header.Set("X-Admin-Key", k)
	}
	if t := strings.TrimSpace(adminToken); t != "" {
		req.Header.Set("Authorization", "Bearer "+t)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return CreateUserResponse{}, err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return CreateUserResponse{}, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResp struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(b, &errResp); err == nil && errResp.Error != "" {
			return CreateUserResponse{}, fmt.Errorf("create user failed: %s", errResp.Error)
		}
		return CreateUserResponse{}, fmt.Errorf("create user failed: http %d", resp.StatusCode)
	}

	var out CreateUserResponse
	if err := json.Unmarshal(b, &out); err != nil {
		return CreateUserResponse{}, err
	}
	return out, nil
}
