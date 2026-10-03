#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Production Zero-Downtime / Low-Downtime Update Script
# Creates a pre-update backup, pulls code, rebuilds containers, and verifies health.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================================"
echo "FLOODTRACE PRODUCTION SAFE UPDATE"
echo "================================================================================"

ENV_FILE="${ROOT_DIR}/.env.production"
if [[ ! -f "${ENV_FILE}" ]]; then
    ENV_FILE="${ROOT_DIR}/.env"
fi

# 1. Automated Pre-Update Database Backup
echo "Step 1: Performing pre-update database snapshot..."
if [[ -f "${ROOT_DIR}/scripts/backup_production.sh" ]]; then
    bash "${ROOT_DIR}/scripts/backup_production.sh" || {
        echo "⚠️  WARNING: Pre-update backup failed. Abort update to prevent data risk? (Ctrl+C to abort, waiting 5s)"
        sleep 5
    }
fi

# 2. Pull Git Updates (If on a git branch)
if [[ -d "${ROOT_DIR}/.git" ]]; then
    echo "Step 2: Checking git repository updates..."
    CURRENT_BRANCH=$(git -C "${ROOT_DIR}" rev-parse --abbrev-ref HEAD)
    echo "Current branch: ${CURRENT_BRANCH}"
    # Optional pull if remote configured
    if git -C "${ROOT_DIR}" remote get-url origin >/dev/null 2>&1; then
        git -C "${ROOT_DIR}" pull origin "${CURRENT_BRANCH}" || echo "Git pull skipped or failed, proceeding with local working tree."
    fi
fi

# 3. Trigger Deployment
echo "Step 3: Building and refreshing production services..."
bash "${SCRIPT_DIR}/deploy.sh" "$@"

echo "✓ Update complete."
