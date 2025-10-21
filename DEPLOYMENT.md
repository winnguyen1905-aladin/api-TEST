# Production Deployment Guide

Hướng dẫn deploy backend lên production server.

---

## 🎯 Deployment Options

| Method | Auto | Zero-Downtime | Rollback | Complexity |
|--------|------|---------------|----------|------------|
| **PM2** ⭐ | ✅ | ✅ | ✅ | Easy |
| Docker | ✅ | ✅ | ✅ | Medium |
| Systemd | ❌ | ❌ | Manual | Easy |

**Khuyến nghị:** PM2 cho Node.js applications

---

## 🚀 Quick Deploy (After CI Passes)

### Option 1: Automatic (GitHub Actions)

```
Push to main → CI runs → Tests pass → Auto deploy → Server running ✅
```

**Setup once, deploy forever!**

### Option 2: Manual SSH

```bash
# SSH vào server
ssh user@your-server.com

# Navigate to project
cd /var/www/aladin-backend/back-end

# Pull latest code
git pull origin main

# Deploy
./scripts/deploy.sh
```

---

## 📋 Server Setup (One-time)

### 1. System Requirements

```bash
# Ubuntu 20.04+ / Debian 11+
- Node.js 22.x
- Docker
- Git
- PM2 (will be installed)
```

### 2. Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Git
sudo apt-get install -y git

# Install PM2
sudo npm install -g pm2

# Verify
node --version     # v22.x.x
npm --version      # 10.x.x
docker --version   # Docker version...
pm2 --version      # 5.x.x
```

### 3. Create Deploy User

```bash
# Create user
sudo adduser deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Setup SSH key
sudo su - deploy
mkdir ~/.ssh
chmod 700 ~/.ssh

# Add your SSH public key
echo "your-ssh-public-key" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. Clone Repository

```bash
# As deploy user
sudo su - deploy

# Clone repo
cd /var/www
git clone git@github.com:your-username/your-repo.git aladin-backend
cd aladin-backend/back-end

# Install dependencies
npm ci --only=production
npm run build
```

### 5. Setup Environment

```bash
# Create .env file
cd /var/www/aladin-backend/back-end
nano .env
```

```env
NODE_ENV=production
PORT=8090
REDIS_HOST=localhost
REDIS_PORT=6379

# Add other production env vars
```

### 6. First Deployment

```bash
# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 🔧 PM2 Management

### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Or use script
./scripts/deploy.sh
```

### Monitor Application

```bash
# Real-time monitoring
pm2 monit

# View status
pm2 status

# View logs
pm2 logs aladin-backend

# View metrics
pm2 show aladin-backend
```

### Manage Application

```bash
# Restart (zero-downtime)
pm2 reload aladin-backend

# Hard restart
pm2 restart aladin-backend

# Stop
pm2 stop aladin-backend

# Delete from PM2
pm2 delete aladin-backend

# Restart all
pm2 restart all
```

### Save PM2 State

```bash
# Save current process list
pm2 save

# Resurrect on reboot
pm2 startup systemd
# Run the command it outputs

# Delete saved state
pm2 unstartup systemd
```

---

## 🔄 Continuous Deployment (GitHub Actions)

### Setup GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:

```
SSH_PRIVATE_KEY    = Your SSH private key
SERVER_HOST        = your-server.com
SERVER_USER        = deploy
DEPLOY_PATH        = /var/www/aladin-backend
```

### Generate SSH Key (on your local machine)

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# Copy private key to GitHub Secret
cat ~/.ssh/github-actions
# → Add to SSH_PRIVATE_KEY secret

# Copy public key to server
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@your-server.com
```

### Deployment Flow

```
┌─────────────────────────────────────────────┐
│  1. Push to main                            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  2. CI Workflow runs                        │
│     - Test code                             │
│     - Build TypeScript                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼ (if success)
┌─────────────────────────────────────────────┐
│  3. Deploy Workflow triggers                │
│     - SSH to server                         │
│     - Pull latest code                      │
│     - Run deploy.sh                         │
│     - PM2 reload (zero-downtime)            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  4. Health check                            │
│     - Verify server responds                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ✅ Deployed!
```

---

## 🐳 Redis Management (Production)

### Using Docker

```bash
# Start Redis (first time)
docker run -d \
    --name aladin-redis-prod \
    -p 6379:6379 \
    -v redis-prod-data:/data \
    --restart unless-stopped \
    redis:7-alpine \
    redis-server --appendonly yes --appendfsync everysec

# Or use deployment script (it handles Redis automatically)
./scripts/deploy.sh
```

### Manage Redis

```bash
# Status
docker ps | grep redis

# Logs
docker logs -f aladin-redis-prod

# CLI
docker exec -it aladin-redis-prod redis-cli

