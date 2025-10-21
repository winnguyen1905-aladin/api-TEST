# Backend Development Guide

Hướng dẫn chạy backend trong môi trường development.

---

## 🚀 Quick Start

### 1. Start Redis với Docker Compose

```bash
cd back-end

# Start Redis
docker-compose -f docker-compose.dev.yml up -d redis

# Verify Redis is running
docker-compose -f docker-compose.dev.yml ps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

**Backend sẽ chạy ở:** `http://localhost:8090`

---

## 📋 Available Commands

### Docker Compose Commands

```bash
# Start Redis only
docker-compose -f docker-compose.dev.yml up -d redis

# Start Redis + Redis Commander (Web UI)
docker-compose -f docker-compose.dev.yml --profile debug up -d

# Stop all services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f redis

# Restart Redis
docker-compose -f docker-compose.dev.yml restart redis

# Remove all (including volumes)
docker-compose -f docker-compose.dev.yml down -v
```

### NPM Commands

```bash
# Development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Clean dist folder
npm run clean

# Build and run
npm run start:ts
```

---

## 🔧 Environment Variables

Create `.env` file in `back-end/` directory:

```env
# Server
PORT=8090
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional: Redis URL (alternative to host/port)
# REDIS_URL=redis://localhost:6379
```

---

## 🗄️ Redis Management

### Access Redis CLI

```bash
# Via Docker
docker exec -it aladin-redis-dev redis-cli

# Test connection
> PING
PONG

# List all keys
> KEYS *

# Get a key
> GET mykey

# Exit
> exit
```

### Redis Commander Web UI

Start with debug profile:

```bash
docker-compose -f docker-compose.dev.yml --profile debug up -d
```

**Open:** http://localhost:8081

**Features:**
- ✅ View all Redis keys
- ✅ Search and filter
- ✅ Edit values
- ✅ Monitor commands
- ✅ Flush database

---

## 📁 Project Structure

```
back-end/
├── src/                          # Source code
│   ├── modules/
│   │   ├── cache/               # Redis & Queue services
│   │   ├── friend/              # Friend management
│   │   ├── interaction/         # Socket interactions
│   │   ├── media/               # MediaSoup (WebRTC)
│   │   ├── room/                # Room management
│   │   ├── socket/              # Socket.IO
│   │   └── worker/              # Background workers
│   ├── shared/                  # Shared config
│   ├── utils/                   # Utilities
│   └── server.ts                # Entry point
│
├── dist/                        # Compiled JavaScript
├── node_modules/
│
├── docker-compose.dev.yml       # Development services
├── docker-compose.yml           # Production services
├── Dockerfile                   # Production build
│
├── package.json
├── tsconfig.json
├── room-config.json
└── redis.conf
```

---

## 🐛 Troubleshooting

### Redis Connection Error

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check if Redis is running
docker-compose -f docker-compose.dev.yml ps

# If not running, start it
docker-compose -f docker-compose.dev.yml up -d redis

# Check logs
docker-compose -f docker-compose.dev.yml logs redis
```

---

### Port Already in Use

**Error:** `Port 6379 is already allocated`

**Solution:**
```bash
# Check what's using port 6379
sudo lsof -i :6379
# or
sudo netstat -tulpn | grep 6379

# Stop other Redis instance
docker stop aladin-redis-dev

# Or change port in docker-compose.dev.yml
ports:
  - "6380:6379"  # Use 6380 instead

# Update REDIS_PORT in .env
REDIS_PORT=6380
```

---

### Mediasoup Build Fails

**Error:** `gyp ERR! find Python`

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential python3 python3-pip

# macOS
xcode-select --install
brew install python3

# Windows
choco install python visualstudio2022buildtools
```

---

### TypeScript Compilation Errors

**Error:** `Cannot find module ...`

**Solution:**
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests (with Redis)

```bash
# Start Redis first
docker-compose -f docker-compose.dev.yml up -d redis

# Run tests
npm test

# Stop Redis
docker-compose -f docker-compose.dev.yml down
```

---

## 🔥 Hot Reload

Development server uses `ts-node-dev` for auto-reload:

```bash
npm run dev
```

**Features:**
- ✅ Auto-reload on file changes
- ✅ Fast transpile (no type checking)
- ✅ Preserve env variables
- ✅ Clear console on restart

**Watch these files:**
- `src/**/*.ts`
- `src/**/*.json`

---

## 📊 Monitoring

### View Redis Stats

```bash
# Real-time stats
docker exec -it aladin-redis-dev redis-cli INFO

# Monitor commands in real-time
docker exec -it aladin-redis-dev redis-cli MONITOR

# Check memory usage
docker exec -it aladin-redis-dev redis-cli INFO memory
```

### View Docker Stats

```bash
# Container stats
docker stats aladin-redis-dev

# Logs
docker logs -f aladin-redis-dev
```

---

## 🚦 Development Workflow

### Typical Development Session

```bash
# 1. Start Redis
cd back-end
docker-compose -f docker-compose.dev.yml up -d redis

# 2. Run backend
npm run dev

# 3. Make changes to code
# → Auto-reload kicks in

# 4. Test changes
curl http://localhost:8090/health

# 5. When done, stop Redis
docker-compose -f docker-compose.dev.yml down
```

### With Redis Commander (Debug Mode)

```bash
# Start everything
docker-compose -f docker-compose.dev.yml --profile debug up -d

# Open Redis Commander
open http://localhost:8081

# Run backend
npm run dev

# Monitor Redis in real-time via web UI
```

---

## 🎯 Tips & Best Practices

### 1. Use Environment Variables

```bash
# Don't hardcode values
# ❌ BAD
const redisHost = 'localhost'

# ✅ GOOD
const redisHost = process.env.REDIS_HOST || 'localhost'
```

### 2. Keep Redis Data Persistent

Docker Compose already configured with volume:
```yaml
volumes:
  - redis-dev-data:/data
```

**Data persists** between container restarts.

### 3. Clean Up Regularly

```bash
# Remove stopped containers
docker-compose -f docker-compose.dev.yml down

# Remove with volumes (fresh start)
docker-compose -f docker-compose.dev.yml down -v
```

### 4. Use Redis Commander for Debugging

Instead of CLI commands, use Web UI:
- http://localhost:8081
- Visual interface
- Easy to browse keys
- Real-time updates

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Check Redis: `docker exec -it aladin-redis-dev redis-cli ping`
3. Check backend: `curl http://localhost:8090/health`
4. See full guide: [RUNNER_SETUP.md](../.github/RUNNER_SETUP.md)

---

**Happy Coding! 🚀**


