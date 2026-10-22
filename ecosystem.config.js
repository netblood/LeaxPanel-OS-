module.exports = {
  apps: [
    {
      name: 'leaxpanel',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      time: true
    }
  ]
};