# Backup
docker exec aladin-redis-prod redis-cli SAVE
docker cp aladin-redis-prod:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb

# Restart
docker restart aladin-redis-prod
```

---

## 🔒 Security Checklist

- [ ] Firewall configured (UFW)
- [ ] Only ports 22, 80, 443, 8090 open
- [ ] SSH key authentication (no password)
- [ ] Fail2ban installed
- [ ] SSL/TLS certificate (nginx reverse proxy)
- [ ] Environment variables secured
- [ ] Redis password set (if exposed)
- [ ] Regular security updates

### Basic Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS (if using nginx)
sudo ufw allow 80
sudo ufw allow 443

# Allow backend (or use nginx reverse proxy)
sudo ufw allow 8090

# Check status
sudo ufw status
```

---

## 🔧 Nginx Reverse Proxy (Optional)

### Install Nginx

```bash
sudo apt-get install -y nginx
```

### Configure

```nginx
# /etc/nginx/sites-available/aladin-backend

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/aladin-backend /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is setup automatically
```

---

## 📊 Monitoring

### PM2 Web Dashboard

```bash
# Install PM2 Plus (optional)
pm2 link <secret-key> <public-key>

# Or use local monitoring
pm2 monit
```

### Logs

```bash
# Real-time logs
pm2 logs aladin-backend

# Last 100 lines
pm2 logs aladin-backend --lines 100

# Error logs only
pm2 logs aladin-backend --err

# Clear logs
pm2 flush
```

### System Resources

```bash
# CPU & Memory
pm2 monit

# Detailed stats
pm2 show aladin-backend

# Docker stats
docker stats aladin-redis-prod
```

---

## 🐛 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs aladin-backend --err

# Check if port is in use
sudo lsof -i :8090

# Check Redis connection
docker exec aladin-redis-prod redis-cli ping

# Check environment
pm2 show aladin-backend
```

### Zero-downtime reload not working

```bash
# Use reload instead of restart
pm2 reload aladin-backend

# If stuck, force restart
pm2 restart aladin-backend --force
```

### High memory usage

```bash
# Check memory limit
pm2 show aladin-backend | grep memory

# Adjust in ecosystem.config.js
max_memory_restart: '1G'

# Reload
pm2 reload ecosystem.config.js
```

### Deployment fails

```bash
# Check SSH connection
ssh deploy@your-server.com

# Check GitHub Actions logs
# → Go to Actions tab on GitHub

# Manual deploy
ssh deploy@your-server.com
cd /var/www/aladin-backend/back-end
git pull origin main
./scripts/deploy.sh
```

---

## 🔄 Rollback

### Quick Rollback

```bash
# SSH to server
ssh deploy@your-server.com
cd /var/www/aladin-backend

# Revert to previous commit
git log --oneline -10  # Find commit hash
git reset --hard <commit-hash>

# Redeploy
cd back-end
./scripts/deploy.sh
```

### PM2 Rollback

```bash
# PM2 doesn't have built-in rollback
# Use git to rollback code, then reload PM2
```

---

## 📈 Performance Tuning

### PM2 Cluster Mode

Already configured in `ecosystem.config.js`:

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

### Node.js Optimization

```bash
# In ecosystem.config.js
node_args: '--max-old-space-size=2048'
```

### Redis Optimization

```bash
# In redis.conf or docker command
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 📝 Maintenance

### Update Dependencies

```bash
# On server
cd /var/www/aladin-backend/back-end

# Update packages
npm update

# Or pull from repo (after updating package.json)
git pull origin main
npm ci --only=production

# Rebuild
npm run build

# Reload
pm2 reload aladin-backend
```

### Backup

```bash
# Backup Redis data
docker exec aladin-redis-prod redis-cli SAVE
docker cp aladin-redis-prod:/data/dump.rdb ./backup-redis-$(date +%Y%m%d).rdb

# Backup code
tar -czf backup-code-$(date +%Y%m%d).tar.gz /var/www/aladin-backend

# Upload to storage
# scp, rsync, or cloud storage
```

---

## ✅ Post-Deployment Checklist

- [ ] Application running: `pm2 status`
- [ ] Health check: `curl http://localhost:8090/health`
- [ ] Redis connected: `docker exec aladin-redis-prod redis-cli ping`
- [ ] Logs clean: `pm2 logs aladin-backend`
- [ ] PM2 saved: `pm2 save`
- [ ] Monitoring active: `pm2 monit`

---

## 🆘 Support

- PM2 Docs: https://pm2.keymetrics.io/docs/usage/quick-start/
- Node.js Docs: https://nodejs.org/docs/
- Docker Docs: https://docs.docker.com/

---

**Last Updated:** 2025-10-20


