# ================================
# Backend Development Makefile
# ================================

.PHONY: help
help: ## Show this help message
	@echo "Backend Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ================================
# Docker Compose Commands
# ================================

.PHONY: redis-start
redis-start: ## Start Redis container
	@echo "🚀 Starting Redis..."
	docker-compose -f docker-compose.dev.yml up -d redis
	@sleep 2
	@docker exec aladin-redis-dev redis-cli ping
	@echo "✅ Redis is running!"

.PHONY: redis-stop
redis-stop: ## Stop Redis container
	@echo "⏹️  Stopping Redis..."
	docker-compose -f docker-compose.dev.yml down
	@echo "✅ Redis stopped!"

.PHONY: redis-restart
redis-restart: ## Restart Redis container
	@make redis-stop
	@make redis-start

.PHONY: redis-logs
redis-logs: ## View Redis logs
	docker-compose -f docker-compose.dev.yml logs -f redis

.PHONY: redis-cli
redis-cli: ## Connect to Redis CLI
	docker exec -it aladin-redis-dev redis-cli

.PHONY: redis-status
redis-status: ## Show Redis status
	@echo "Redis Status:"
	@docker-compose -f docker-compose.dev.yml ps
	@echo ""
	@echo "Redis Info:"
	@docker exec aladin-redis-dev redis-cli INFO server | grep redis_version

.PHONY: redis-clean
redis-clean: ## Remove Redis container and data
	docker-compose -f docker-compose.dev.yml down -v
	@echo "✅ Redis data cleaned!"

# ================================
# Development Commands
# ================================

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: dev
dev: ## Run development server (requires Redis)
	@echo "🚀 Starting backend in development mode..."
	@echo "Make sure Redis is running: make redis-start"
	npm run dev

.PHONY: build
build: ## Build TypeScript
	npm run build

.PHONY: start
start: ## Run production build
	npm start

.PHONY: clean
clean: ## Clean dist folder
	npm run clean

.PHONY: test
test: ## Run tests
	npm test

# ================================
# Complete Workflows
# ================================

.PHONY: setup
setup: ## Setup development environment
	@echo "🔧 Setting up development environment..."
	@make install
	@make redis-start
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  make dev       - Run development server"
	@echo "  make debug     - Run with Redis Commander"

.PHONY: dev-start
dev-start: ## Start Redis and run dev server
	@make redis-start
	@echo ""
	@echo "Starting backend..."
	@make dev

.PHONY: dev-stop
dev-stop: ## Stop all development services
	@make redis-stop

.PHONY: debug
debug: ## Start with Redis Commander (Web UI at :8081)
	@echo "🐛 Starting development with Redis Commander..."
	docker-compose -f docker-compose.dev.yml --profile debug up -d
	@sleep 2
	@echo ""
	@echo "✅ Services started!"
	@echo "   Redis:           localhost:6379"
	@echo "   Redis Commander: http://localhost:8081"
	@echo ""
	@echo "Run 'make dev' in another terminal to start backend"

.PHONY: debug-stop
debug-stop: ## Stop debug services
	docker-compose -f docker-compose.dev.yml --profile debug down

# ================================
# Utilities
# ================================

.PHONY: logs
logs: ## View all Docker logs
	docker-compose -f docker-compose.dev.yml logs -f

.PHONY: ps
ps: ## Show running containers
	docker-compose -f docker-compose.dev.yml ps

.PHONY: stats
stats: ## Show container stats
	docker stats aladin-redis-dev

.PHONY: shell
shell: ## Enter Redis container shell
	docker exec -it aladin-redis-dev sh

# ================================
# CI/CD Simulation
# ================================

.PHONY: ci
ci: ## Run CI pipeline locally
	@echo "🔄 Running CI pipeline..."
	@make redis-start
	@make install
	@make build
	@make test
	@make redis-stop
	@echo "✅ CI pipeline complete!"

# ================================
# Cleanup
# ================================

.PHONY: clean-all
clean-all: ## Clean everything (code + Docker)
	@echo "🧹 Cleaning everything..."
	@make clean
	@make redis-clean
	rm -rf node_modules package-lock.json
	@echo "✅ All clean!"

.PHONY: reset
reset: clean-all setup ## Reset and setup from scratch

# ================================
# Production Deployment
# ================================

.PHONY: deploy
deploy: ## Deploy to production (run on server)
	@echo "🚀 Deploying to production..."
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh

.PHONY: deploy-check
deploy-check: ## Check if ready for deployment
	@echo "🔍 Checking deployment readiness..."
	@echo "✓ Running tests..."
	@npm test || exit 1
	@echo "✓ Building..."
	@npm run build || exit 1
	@echo "✓ All checks passed!"
	@echo ""
	@echo "Ready to deploy!"

.PHONY: pm2-start
pm2-start: ## Start with PM2 (production)
	pm2 start ecosystem.config.js --env production

.PHONY: pm2-stop
pm2-stop: ## Stop PM2 app
	pm2 stop aladin-backend

.PHONY: pm2-restart
pm2-restart: ## Restart PM2 app
	pm2 restart aladin-backend

.PHONY: pm2-reload
pm2-reload: ## Reload PM2 app (zero-downtime)
	pm2 reload aladin-backend

.PHONY: pm2-logs
pm2-logs: ## View PM2 logs
	pm2 logs aladin-backend

.PHONY: pm2-monit
pm2-monit: ## Monitor PM2 app
	pm2 monit

.PHONY: pm2-status
pm2-status: ## Show PM2 status
	pm2 status

# ================================
# Default target
# ================================

.DEFAULT_GOAL := help
