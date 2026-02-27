.PHONY: build run test vet lint check migrate-up migrate-down migrate-create docker-up docker-down clean

# --- Variables ---
APP_NAME := progressivity
BUILD_DIR := bin
MIGRATIONS_DIR := migrations
DB_DSN ?= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)

# Load .env if exists
ifneq (,$(wildcard ./.env))
	include .env
	export
endif

# --- Go Backend ---

build:
	go vet ./...
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./... -v -count=1

vet:
	go vet ./...

lint:
	golangci-lint run ./...

check: vet lint test

clean:
	rm -rf $(BUILD_DIR)

# --- Database ---

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	docker compose down -v
	docker compose up -d

migrate-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_DSN)" up

migrate-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_DSN)" down 1

migrate-drop:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_DSN)" drop -f

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq -digits 6 $$name

# --- Frontend ---

web-install:
	cd web && npm install

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

web-lint:
	cd web && npm run lint

# --- All ---

dev: docker-up run

setup: docker-up migrate-up web-install
