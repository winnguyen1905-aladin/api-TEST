# 🚀 Simple Deployment Guide

Hướng dẫn deploy đơn giản nhất - không cần SSH, không cần nhiều setup!

---

## 🎯 Cách hoạt động

```
Push to main → Test (CI) → Deploy (CD) → App running ✅

Tất cả chạy trên self-hosted runner!
```

---

## ⚡ Setup lần đầu (5 phút)

### 1. Install PM2 trên runner

```bash
npm install -g pm2
```

### 2. Create .env file

```bash
cd back-end
cp .env.production.example .env

# Edit .env
nano .env
```

```env
NODE_ENV=production
PORT=8090
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Xong! 🎉

---

## 🚀 Deploy

### Tự động (Recommended)

```bash
git add .
git commit -m "feat: new feature"
git push origin main

# Auto:
# → Test job runs
# → Deploy job runs (if test pass)
# → App running! ✅
```

### Manual (nếu cần)

```bash
# On runner machine
cd back-end

# Build
npm ci --only=production
npm run build

# Start Redis
docker run -d \
  --name aladin-redis-prod \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine

# Deploy
pm2 start dist/server.js \
  --name aladin-backend \
  --instances max \
  --env production

pm2 save
```

---

## 📊 Workflow Breakdown

### Test Job (mọi commit)

```yaml
1. Checkout code
2. Setup Node.js & Python
3. Start Redis (dev)
4. npm ci
5. npm run build
6. npm test
7. Stop Redis (dev)
```

### Deploy Job (chỉ main branch)

```yaml
1. Checkout code
2. Setup Node.js
3. npm ci --only=production
4. npm run build
5. Start Redis (production)
6. Install PM2 (if needed)
7. PM2 start app
8. Health check
```

**Đơn giản! Không cần SSH, secrets, hay setup phức tạp.**

---

## 🔧 Manage App

### View status

```bash
pm2 status
```

### View logs

```bash
pm2 logs aladin-backend
```

### Restart

```bash
pm2 restart aladin-backend
```

### Stop

```bash
pm2 stop aladin-backend
```

### Monitor

```bash
pm2 monit
```

---

## 🔍 Troubleshooting

### App không start?

```bash
# Check PM2 logs
pm2 logs aladin-backend --err

# Check Redis
docker exec aladin-redis-prod redis-cli ping
```

### Deploy fails?

```bash
# Check GitHub Actions logs
# Go to: Actions tab → Latest workflow run

# Manual deploy
cd back-end
npm ci --only=production
npm run build
pm2 restart aladin-backend
```

### Redis not running?

```bash
# Start Redis
docker start aladin-redis-prod

# Or create new
docker run -d \
  --name aladin-redis-prod \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine
```

---

## ✅ Checklist

### Setup (One-time)
- [ ] PM2 installed: `npm install -g pm2`
- [ ] .env file created
- [ ] Redis can run: `docker ps`

### Every Deploy
- [ ] Commit & push to main
- [ ] Test job passes
- [ ] Deploy job runs
- [ ] App running: `pm2 status`

---

## 🎯 That's it!

**Không cần:**
- ❌ SSH keys
- ❌ Server setup riêng
- ❌ Deploy scripts phức tạp
- ❌ Multiple servers

**Chỉ cần:**
- ✅ Self-hosted runner
- ✅ PM2 installed
- ✅ .env file
- ✅ Push to main

---

## 📝 Example Flow

```bash
# Day 1: Setup
npm install -g pm2
cd back-end && cp .env.production.example .env

# Day 2+: Normal development
git commit -m "feat: new feature"
git push origin main
# → Auto deploy! ✅

# Check status
pm2 status
# → App running! ✅
```

---

## 💡 Tips

1. **First deploy might take longer** - PM2 setup + Redis download
2. **Subsequent deploys are fast** - PM2 restarts instantly
3. **Logs are your friend** - `pm2 logs aladin-backend`
4. **PM2 auto-saves** - App restarts after server reboot

---

**Đơn giản! Deploy trong 1 lệnh git push! 🚀**


