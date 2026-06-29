module.exports = {
  apps: [
    {
      name: 'nyc-backend',
      script: 'dist/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'nyc-frontend',
      script: 'npm',
      args: 'run start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
