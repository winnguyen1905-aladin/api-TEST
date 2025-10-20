# Backend - Aladin Secure Chat

Node.js/TypeScript backend with Socket.IO, Redis, and MediaSoup (WebRTC).

---

## 🚀 Quick Start

### Development Server

```bash
cd back-end

# Option 1: Using Makefile (Recommended)
make redis-start    # Start Redis
make dev            # Run backend

# Option 2: Manual
docker-compose -f docker-compose.dev.yml up -d redis
npm run dev
```

**Server:** http://localhost:8090

---

## 📋 Documentation

| Document | Description |
|----------|-------------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Complete development guide |
| [DEV_CHEATSHEET.md](./DEV_CHEATSHEET.md) | Quick reference commands |
| [Makefile](./Makefile) | Run `make help` for all commands |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 22.x
- **Language:** TypeScript 5.x
- **Web Framework:** Express 4.x
- **Real-time:** Socket.IO 4.x
- **WebRTC:** MediaSoup 3.x
- **Cache/Queue:** Redis 7.x + BullMQ
- **DI Container:** InversifyJS

---

## 📁 Project Structure

```
back-end/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── cache/        # Redis & message queue
│   │   ├── friend/       # Friend management
│   │   ├── interaction/  # Socket.IO interactions
│   │   ├── media/        # MediaSoup (WebRTC)
│   │   ├── room/         # Room management
│   │   ├── socket/       # Socket handlers
│   │   ├── transport/    # Transport layer
│   │   └── worker/       # Background workers
│   ├── shared/           # Shared config
│   ├── utils/            # Utilities
│   └── server.ts         # Entry point
│
├── dist/                 # Compiled JavaScript
├── docker-compose.dev.yml # Development services
├── docker-compose.yml    # Production deployment
├── Dockerfile            # Production build
├── Makefile              # Development commands
└── package.json
```

---

## ⚙️ Environment Variables

Create `.env` file:

```env
PORT=8090
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🐳 Docker Compose

### Development (Local)

```yaml
# docker-compose.dev.yml
services:
  redis:              # Only Redis
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Usage:**
```bash
docker-compose -f docker-compose.dev.yml up -d redis
npm run dev  # Backend runs natively
```

### Production (Deployment)

```yaml
# docker-compose.yml
services:
  redis:              # Redis
  backend:            # Backend container
  frontend:           # Frontend container
```

**Usage:**
```bash
docker-compose up -d
```

---

## 🧪 Testing

```bash
# Make sure Redis is running
make redis-start

# Run tests
npm test
```

---

## 🏗️ Building

### Development Build

```bash
npm run build
# Output: dist/
```

### Production Build (Docker)

```bash
docker build -t aladin-backend:latest .
```

---

## 📊 Available Scripts

### NPM Scripts

```bash
npm run dev          # Development with auto-reload
npm run build        # Build TypeScript
npm start            # Run production build
npm test             # Run tests
npm run clean        # Clean dist folder
```

### Makefile Commands

```bash
make help            # Show all commands
make dev             # Run development server
make redis-start     # Start Redis
make debug           # Start with Redis Commander
make ci              # Run CI locally
```

See [DEV_CHEATSHEET.md](./DEV_CHEATSHEET.md) for full list.

---

## 🔧 Development Workflow

### Daily Development

```bash
# 1. Start Redis
make redis-start

# 2. Run backend (auto-reload on save)
make dev

# 3. Code & test
# ... make changes ...

# 4. Stop when done
# Ctrl+C to stop backend
make redis-stop
```

### With Redis Commander (Debug)

```bash
# Start Redis + Web UI
make debug

# In another terminal
make dev

# Open Redis Commander
open http://localhost:8081
```

---

## 🐛 Debugging

### Redis CLI

```bash
make redis-cli
> KEYS *
> GET mykey
```

### Redis Web UI

```bash
make debug
# Open http://localhost:8081
```

### Logs

```bash
make redis-logs
```

---

## 🆘 Troubleshooting

See [DEVELOPMENT.md](./DEVELOPMENT.md#troubleshooting) for detailed troubleshooting guide.

**Common issues:**

- **ECONNREFUSED:** Redis not running → `make redis-start`
- **Port in use:** Change port in `.env`
- **Build fails:** Clean rebuild → `make clean && make build`

---

## 🚦 CI/CD

### GitHub Actions

CI workflow automatically:
1. Starts Redis (Docker)
2. Installs dependencies
3. Builds TypeScript
4. Runs tests
5. Stops Redis

**File:** `.github/workflows/backend-ci.yml`

### Run CI Locally

```bash
make ci
```

---

## 📦 Dependencies

### Production

- `express` - Web framework
- `socket.io` - Real-time communication
- `mediasoup` - WebRTC server
- `ioredis` - Redis client
- `bullmq` - Message queue
- `inversify` - Dependency injection

### Development

- `typescript` - Type checking
- `ts-node-dev` - Development server
- `nodemon` - File watching

---

## 🔐 Security

- Input validation
- Rate limiting
- CORS configuration
- WebSocket authentication

---

## 📈 Performance

- Redis caching
- Message queue for async tasks
- Worker threads for CPU-intensive ops
- Connection pooling

---

## 🌐 API Endpoints

```
GET  /health        # Health check
GET  /api/...       # REST API (if any)

Socket.IO Events:
- connection
- disconnect
- message
- room:join
- room:leave
- call:offer
- call:answer
```

---

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production (Local)

```bash
npm run build
npm start
```

### Production (Docker)

```bash
docker-compose up -d
```

See [DEPLOY.md](../DEPLOY.md) for full deployment guide.

---

## 📚 Learn More

- [Socket.IO Events Diagram](./docs/SOCKET_EVENTS_DIAGRAM.md)
- [Socket Events Quick Reference](./docs/SOCKET_EVENTS_QUICK_REFERENCE.md)
- [Refactoring Summary](./docs/REFACTORING_SUMMARY.md)

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Run tests: `make ci`
5. Submit PR

---

## 📄 License

[Your License Here]

---

## 🆘 Support

- 📖 [Full Development Guide](./DEVELOPMENT.md)
- 🎯 [Cheat Sheet](./DEV_CHEATSHEET.md)
- 🐛 [Troubleshooting](./DEVELOPMENT.md#troubleshooting)
- 💬 [Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ by Aladin Team**
