#!/usr/bin/env bash
# =============================================================================
# deploy-backend.sh — Release-based backend deployment for Fit-Arc-Gym
# =============================================================================
# This script is uploaded to S3 alongside the tarball on every deploy, then
# downloaded to /var/www/fit-arc-gym/shared/ and executed via SSM Run Command.
# This guarantees the script on the instance is always current.
#
# Release layout (AFTER fix — backend files are at the archive root):
#   /var/www/fit-arc-gym/
#     releases/<git-sha>/          ← extracted release
#       package.json               ← directly at root (not under backend/)
#       server.js
#       app.js
#       deploy/                    ← deploy scripts inside the release
#         ecosystem.config.js
#         rollback.sh
#         nginx.conf
#       uploads -> ../../shared/uploads  ← symlink
#       .env -> ../../shared/.env        ← symlink (new)
#     shared/
#       .env                       ← secrets, never in the repo
#       uploads/                   ← persisted across releases
#       rollback.sh                ← stable copy, refreshed every deploy
#     current -> releases/<sha>    ← active release symlink
#
# Usage (called by CD pipeline via SSM):
#   deploy-backend.sh <GIT_SHA> <S3_BUCKET> <S3_PREFIX>
#
# Environment variables (optional overrides):
#   APP_DIR        — default /var/www/fit-arc-gym
#   APP_USER       — default ubuntu
#   APP_PORT       — default 5001
#   KEEP_RELEASES  — number of releases to keep (default 5)
# =============================================================================
set -euo pipefail

# ─── Arguments ───────────────────────────────────────────────────────────────
GIT_SHA="${1:?Usage: deploy-backend.sh <GIT_SHA> <S3_BUCKET> <S3_PREFIX>}"
S3_BUCKET="${2:?Usage: deploy-backend.sh <GIT_SHA> <S3_BUCKET> <S3_PREFIX>}"
S3_PREFIX="${3:-deploy/releases}"

# ─── Config ──────────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/var/www/fit-arc-gym}"
APP_USER="${APP_USER:-ubuntu}"
APP_PORT="${APP_PORT:-5001}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
RELEASE_DIR="${APP_DIR}/releases/${GIT_SHA}"
SHARED_DIR="${APP_DIR}/shared"
CURRENT_LINK="${APP_DIR}/current"
ARTIFACT_NAME="backend-${GIT_SHA}.tar.gz"
ARTIFACT_LOCAL="/tmp/${ARTIFACT_NAME}"

echo "=== [deploy] Starting deployment of ${GIT_SHA} ==="

# ─── Safety: shared .env must exist ──────────────────────────────────────────
if [[ ! -f "${SHARED_DIR}/.env" ]]; then
    echo "ERROR: ${SHARED_DIR}/.env not found."
    echo "  Create it before deploying (see ec2-bootstrap.sh for required variables)."
    exit 1
fi

# ─── 1. Download release artifact from S3 ────────────────────────────────────
echo "=== [deploy] Downloading artifact from s3://${S3_BUCKET}/${S3_PREFIX}/${ARTIFACT_NAME} ==="
aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${ARTIFACT_NAME}" "${ARTIFACT_LOCAL}"

# ─── 2. Create release directory and extract ─────────────────────────────────
echo "=== [deploy] Extracting to ${RELEASE_DIR} ==="
mkdir -p "${RELEASE_DIR}"
# Archive root IS the backend; deploy/ is a subfolder inside it.
tar -xzf "${ARTIFACT_LOCAL}" -C "${RELEASE_DIR}"
rm -f "${ARTIFACT_LOCAL}"

# ─── 3. Symlink shared .env into the release ─────────────────────────────────
# dotenv.config() reads .env from process.cwd() (the release dir).
# A symlink ensures secrets are sourced from shared/ without being copied.
echo "=== [deploy] Symlinking shared/.env into release ==="
ln -sfn "${SHARED_DIR}/.env" "${RELEASE_DIR}/.env"

# ─── 4. Symlink shared uploads into the release ──────────────────────────────
echo "=== [deploy] Symlinking shared/uploads ==="
rm -rf "${RELEASE_DIR}/uploads"
ln -sfn "${SHARED_DIR}/uploads" "${RELEASE_DIR}/uploads"

# ─── 5. Install production dependencies ──────────────────────────────────────
echo "=== [deploy] Installing production dependencies ==="
cd "${RELEASE_DIR}"
npm ci --omit=dev --prefer-offline

# ─── 6. Copy rollback.sh to a stable shared path ─────────────────────────────
# This must happen BEFORE the symlink switch so rollback is always reachable
# even if the release itself is later removed.
echo "=== [deploy] Refreshing shared/rollback.sh ==="
cp "${RELEASE_DIR}/deploy/rollback.sh" "${SHARED_DIR}/rollback.sh"
chmod +x "${SHARED_DIR}/rollback.sh"

