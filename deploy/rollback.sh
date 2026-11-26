#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Revert to the previous release of Fit-Arc-Gym backend
# =============================================================================
# Usage:
#   bash rollback.sh                  # rolls back to previously saved release
#   bash rollback.sh <git-sha>        # rolls back to a specific release
#
# This script is called automatically by deploy-backend.sh if the health check
# fails. It can also be invoked manually from the EC2 instance or via SSM.
#
# SSM invocation:
#   aws ssm send-command \
#     --instance-ids i-XXXXXXXXXXXXXXXXX \
#     --document-name "AWS-RunShellScript" \
#     --parameters 'commands=["bash /var/www/fit-arc-gym/current/deploy/rollback.sh"]'
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/fit-arc-gym}"
APP_USER="${APP_USER:-ubuntu}"
APP_PORT="${APP_PORT:-5001}"
CURRENT_LINK="${APP_DIR}/current"
PREVIOUS_FILE="${APP_DIR}/.previous_release"

echo "=== [rollback] Starting rollback ==="

# ─── Determine target release ────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
    TARGET_RELEASE="${APP_DIR}/releases/${1}"
    echo "  Rolling back to specified release: ${TARGET_RELEASE}"
elif [[ -f "${PREVIOUS_FILE}" ]]; then
    TARGET_RELEASE=$(cat "${PREVIOUS_FILE}")
    echo "  Rolling back to previous release: ${TARGET_RELEASE}"
else
    # Fall back to second-newest release directory
    TARGET_RELEASE=$(ls -1dt "${APP_DIR}/releases"/*/ 2>/dev/null | sed -n '2p' | sed 's|/$||')
    echo "  No .previous_release file found. Rolling back to: ${TARGET_RELEASE}"
fi

if [[ -z "${TARGET_RELEASE}" ]] || [[ ! -d "${TARGET_RELEASE}" ]]; then
    echo "ERROR: Rollback target '${TARGET_RELEASE}' does not exist or is not a directory."
    echo "  Available releases:"
    ls -1t "${APP_DIR}/releases" || true
    exit 1
fi

# ─── Switch symlink ───────────────────────────────────────────────────────────
echo "=== [rollback] Switching current to ${TARGET_RELEASE} ==="
ln -sfn "${TARGET_RELEASE}" "${CURRENT_LINK}"

# ─── Reload PM2 ──────────────────────────────────────────────────────────────
echo "=== [rollback] Reloading PM2 ==="
cd "${CURRENT_LINK}"
if sudo -u "${APP_USER}" pm2 describe fit-arc-gym > /dev/null 2>&1; then
    sudo -u "${APP_USER}" pm2 reload fit-arc-gym
else
    sudo -u "${APP_USER}" pm2 start deploy/ecosystem.config.js --env production
fi
sudo -u "${APP_USER}" pm2 save

# ─── Health check ────────────────────────────────────────────────────────────
echo "=== [rollback] Verifying health after rollback ==="
sleep 3
for i in 1 2 3 4 5; do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || echo "000")
    if [[ "${HTTP_CODE}" == "200" ]]; then
        echo "=== [rollback] Health check PASSED — rollback successful ==="
        echo "  Active release: $(readlink -f ${CURRENT_LINK})"
        exit 0
    fi
    echo "  Attempt ${i}/5: HTTP ${HTTP_CODE} — waiting 3s..."
    sleep 3
done

echo "ERROR: Health check FAILED after rollback. Manual intervention required."
echo "  Check pm2 logs:   pm2 logs fit-arc-gym"
echo "  Check nginx logs: tail -50 /var/log/nginx/fit-arc-gym-error.log"
echo "  List releases:    ls -lt ${APP_DIR}/releases"
exit 1
