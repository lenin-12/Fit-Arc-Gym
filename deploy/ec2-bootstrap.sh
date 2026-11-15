#!/usr/bin/env bash
# =============================================================================
# ec2-bootstrap.sh — Idempotent EC2 instance bootstrap for Fit-Arc-Gym
# =============================================================================
# Run once (or re-run safely) on a fresh Ubuntu 22.04/24.04 EC2 instance.
# This script does NOT deploy application code — see deploy-backend.sh for that.
#
# What it installs / configures:
#   - System updates
#   - Node.js 22 (via NodeSource)
#   - PM2 (global, with systemd startup)
#   - Nginx
#   - Directory structure: /var/www/fit-arc-gym/{releases,shared,shared/uploads}
#   - PM2 log directory: /var/log/pm2
#   - Nginx site config (copied from repo)
#   - Nginx enabled + reloaded
#
# Prerequisites:
#   - Instance has SSM Agent installed (comes pre-installed on Amazon Linux & Ubuntu AMIs)
#   - Instance has an IAM role with AmazonSSMManagedInstanceCore policy
#   - EC2 Security Group allows port 80 from CloudFront managed prefix list only
#   - No SSH (port 22) open
#
# Run via SSM:
#   aws ssm send-command \
#     --instance-ids i-XXXXXXXXXXXXXXXXX \
#     --document-name "AWS-RunShellScript" \
#     --parameters 'commands=["bash /tmp/ec2-bootstrap.sh"]'
#
# Or simply paste into EC2 User Data for first launch.
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/fit-arc-gym"
SHARED_DIR="${APP_DIR}/shared"
LOG_DIR="/var/log/pm2"
APP_USER="ubuntu"   # Change to your EC2 instance's default user if different

echo "=== [bootstrap] Starting Fit-Arc-Gym EC2 bootstrap ==="

# ─── 1. System update ────────────────────────────────────────────────────────
echo "=== [bootstrap] Updating system packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y --no-install-recommends

# ─── 2. Install Node.js 22 via NodeSource ────────────────────────────────────
echo "=== [bootstrap] Installing Node.js 22 ==="
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(\".\")[0].slice(1))')" -lt 22 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js $(node --version) already installed — skipping"
fi
node --version
npm --version

# ─── 3. Install PM2 globally ─────────────────────────────────────────────────
echo "=== [bootstrap] Installing PM2 ==="
if ! command -v pm2 &>/dev/null; then
    npm install -g pm2@latest
else
    echo "PM2 $(pm2 --version) already installed — skipping"
fi

# ─── 4. Install Nginx ────────────────────────────────────────────────────────
echo "=== [bootstrap] Installing Nginx ==="
if ! command -v nginx &>/dev/null; then
    apt-get install -y nginx
else
    echo "Nginx $(nginx -v 2>&1) already installed — skipping"
fi

# ─── 5. Create directory structure ───────────────────────────────────────────
echo "=== [bootstrap] Creating application directories ==="
mkdir -p "${APP_DIR}/releases"
mkdir -p "${SHARED_DIR}/uploads"
mkdir -p "${LOG_DIR}"

# Set ownership
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${LOG_DIR}"

echo ""
echo "=== [bootstrap] IMPORTANT: Create the shared .env file before first deploy ==="
echo "    sudo -u ${APP_USER} nano ${SHARED_DIR}/.env"
echo ""
echo "    Required variables:"
echo "      PORT=5001"
echo "      HOST=127.0.0.1"
echo "      NODE_ENV=production"
echo "      MONGO_URI=<your-atlas-connection-string>"
echo "      JWT_SECRET=<strong-random-secret>"
echo "      JWT_EXPIRES_IN=7d"
echo "      OPENAI_API_KEY=<your-openai-key>"
echo "      OPENAI_MODEL=gpt-4o"
echo "      CLOUDINARY_CLOUD_NAME=<name>"
echo "      CLOUDINARY_API_KEY=<key>"
echo "      CLOUDINARY_API_SECRET=<secret>"
echo "      CORS_ORIGIN=https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"
echo ""

# ─── 6. Configure Nginx ──────────────────────────────────────────────────────
echo "=== [bootstrap] Configuring Nginx ==="
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Install our site config (this file is placed here by deploy-backend.sh too)
# During bootstrap, install from /tmp if already uploaded
NGINX_CONF_SRC="/tmp/nginx.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/fit-arc-gym"

if [[ -f "${NGINX_CONF_SRC}" ]]; then
    cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DST}"
    echo "Nginx config installed from ${NGINX_CONF_SRC}"
else
    echo "WARNING: ${NGINX_CONF_SRC} not found — nginx config not installed yet."
    echo "  Upload deploy/nginx.conf to the instance and run:"
    echo "  sudo cp /tmp/nginx.conf ${NGINX_CONF_DST}"
fi

# Enable the site
if [[ -f "${NGINX_CONF_DST}" ]]; then
    ln -sf "${NGINX_CONF_DST}" /etc/nginx/sites-enabled/fit-arc-gym
    nginx -t && systemctl reload nginx
    echo "Nginx configured and reloaded"
fi

# Enable Nginx on boot
systemctl enable nginx

# ─── 7. Set up PM2 startup (survives reboots) ─────────────────────────────────
echo "=== [bootstrap] Configuring PM2 startup ==="
# Generate the startup command and run it
PM2_STARTUP_CMD=$(sudo -u "${APP_USER}" pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" 2>&1 | tail -1)
if [[ "${PM2_STARTUP_CMD}" == sudo* ]]; then
    eval "${PM2_STARTUP_CMD}"
fi

echo ""
echo "=== [bootstrap] Bootstrap complete! ==="
echo ""
echo "Next steps:"
echo "  1. Create ${SHARED_DIR}/.env  (see above)"
echo "  2. Run deploy-backend.sh to deploy the application code"
echo "  3. Check: systemctl status nginx"
echo "  4. Check: pm2 status"
echo ""
