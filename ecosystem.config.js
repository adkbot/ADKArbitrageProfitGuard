module.exports = {
  apps: [
    {
      name: "adk-arbitragem-multiuser",
      script: "server/index.ts", 
      interpreter: "tsx",
      env: { 
        NODE_ENV: "production",
        ARBITRAGE_ENABLED: "true",
        PORT: "3000",
        HOST: "0.0.0.0"
      },
      env_production: {
        NODE_ENV: "production",
        ARBITRAGE_ENABLED: "true", 
        PORT: "3000",
        HOST: "0.0.0.0",
        JWT_SECRET: "change-this-in-production-with-random-string",
        PROXY_ENABLED: "false"
      },
      max_restarts: 15,
      restart_delay: 4000,
      min_uptime: "10s",
      max_memory_restart: "2G",
      error_file: "./logs/adk-multiuser-err.log",
      out_file: "./logs/adk-multiuser-out.log", 
      log_file: "./logs/adk-multiuser-combined.log",
      time: true,
      autorestart: true,
      watch: false,
      // Para VPS deployment
      instances: 1,
      exec_mode: "fork"
    }
  ],
  // Configuração de deployment
  deploy: {
    production: {
      user: 'root',
      host: '138.68.255.204',
      ref: 'origin/main',
      repo: 'git@github.com:user/adk-arbitragem.git',
      path: '/opt/adk-arbitragem',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /opt/adk-arbitragem/logs'
    }
  }
};