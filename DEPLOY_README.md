# Deploy Backend - Quick Guide

## 🎯 Bạn có 1 Self-Hosted Runner?

### ✅ **YES** → Dùng Simple CI/CD (Recommended)

**Runner = Server = 1 máy duy nhất**

📖 Đọc: [`SIMPLE_DEPLOY.md`](./SIMPLE_DEPLOY.md)

**Setup:**
```bash
npm install -g pm2
cd back-end
echo "NODE_ENV=production
PORT=8090
REDIS_HOST=localhost
REDIS_PORT=6379" > .env
```

**Deploy:**
```bash
git push origin main
# ✅ Auto deploy!
```

---

### ❌ **NO** → Runner và Server khác nhau

**Cần deploy SSH sang server production**

📖 Đọc: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

**Setup:**
- Configure SSH keys
- Add GitHub secrets
- Setup production server

**Deploy:**
```bash
git push origin main
# → CI test
# → CD SSH to server
# → Deploy
```

---

## 📊 Comparison

| Method | Setup | Deploy Speed | Complexity |
|--------|-------|--------------|------------|
| **Simple CI/CD** | 2 min | ~2 min | ⭐ Very Easy |
| **SSH Deploy** | 30 min | ~5 min | ⭐⭐⭐ Medium |

---

## 🚀 Quick Commands

### Check status
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

---

## 📚 Full Docs

- [SIMPLE_DEPLOY.md](./SIMPLE_DEPLOY.md) - Simple CI/CD guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide

---

**Choose your method and follow the guide! 🎉**


