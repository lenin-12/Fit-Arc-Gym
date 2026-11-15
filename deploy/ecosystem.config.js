/**
 * PM2 Ecosystem Configuration for Fit-Arc-Gym Backend
 *
 * This file lives at /var/www/fit-arc-gym/current/ecosystem.config.js
 * The "current" symlink always points to the active release directory.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload fit-arc-gym          # zero-downtime reload
 *   pm2 restart fit-arc-gym         # hard restart
 *   pm2 save                        # persist process list across reboots
 *   pm2 startup                     # generate systemd unit (run once, as root)
 */
module.exports = {
  apps: [
    {
      name: 'fit-arc-gym',

      // script path is relative to cwd
      script: 'server.js',

      // cwd is the symlinked "current" release directory
      cwd: '/var/www/fit-arc-gym/current',

      // Load env from the shared .env (never committed to the repo)
      // PM2's env_file support requires PM2 ≥ 5.3; as a fallback the
      // bootstrap script sources it and passes vars through env_production.
      env_file: '/var/www/fit-arc-gym/shared/.env',

      // Production environment variables (non-secret defaults only)
      // Secrets come from env_file above.
      env_production: {
        NODE_ENV: 'production',
        PORT: '5001',
        HOST: '127.0.0.1'          // bind only to loopback; Nginx proxies externally
      },

      // Start with production environment
      env: {
        NODE_ENV: 'production',
        PORT: '5001',
        HOST: '127.0.0.1'
      },

      // Process management
      instances: 1,                 // single instance; use 'max' for cluster mode if needed
      exec_mode: 'fork',            // 'cluster' for multi-core scaling

      // Restart policy
      autorestart: true,
      watch: false,                 // never watch in production
      max_memory_restart: '512M',

      // Logging
      out_file: '/var/log/pm2/fit-arc-gym-out.log',
      error_file: '/var/log/pm2/fit-arc-gym-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown: wait up to 10s for in-flight requests
      kill_timeout: 10000,
      listen_timeout: 5000
    }
  ]
};
