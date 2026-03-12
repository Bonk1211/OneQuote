.PHONY: help install dev dev-frontend dev-backend dev-supabase stop \
       build test test-backend test-frontend lint clean env

# ──────────────────────────────────────────────
# QuoteGuard — Development Commands
# ──────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Setup ──

env: ## Copy .env.example to .env
	@test -f .env || (cp .env.example .env && echo "Created .env")
	@echo "Edit .env with your keys before running services."

install: ## Install all dependencies
	cd frontend && npm install
	cd backend && pip3 install -r requirements.txt
	@echo "All dependencies installed."

# ── Development (all services) ──

dev: ## Run all services concurrently (Supabase + Backend + Frontend)
	@echo "Starting all services..."
	@trap 'kill 0' INT TERM; \
	$(MAKE) dev-supabase & \
	sleep 3; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-frontend: ## Run Next.js dev server (port 3000)
	cd frontend && npm run dev

dev-backend: ## Run FastAPI dev server (port 8000)
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-supabase: ## Start local Supabase (requires supabase CLI)
	cd supabase && supabase start

# ── Stop ──

stop: ## Stop all services
	@echo "Stopping Supabase..."
	-cd supabase && supabase stop
	@echo "Killing dev servers..."
	-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@echo "All services stopped."

# ── Build ──

build: ## Build frontend for production
	cd frontend && npm run build

# ── Database ──

db-reset: ## Reset Supabase database (run all migrations + seed)
	cd supabase && supabase db reset

db-migrate: ## Run pending migrations
	cd supabase && supabase migration up

db-seed: ## Run seed file
	cd supabase && supabase db reset --seed-only

# ── Testing ──

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend pytest suite
	cd backend && python3 -m pytest tests/ -v

test-frontend: ## Run frontend type check + lint
	cd frontend && npx tsc --noEmit
	cd frontend && npm run lint

# ── Linting ──

lint: ## Lint all code
	cd frontend && npm run lint
	cd frontend && npx tsc --noEmit

# ── Clean ──

clean: ## Remove build artifacts and caches
	rm -rf frontend/.next frontend/node_modules/.cache
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned."