# ─── 7. Install Nginx config (idempotent) ────────────────────────────────────
echo "=== [deploy] Installing Nginx config ==="
if [[ -f "${RELEASE_DIR}/deploy/nginx.conf" ]]; then
    cp "${RELEASE_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/fit-arc-gym
    ln -sf /etc/nginx/sites-available/fit-arc-gym /etc/nginx/sites-enabled/fit-arc-gym
    nginx -t && systemctl reload nginx
fi

# ─── 8. Atomically switch the current symlink ────────────────────────────────
echo "=== [deploy] Switching current symlink to ${RELEASE_DIR} ==="
# Save the previous release for potential rollback
PREVIOUS_RELEASE=""
if [[ -L "${CURRENT_LINK}" ]]; then
    PREVIOUS_RELEASE=$(readlink "${CURRENT_LINK}")
fi
# ln -sfn is atomic on Linux (single syscall rename)
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
echo "${PREVIOUS_RELEASE}" > "${APP_DIR}/.previous_release"

# ─── Rollback trap: fires only AFTER the symlink was switched ─────────────────
# SWITCHED is set immediately after the ln above.  If any subsequent step
# fails (PM2 reload, health check), the ERR trap calls rollback.sh and exits 1.
SWITCHED=1

_rollback_on_error() {
    echo "=== [deploy] ERROR detected after symlink switch — triggering auto-rollback ==="
    bash "${SHARED_DIR}/rollback.sh" || true
    exit 1
}
trap '_rollback_on_error' ERR

# ─── 9. Reload PM2 (zero-downtime) ───────────────────────────────────────────
echo "=== [deploy] Reloading PM2 ==="
# ecosystem.config.js is now at deploy/ecosystem.config.js inside the release
cd "${CURRENT_LINK}"
if sudo -u "${APP_USER}" pm2 describe fit-arc-gym > /dev/null 2>&1; then
    sudo -u "${APP_USER}" pm2 reload fit-arc-gym
else
    sudo -u "${APP_USER}" pm2 start deploy/ecosystem.config.js --env production
fi
sudo -u "${APP_USER}" pm2 save

# ─── 10. Health check — process alive ─────────────────────────────────────────
echo "=== [deploy] Checking process health at http://127.0.0.1:${APP_PORT}/api/health ==="
sleep 3
MAX_RETRIES=10
HEALTH_OK=0
for i in $(seq 1 ${MAX_RETRIES}); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || echo "000")
    if [[ "${HTTP_CODE}" == "200" ]]; then
        echo "=== [deploy] Process health check PASSED (HTTP ${HTTP_CODE}) ==="
        HEALTH_OK=1
        break
    fi
    echo "  Attempt ${i}/${MAX_RETRIES}: HTTP ${HTTP_CODE} — waiting 3s..."
    sleep 3
done

if [[ "${HEALTH_OK}" -eq 0 ]]; then
    echo "ERROR: Process health check FAILED after ${MAX_RETRIES} attempts."
    # ERR trap handles rollback
    exit 1
fi

# ─── 11. Health check — database connectivity ─────────────────────────────────
echo "=== [deploy] Checking DB health at http://127.0.0.1:${APP_PORT}/api/health/db ==="
DB_HEALTH_OK=0
for i in $(seq 1 10); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health/db" 2>/dev/null || echo "000")
    if [[ "${HTTP_CODE}" == "200" ]]; then
        echo "=== [deploy] DB health check PASSED (HTTP ${HTTP_CODE}) ==="
        DB_HEALTH_OK=1
        break
    fi
    echo "  Attempt ${i}/10: DB health HTTP ${HTTP_CODE} — waiting 3s..."
    sleep 3
done

if [[ "${DB_HEALTH_OK}" -eq 0 ]]; then
    echo "ERROR: DB health check FAILED after 10 attempts — MongoDB may be unreachable."
    echo "  Verify MONGO_URI in ${SHARED_DIR}/.env"
    echo "  Verify MongoDB Atlas network access includes the EC2 public IP."
    # ERR trap handles rollback
    exit 1
fi

# Disarm the rollback trap — deployment succeeded
trap - ERR

# ─── 12. Prune old releases (keep last N) ────────────────────────────────────
echo "=== [deploy] Pruning old releases (keeping ${KEEP_RELEASES}) ==="
ls -1t "${APP_DIR}/releases" | tail -n "+$((KEEP_RELEASES + 1))" | while read -r old; do
    echo "  Removing old release: ${old}"
    rm -rf "${APP_DIR}/releases/${old}"
done

echo "=== [deploy] Deployment of ${GIT_SHA} COMPLETE ==="
