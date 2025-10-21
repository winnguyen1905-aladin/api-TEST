# 🚀 Development Cheat Sheet

Quick reference cho backend development.

---

## ⚡ Quick Start (3 bước)

```bash
# 1. Vào thư mục backend
cd back-end

# 2. Start Redis
make redis-start
# hoặc: docker-compose -f docker-compose.dev.yml up -d redis

# 3. Run backend
make dev
# hoặc: npm run dev
```

**Backend chạy ở:** http://localhost:8090

---

## 🎯 Makefile Commands

```bash
# Development
make dev              # Run development server
make dev-start        # Start Redis + backend
make dev-stop         # Stop all services

# Redis
make redis-start      # Start Redis
make redis-stop       # Stop Redis
make redis-restart    # Restart Redis
make redis-cli        # Open Redis CLI
make redis-logs       # View Redis logs
make redis-status     # Check Redis status

# Build
make build            # Build TypeScript
make clean            # Clean dist folder
make install          # Install dependencies

# Debug
make debug            # Start with Redis Commander (Web UI)
make debug-stop       # Stop debug mode

# Utilities
make help             # Show all commands
make ci               # Run CI locally
make clean-all        # Clean everything
```

---

## 🐳 Docker Compose Commands

```bash
# Start Redis only
docker-compose -f docker-compose.dev.yml up -d redis

# Start with Redis Commander (Web UI)
docker-compose -f docker-compose.dev.yml --profile debug up -d

# Stop all
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Remove with data
docker-compose -f docker-compose.dev.yml down -v

# Status
docker-compose -f docker-compose.dev.yml ps
```

---

## 🗄️ Redis Commands

### Via Docker

```bash
# Ping
docker exec aladin-redis-dev redis-cli ping

# List all keys
docker exec aladin-redis-dev redis-cli KEYS '*'

# Get value
docker exec aladin-redis-dev redis-cli GET mykey

# Set value
docker exec aladin-redis-dev redis-cli SET mykey myvalue

# Delete key
docker exec aladin-redis-dev redis-cli DEL mykey

# Flush all data
docker exec aladin-redis-dev redis-cli FLUSHALL
```

### Via CLI

```bash
# Enter Redis CLI
make redis-cli
# or: docker exec -it aladin-redis-dev redis-cli

# Inside CLI
> PING                    # Test connection
> KEYS *                  # List all keys
> GET user:123            # Get value
> SET user:123 "John"     # Set value
> DEL user:123            # Delete key
> FLUSHALL                # Delete all keys
> INFO                    # Server info
> MONITOR                 # Monitor commands (real-time)
> exit                    # Exit CLI
```

---

## 📦 NPM Commands

```bash
npm run dev              # Development mode (auto-reload)
npm run build            # Build TypeScript
npm start                # Run production build
npm run clean            # Clean dist folder
npm test                 # Run tests
npm run start:ts         # Build + run
```

---

## 🐛 Debugging

### Option 1: Redis Commander (Web UI)

```bash
# Start with Web UI
make debug

# Open browser
open http://localhost:8081
```

**Features:**
- View all keys
- Edit values
- Monitor real-time
- Search & filter

### Option 2: Monitor Redis Commands

```bash
# Real-time command monitoring
docker exec -it aladin-redis-dev redis-cli MONITOR
```

### Option 3: View Logs

```bash
# Redis logs
make redis-logs

# Backend logs (in console where you ran npm run dev)
```

---

## 🔥 Common Workflows

### Daily Development

```bash
# Morning
cd back-end
make redis-start
make dev

# ... code all day (auto-reload on save)

# Evening
# Ctrl+C to stop backend
make redis-stop
```

### Debug Session

```bash
# Start everything with Web UI
make debug

# In another terminal
make dev

# Open Redis Commander
open http://localhost:8081

# Monitor data in real-time while testing
```

### Fresh Start

```bash
# Clean everything and start fresh
make reset

# Or manual
make clean-all
make setup
make dev
```

### Before Commit

```bash
# Run CI locally
make ci

# This will:
# - Start Redis
# - Install deps
# - Build TypeScript
# - Run tests
# - Stop Redis
```

---

## 🆘 Troubleshooting

### Redis won't start

```bash
# Check if port is in use
sudo lsof -i :6379

# Stop other Redis
docker stop aladin-redis-dev

# Remove and recreate
make redis-clean
make redis-start
```

### Backend can't connect to Redis

```bash
# Check Redis is running
make redis-status

# Test connection
docker exec aladin-redis-dev redis-cli ping

# Check backend env
cat .env | grep REDIS
```

### Port 8090 already in use

```bash
# Find process using port
sudo lsof -i :8090

# Kill it
kill -9 <PID>

# Or change port in .env
PORT=8091
```

### Build errors

```bash
# Clean rebuild
make clean
make build

# Fresh install
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Monitoring

### Check Redis Memory

```bash
docker exec aladin-redis-dev redis-cli INFO memory
```

### Container Stats

```bash
docker stats aladin-redis-dev
```

### Health Check

```bash
# Backend
curl http://localhost:8090/health

# Redis
docker exec aladin-redis-dev redis-cli ping
```

---

## 🎯 Environment Variables

```env
# .env file
PORT=8090
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Priority:**
1. Environment variables
2. `.env` file
3. Default values

---

## 📱 URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend | http://localhost:8090 | API server |
| Redis | localhost:6379 | Redis server |
| Redis Commander | http://localhost:8081 | Web UI (debug mode) |

---

## 💡 Tips

1. **Use Makefile** - Easier than remembering long commands
2. **Keep Redis running** - Faster development (no restart needed)
3. **Use Redis Commander** - Visual debugging is faster
4. **Monitor logs** - `make redis-logs` in separate terminal
5. **Run CI locally** - `make ci` before commit

---

## 🔗 More Resources

- [Full Development Guide](./DEVELOPMENT.md)
- [Runner Setup](../.github/RUNNER_SETUP.md)
- [CI/CD Explained](../CI_CD_EXPLAINED.md)

---

**Happy Coding! 🚀**


