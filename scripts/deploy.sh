#!/bin/bash

# ========================================
# Production Deployment Script
# Deploy backend to production server
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║     Aladin Backend Deployment             ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if on production server
check_environment() {
    print_info "Checking environment..."
    
    if [ "$NODE_ENV" != "production" ]; then
        print_warning "NODE_ENV is not 'production'"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        exit 1
    fi
    
    # PM2
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing..."
        npm install -g pm2
    fi
    
    # Docker (for Redis)
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        exit 1
    fi
    
    print_info "✓ All dependencies installed"
}

# Pull latest code
pull_code() {
    print_info "Pulling latest code..."
    
    if [ -d ".git" ]; then
        git pull origin main
        print_info "✓ Code updated"
    else
        print_warning "Not a git repository. Skipping pull."
    fi
}

# Install dependencies
install_deps() {
    print_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    npm ci --only=production
    
    print_info "✓ Dependencies installed"
}

# Build TypeScript
build_app() {
    print_info "Building TypeScript..."
    
    cd "$PROJECT_ROOT"
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed! dist/ directory not found"
        exit 1
    fi
    
    print_info "✓ Build successful"
}

# Start/Restart Redis
manage_redis() {
    print_info "Managing Redis..."
    
    # Check if Redis container exists
    if docker ps -a | grep -q "aladin-redis-prod"; then
        print_info "Redis container exists. Ensuring it's running..."
        docker start aladin-redis-prod || true
    else
        print_info "Creating Redis container..."
        docker run -d \
            --name aladin-redis-prod \
            -p 6379:6379 \
            -v redis-prod-data:/data \
            --restart unless-stopped \
            redis:7-alpine \
            redis-server --appendonly yes --appendfsync everysec
    fi
    
    # Health check
    sleep 2
    if docker exec aladin-redis-prod redis-cli ping &> /dev/null; then
        print_info "✓ Redis is running"
    else
        print_error "Redis health check failed!"
        exit 1
    fi
}

# Deploy with PM2
deploy_pm2() {
    print_info "Deploying with PM2..."
    
    cd "$PROJECT_ROOT"
    
    # Check if app is already running
    if pm2 list | grep -q "aladin-backend"; then
        print_info "Reloading existing app (zero-downtime)..."
        pm2 reload ecosystem.config.js --env production
    else
        print_info "Starting new app..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # Save PM2 process list
    pm2 save
    
    # Setup PM2 startup script (first time only)
    if ! pm2 startup | grep -q "already"; then
        print_info "Setting up PM2 startup script..."
        pm2 startup systemd -u $USER --hp $HOME
    fi
    
    print_info "✓ App deployed"
}

# Show status
show_status() {
    print_info "Application Status:"
    echo ""
    pm2 status
    echo ""
    pm2 logs aladin-backend --lines 20 --nostream
}

# Main deployment flow
main() {
    print_header
    
    print_info "Starting deployment..."
    echo ""
    
    check_environment
    check_dependencies
    pull_code
    install_deps
    build_app
    manage_redis
    deploy_pm2
    
    echo ""
    print_info "═══════════════════════════════════════"
    print_info "✓ Deployment Complete!"
    print_info "═══════════════════════════════════════"
    echo ""
    
    show_status
    
    echo ""
    print_info "Useful commands:"
    echo "  pm2 logs aladin-backend       - View logs"
    echo "  pm2 restart aladin-backend    - Restart app"
    echo "  pm2 stop aladin-backend       - Stop app"
    echo "  pm2 monit                     - Monitor app"
}

# Run deployment
main "$@"


