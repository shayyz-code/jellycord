.PHONY: help go-fmt go-tidy go-test go-test-watch go-build server-run cli-run docker-build docker-up docker-down docker-logs dev-up dev-down lint test-unit test-integration coverage

## Colors
BLUE   := \033[34m
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

## Configurable (override like: make SERVER_ADDR=:9090)
SERVER_ADDR ?= :8080
SERVER_URL  ?= http://127.0.0.1:8080

## Go entrypoints
SERVER_MAIN := ./server/cmd/jellycord-server
CLI_MAIN    := ./cli/cmd/jellycord

help:
	@printf "\n$(BLUE)JellyCord Make targets:$(RESET)\n\n"
	@printf "  $(CYAN)make go-fmt$(RESET)         - gofmt all Go code\n"
	@printf "  $(CYAN)make go-tidy$(RESET)        - go mod tidy\n"
	@printf "  $(CYAN)make go-test$(RESET)        - run all Go tests\n"
	@printf "  $(CYAN)make test-unit$(RESET)      - run unit tests\n"
	@printf "  $(CYAN)make test-integration$(RESET) - run integration tests (requires Redis)\n"
	@printf "  $(CYAN)make coverage$(RESET)       - run tests and show coverage\n"
	@printf "  $(CYAN)make lint$(RESET)           - run golangci-lint\n"
	@printf "  $(CYAN)make go-build$(RESET)       - build ./jellycord and ./jellycord-server\n"
	@printf "\n"
	@printf "  $(CYAN)make server-run$(RESET)     - run server locally (uses Redis at localhost)\n"
	@printf "  $(CYAN)make cli-run$(RESET)        - run CLI locally\n"
	@printf "  $(CYAN)make dev-up$(RESET)         - start Redis for local dev (Docker)\n"
	@printf "  $(CYAN)make dev-down$(RESET)       - stop Redis for local dev (Docker)\n"
	@printf "\n"
	@printf "  $(CYAN)make docker-build$(RESET)   - build server docker image\n"
	@printf "  $(CYAN)make docker-up$(RESET)      - start server+redis via docker compose\n"
	@printf "  $(CYAN)make docker-logs$(RESET)    - tail compose logs\n"
	@printf "  $(CYAN)make docker-down$(RESET)    - stop compose stack\n"
	@printf "\n"
	@printf "Notes:\n"
	@printf "  - SERVER_ADDR defaults to %s\n" "$(SERVER_ADDR)"
	@printf "  - SERVER_URL  defaults to %s\n\n" "$(SERVER_URL)"

go-fmt:
	@echo "$(BLUE)gofmt...$(RESET)"
	@gofmt -w $$(go list -f '{{.Dir}}' ./... | tr '\n' ' ')

go-tidy:
	@echo "$(BLUE)go mod tidy...$(RESET)"
	@go mod tidy

go-test:
	@echo "$(BLUE)running all tests...$(RESET)"
	@go test -v ./...

test-unit:
	@echo "$(BLUE)running unit tests...$(RESET)"
	@go test -v -short ./...

test-integration: dev-up
	@echo "$(BLUE)running integration tests...$(RESET)"
	@JELLYCORD_REDIS_URL="redis://127.0.0.1:6379/0" go test -v -run Integration ./...

coverage:
	@echo "$(BLUE)running coverage...$(RESET)"
	@go test -coverprofile=coverage.out ./...
	@go tool cover -func=coverage.out

lint:
	@echo "$(BLUE)running lint...$(RESET)"
	@if command -v golangci-lint >/dev/null; then \
		golangci-lint run; \
	else \
		echo "$(YELLOW)golangci-lint not found, falling back to go vet$(RESET)"; \
		go vet ./...; \
	fi

go-build: go-tidy
	@echo "$(BLUE)building binaries...$(RESET)"
	@go build -o jellycord-server $(SERVER_MAIN)
	@go build -o jellycord $(CLI_MAIN)
	@echo "$(GREEN)built: ./jellycord-server ./jellycord$(RESET)"

server-run: dev-up
	@echo "$(BLUE)running server on $(SERVER_ADDR)...$(RESET)"
	@go run $(SERVER_MAIN)

cli-run:
	@go run $(CLI_MAIN) help

docker-build:
	@docker compose build server

docker-up:
	@docker compose up -d --build
	@printf "\nServer: %s\nRedis:  127.0.0.1:6379\n\n" "$(SERVER_URL)"
	@printf "Health:\n"
	@curl -fsS "$(SERVER_URL)/health" || true
	@printf "\n"

docker-logs:
	@docker compose logs --tail=200 -f

docker-down:
	@docker compose down

dev-up:
	@docker compose up -d redis
	@printf "$(GREEN)Redis (dev): 127.0.0.1:6379$(RESET)\n"

dev-down:
	@docker compose rm -sf redis >/dev/null 2>&1 || true
	@echo "$(YELLOW)Redis (dev) stopped.$(RESET)"

