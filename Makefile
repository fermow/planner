# ─────────────────────────────────────────────────────────────
#  Celestial Desk — Makefile
#  One-command setup and management for the whole project.
#  Run `make help` to see all commands.
# ─────────────────────────────────────────────────────────────

SHELL := /bin/sh

# Prefer the standalone docker-compose binary, otherwise the v2 plugin.
COMPOSE := $(shell (docker compose version >/dev/null 2>&1 && echo "docker compose") || (command -v docker-compose >/dev/null 2>&1 && echo "docker-compose") || echo "docker compose")

.DEFAULT_GOAL := help

.PHONY: help install doctor setup up start stop down restart ps \
        logs logs-backend logs-frontend build rebuild prod dev \
        backup restore enable-boot clean print-urls

help: ## Show this help
	@printf '\n\033[1m✦ Celestial Desk — available commands\033[0m\n\n'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@printf '\n  \033[90mQuick start:\033[0m  make setup   ->   make up\n\n'

## ─── Setup ──────────────────────────────────────────────────

install: ## Install Docker + Compose for your OS (Linux/macOS)
	@bash ./scripts/install-docker.sh

doctor: ## Check prerequisites (Docker, Compose, ports, .env)
	@bash ./scripts/doctor.sh

setup: doctor ## One-time setup: .env file + data directory
	@bash ./scripts/setup.sh

## ─── Run ────────────────────────────────────────────────────

up: ## Build & start the app (development mode, hot reload)
	$(COMPOSE) up --build -d
	@$(MAKE) -s print-urls

start: up ## Alias for `make up`

prod: ## Build & start in production mode (optimized build)
	$(COMPOSE) --profile prod up --build -d
	@$(MAKE) -s print-urls

dev: ## Start only the frontend dev server (hot reload)
	$(COMPOSE) up -d frontend-dev

stop: ## Stop all services (data is kept)
	$(COMPOSE) down

down: stop ## Alias for `make stop`

restart: ## Restart all services
	$(COMPOSE) down
	$(COMPOSE) up -d

ps: ## Show running services
	$(COMPOSE) ps

## ─── Build / logs ───────────────────────────────────────────

build: ## Build the Docker images
	$(COMPOSE) build

rebuild: ## Rebuild images and restart the stack
	$(COMPOSE) up --build -d

logs: ## Follow logs of all services
	$(COMPOSE) logs -f

logs-backend: ## Follow backend logs
	$(COMPOSE) logs -f backend

logs-frontend: ## Follow frontend (dev) logs
	$(COMPOSE) logs -f frontend-dev

## ─── Data ───────────────────────────────────────────────────

backup: ## Create a timestamped backup of ./data into ./data/backups
	@bash ./scripts/backup.sh

restore: ## Restore a backup: make restore FILE=data/backups/<file>.tar.gz
	@bash ./scripts/restore.sh $(FILE)

enable-boot: ## Auto-start on boot (Linux / systemd only)
	@sudo bash ./scripts/enable-boot.sh

clean: ## Remove containers and anonymous volumes (keeps ./data)
	$(COMPOSE) down -v --remove-orphans

## ─── Internal ───────────────────────────────────────────────

print-urls:
	@printf '\n\033[1m✦ Celestial Desk is running!\033[0m\n'
	@printf '  Frontend : \033[36mhttp://localhost:3030\033[0m\n'
	@printf '  Backend  : \033[36mhttp://localhost:8000\033[0m\n'
	@printf '  API Docs : \033[36mhttp://localhost:8000/docs\033[0m\n'
	@printf '\n  Stop with:  \033[90mmake stop\033[0m\n\n'
