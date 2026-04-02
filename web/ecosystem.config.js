module.exports = {
  apps: [
    {
      name: 'cercafungo',
      script: 'node_modules/.bin/next',
      args: 'start -p 3012',
      cwd: '/var/www/cercafungo',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
