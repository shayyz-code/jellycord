.PHONY: help go-fmt go-tidy go-test go-test-watch go-build server-run cli-run docker-build docker-up docker-down docker-logs dev-up dev-down

## Configurable (override like: make SERVER_ADDR=:9090)
SERVER_ADDR ?= :8080
SERVER_URL  ?= http://127.0.0.1:8080

## Go entrypoints
SERVER_MAIN := ./server/cmd/jellycord-server
CLI_MAIN    := ./cli/cmd/jellycord

help:
	@printf "\nJellyCord Make targets:\n\n"
	@printf "  make go-fmt         - gofmt all Go code\n"
	@printf "  make go-tidy        - go mod tidy\n"
	@printf "  make go-test        - run all Go tests (TDD loop)\n"
	@printf "  make go-build       - build ./jellycord and ./jellycord-server\n"
	@printf "\n"
	@printf "  make server-run     - run server locally (uses Redis at localhost)\n"
	@printf "  make cli-run        - run CLI locally (prints help/banner)\n"
	@printf "  make dev-up         - start Redis for local dev (Docker)\n"
	@printf "  make dev-down       - stop Redis for local dev (Docker)\n"
	@printf "\n"
	@printf "  make docker-build   - build server docker image\n"
	@printf "  make docker-up      - start server+redis via docker compose\n"
	@printf "  make docker-logs    - tail compose logs\n"
	@printf "  make docker-down    - stop compose stack\n"
	@printf "\n"
	@printf "Notes:\n"
	@printf "  - SERVER_ADDR defaults to %s\n" "$(SERVER_ADDR)"
	@printf "  - SERVER_URL  defaults to %s\n\n" "$(SERVER_URL)"

go-fmt:
	@echo "gofmt..."
	@gofmt -w $$(go list -f '{{.Dir}}' ./... | tr '\n' ' ')

go-tidy:
	@echo "go mod tidy..."
	@go mod tidy

go-test:
	@echo "go test ./..."
	@go test ./...

go-build: go-tidy
	@echo "building binaries..."
	@go build -o jellycord-server $(SERVER_MAIN)
	@go build -o jellycord $(CLI_MAIN)
	@echo "built: ./jellycord-server ./jellycord"

server-run:
	@$(MAKE) -s dev-up
	@echo "running server on $(SERVER_ADDR)..."
	@JELLYCORD_ADDR="$(SERVER_ADDR)" \
	 JELLYCORD_REDIS_URL="redis://127.0.0.1:6379/0" \
	 JELLYCORD_JWT_SECRET="dev-insecure-secret-change-me" \
	 JELLYCORD_ADMIN_KEY="dev-admin-key-change-me" \
	 go run $(SERVER_MAIN)

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
	@printf "Redis (dev): 127.0.0.1:6379\n"

dev-down:
	@docker compose rm -sf redis >/dev/null 2>&1 || true

