// PM2 Ecosystem Configuration
// Production process management

module.exports = {
  apps: [
    {
      name: 'aladin-backend',
      script: './dist/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 8090,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      },
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Logs
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Cluster mode
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy', // SSH user
      host: ['your-server.com'], // Production server
      ref: 'origin/main',
      repo: 'git@github.com:your-username/your-repo.git',
      path: '/var/www/aladin-backend',
      
      // Pre-deploy
      'pre-deploy-local': '',
      
      // Post-deploy commands
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      
      // Pre-setup
      'pre-setup': '',
      
      // Post-setup
      'post-setup': 'npm install && npm run build',
      
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

