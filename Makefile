# ================================
# Makefile for Docker Management
# ================================

.PHONY: help dev prod build up down logs clean restart scale test backup

# Default target
.DEFAULT_GOAL := help

# Colors
COLOR_RESET   = \033[0m
COLOR_INFO    = \033[36m
COLOR_SUCCESS = \033[32m
COLOR_WARNING = \033[33m
COLOR_ERROR   = \033[31m

# ================================
# Help
# ================================
help: ## Show this help message
	@echo "$(COLOR_INFO)Available commands:$(COLOR_RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(COLOR_SUCCESS)%-20s$(COLOR_RESET) %s\n", $$1, $$2}'

# ================================
# Development
# ================================
dev: ## Start development environment (Redis + PostgreSQL only)
	@echo "$(COLOR_INFO)Starting development environment...$(COLOR_RESET)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(COLOR_SUCCESS)✅ Development environment started!$(COLOR_RESET)"
	@echo "$(COLOR_INFO)Redis: localhost:6379$(COLOR_RESET)"
	@echo "$(COLOR_INFO)PostgreSQL: localhost:5432$(COLOR_RESET)"
	@echo "$(COLOR_INFO)Redis Commander: http://localhost:8081$(COLOR_RESET)"

dev-down: ## Stop development environment
	@echo "$(COLOR_WARNING)Stopping development environment...$(COLOR_RESET)"
	docker-compose -f docker-compose.dev.yml down
	@echo "$(COLOR_SUCCESS)✅ Development environment stopped!$(COLOR_RESET)"

dev-logs: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

# ================================
# Production
# ================================
prod: build up ## Build and start production environment
	@echo "$(COLOR_SUCCESS)✅ Production environment started!$(COLOR_RESET)"
	@echo "$(COLOR_INFO)Chat Server: http://localhost:3000$(COLOR_RESET)"
	@echo "$(COLOR_INFO)Redis Commander: http://localhost:8081$(COLOR_RESET)"

build: ## Build Docker images
	@echo "$(COLOR_INFO)Building Docker images...$(COLOR_RESET)"
	docker-compose build --pull
	@echo "$(COLOR_SUCCESS)✅ Build complete!$(COLOR_RESET)"

up: ## Start all services
	@echo "$(COLOR_INFO)Starting all services...$(COLOR_RESET)"
	docker-compose up -d
	@make status

down: ## Stop all services
	@echo "$(COLOR_WARNING)Stopping all services...$(COLOR_RESET)"
	docker-compose down
	@echo "$(COLOR_SUCCESS)✅ All services stopped!$(COLOR_RESET)"

restart: ## Restart all services
	@echo "$(COLOR_INFO)Restarting all services...$(COLOR_RESET)"
	docker-compose restart
	@echo "$(COLOR_SUCCESS)✅ All services restarted!$(COLOR_RESET)"

# ================================
# Monitoring
# ================================
status: ## Show status of all services
	@echo "$(COLOR_INFO)Service status:$(COLOR_RESET)"
	@docker-compose ps

logs: ## View logs from all services
	docker-compose logs -f

logs-server: ## View chat server logs
	docker-compose logs -f chat-server

logs-consumer: ## View consumer logs
	docker-compose logs -f message-consumer

logs-redis: ## View Redis logs
	docker-compose logs -f redis

logs-db: ## View database logs
	docker-compose logs -f postgres

stats: ## Show resource usage statistics
	docker stats

# ================================
# Scaling
# ================================
scale-consumer: ## Scale message consumer (usage: make scale-consumer n=5)
	@echo "$(COLOR_INFO)Scaling message consumer to $(n) instances...$(COLOR_RESET)"
	docker-compose up -d --scale message-consumer=$(n)
	@echo "$(COLOR_SUCCESS)✅ Scaled to $(n) consumer instances!$(COLOR_RESET)"

# ================================
# Testing & Debugging
# ================================
test: ## Run integration tests
	@echo "$(COLOR_INFO)Running tests...$(COLOR_RESET)"
	npm test

shell-server: ## Open shell in chat server container
	docker-compose exec chat-server sh

shell-consumer: ## Open shell in consumer container
	docker-compose exec message-consumer sh

shell-redis: ## Open Redis CLI
	docker-compose exec redis redis-cli

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d chat_db

redis-info: ## Show Redis info
	@echo "$(COLOR_INFO)Redis Information:$(COLOR_RESET)"
	@docker-compose exec redis redis-cli INFO | grep -E "role:|connected_clients:|used_memory_human:|total_commands_processed:"

redis-queue: ## Show queue metrics
	@echo "$(COLOR_INFO)Queue Metrics:$(COLOR_RESET)"
	@echo "Waiting:   $$(docker-compose exec redis redis-cli LLEN bull:chat:messages:wait)"
	@echo "Active:    $$(docker-compose exec redis redis-cli LLEN bull:chat:messages:active)"
	@echo "Completed: $$(docker-compose exec redis redis-cli ZCARD bull:chat:messages:completed)"
	@echo "Failed:    $$(docker-compose exec redis redis-cli ZCARD bull:chat:messages:failed)"

db-messages: ## Show recent messages from database
	@echo "$(COLOR_INFO)Recent Messages:$(COLOR_RESET)"
	@docker-compose exec postgres psql -U postgres -d chat_db -c \
		"SELECT id, sender_name, LEFT(content, 50) as content, created_at FROM messages ORDER BY created_at DESC LIMIT 10;"

# ================================
# Backup & Restore
# ================================
backup: backup-redis backup-db ## Backup Redis and database
	@echo "$(COLOR_SUCCESS)✅ Backup complete!$(COLOR_RESET)"

backup-redis: ## Backup Redis data
	@echo "$(COLOR_INFO)Backing up Redis...$(COLOR_RESET)"
	@mkdir -p backup
	docker-compose exec redis redis-cli BGSAVE
	@sleep 2
	docker cp $$(docker-compose ps -q redis):/data/dump.rdb ./backup/redis-$$(date +%Y%m%d-%H%M%S).rdb
	@echo "$(COLOR_SUCCESS)✅ Redis backup complete!$(COLOR_RESET)"

backup-db: ## Backup PostgreSQL database
	@echo "$(COLOR_INFO)Backing up PostgreSQL...$(COLOR_RESET)"
	@mkdir -p backup
	docker-compose exec postgres pg_dump -U postgres chat_db > ./backup/postgres-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(COLOR_SUCCESS)✅ PostgreSQL backup complete!$(COLOR_RESET)"

restore-redis: ## Restore Redis from backup (usage: make restore-redis file=backup/redis-20240101.rdb)
	@echo "$(COLOR_WARNING)Restoring Redis from $(file)...$(COLOR_RESET)"
	docker cp $(file) $$(docker-compose ps -q redis):/data/dump.rdb
	docker-compose restart redis
	@echo "$(COLOR_SUCCESS)✅ Redis restore complete!$(COLOR_RESET)"

restore-db: ## Restore PostgreSQL from backup (usage: make restore-db file=backup/postgres-20240101.sql)
	@echo "$(COLOR_WARNING)Restoring PostgreSQL from $(file)...$(COLOR_RESET)"
	docker-compose exec -T postgres psql -U postgres chat_db < $(file)
	@echo "$(COLOR_SUCCESS)✅ PostgreSQL restore complete!$(COLOR_RESET)"

# ================================
# Maintenance
# ================================
clean: ## Remove all containers, volumes, and images
	@echo "$(COLOR_ERROR)⚠️  This will remove all data! Press Ctrl+C to cancel...$(COLOR_RESET)"
	@sleep 5
	docker-compose down -v
	docker system prune -af --volumes
	@echo "$(COLOR_SUCCESS)✅ Cleanup complete!$(COLOR_RESET)"

clean-logs: ## Clean old logs
	@echo "$(COLOR_INFO)Cleaning old logs...$(COLOR_RESET)"
	find ./logs -type f -name "*.log" -mtime +7 -delete
	@echo "$(COLOR_SUCCESS)✅ Old logs cleaned!$(COLOR_RESET)"

update: ## Pull latest images and rebuild
	@echo "$(COLOR_INFO)Updating Docker images...$(COLOR_RESET)"
	docker-compose pull
	docker-compose build --pull
	@echo "$(COLOR_SUCCESS)✅ Update complete! Run 'make restart' to apply.$(COLOR_RESET)"

# ================================
# Health Checks
# ================================
health: ## Check health of all services
	@echo "$(COLOR_INFO)Service Health:$(COLOR_RESET)"
	@docker-compose ps | grep -E "Up|healthy|unhealthy"

ping-redis: ## Ping Redis
	@docker-compose exec redis redis-cli ping

ping-db: ## Ping PostgreSQL
	@docker-compose exec postgres pg_isready -U postgres

# ================================
# Quick Commands
# ================================
install: ## Install npm dependencies
	npm install

run-local: dev ## Start Redis/DB in Docker, run server locally
	@echo "$(COLOR_INFO)Starting local server...$(COLOR_RESET)"
	npm run dev

stop-all: ## Stop all Docker containers
	docker stop $$(docker ps -aq) 2>/dev/null || true

ps: ## Show all running containers
	docker ps

# ================================
# CI/CD
# ================================
ci-test: ## Run tests for CI/CD
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

ci-build: ## Build for CI/CD
	docker-compose build

# ================================
# Info
# ================================
info: ## Show environment information
	@echo "$(COLOR_INFO)Environment Information:$(COLOR_RESET)"
	@echo "Docker version: $$(docker --version)"
	@echo "Docker Compose version: $$(docker-compose --version)"
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"

