module.exports = {
  apps: [
    {
      name: "adk-arbitragem",
      script: "server/index.ts", 
      interpreter: "tsx",
      env: { 
        NODE_ENV: "production",
        ARBITRAGE_ENABLED: "true"
      },
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "./logs/adk-err.log",
      out_file: "./logs/adk-out.log",
      log_file: "./logs/adk-combined.log",
      time: true,
      autorestart: true,
      watch: false
    }
  ]
};