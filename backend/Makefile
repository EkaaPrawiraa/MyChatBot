.PHONY: run build test migrate-up migrate-down tidy

APP_NAME := axis-api
DB_DSN   ?= postgres://axis:axis_secret@localhost:5432/axis_assistant?sslmode=disable

run:
	go run ./cmd/api

build:
	go build -o bin/$(APP_NAME) ./cmd/api

test:
	go test ./... -v -count=1

tidy:
	go mod tidy

migrate-up:
	@echo "Running migrations..."
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000001_init_schema.up.sql
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000002_ai_provider.up.sql
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000003_integrations.up.sql

migrate-down:
	@echo "Rolling back migrations..."
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000003_integrations.down.sql
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000002_ai_provider.down.sql
	docker exec -i $$(docker compose ps -q postgres) psql -U axis -d axis_assistant < migrations/000001_init_schema.down.sql

lint:
	golangci-lint run ./...
