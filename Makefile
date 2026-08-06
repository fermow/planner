.PHONY: up up-dev down rebuild-backend rebuild-frontend build-backend build-frontend logs-backend logs-frontend ps restart-dev

up:
	docker compose up -d

up-dev:
	docker compose up -d frontend-dev

down:
	docker compose down

build-backend:
	docker compose build backend

build-frontend:
	docker compose build frontend

rebuild-backend: build-backend up

rebuild-frontend: build-frontend up

restart-dev:
	docker compose restart frontend-dev

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend-dev

ps:
	docker compose ps
