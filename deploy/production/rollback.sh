#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Production Rollback Script
# Safely rolls back code and restores the database from a verified backup snapshot.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================================"
echo "FLOODTRACE PRODUCTION DISASTER ROLLBACK"
echo "================================================================================"

ENV_FILE="${ROOT_DIR}/.env.production"
if [[ ! -f "${ENV_FILE}" ]]; then
    ENV_FILE="${ROOT_DIR}/.env"
fi

# 1. Locate Backups
BACKUP_DIR="${ROOT_DIR}/backups"
if [[ ! -d "${BACKUP_DIR}" ]]; then
    echo "❌ ERROR: Backup directory ${BACKUP_DIR} not found."
    exit 1
fi

LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/floodtrace_*.dump 2>/dev/null | head -n 1 || true)
if [[ -z "${LATEST_BACKUP}" ]]; then
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/floodtrace_*.sql* 2>/dev/null | head -n 1 || true)
fi

TARGET_BACKUP="${1:-${LATEST_BACKUP}}"

if [[ -z "${TARGET_BACKUP}" || ! -f "${TARGET_BACKUP}" ]]; then
    echo "❌ ERROR: No valid backup snapshot file found to restore from."
    echo "Available files in ${BACKUP_DIR}:"
    ls -lh "${BACKUP_DIR}"
    exit 1
fi

echo "Selected recovery snapshot: ${TARGET_BACKUP}"
read -p "Are you sure you want to rollback and overwrite current database data? (yes/no): " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Rollback aborted by user."
    exit 0
fi

# 2. Revert Git Commit / Tag if specified
if [[ $# -ge 2 ]]; then
    TARGET_COMMIT="$2"
    echo "Reverting git repository to: ${TARGET_COMMIT}..."
    git -C "${ROOT_DIR}" checkout "${TARGET_COMMIT}"
fi

# 3. Stop App Services (Leaving DB running for restore)
echo "Pausing API and Web services..."
docker compose --env-file "${ENV_FILE}" -f "${SCRIPT_DIR}/docker-compose.prod.yml" stop api web 2>/dev/null || true

# 4. Restore Database Snapshot
echo "Restoring database from snapshot..."
DB_CONTAINER=$(docker compose --env-file "${ENV_FILE}" -f "${SCRIPT_DIR}/docker-compose.prod.yml" ps -q db 2>/dev/null || true)

if [[ -n "${DB_CONTAINER}" ]]; then
    # Docker restore
    docker cp "${TARGET_BACKUP}" "${DB_CONTAINER}:/tmp/restore.dump"
    docker exec "${DB_CONTAINER}" sh -c "pg_restore --clean --if-exists -U floodtrace_user -d floodtrace_db /tmp/restore.dump || pg_restore -U floodtrace_user -d floodtrace_db /tmp/restore.dump"
    docker exec "${DB_CONTAINER}" rm -f /tmp/restore.dump
else
    # Local host restore
    pg_restore --clean --if-exists -d floodtrace_db "${TARGET_BACKUP}" || pg_restore -d floodtrace_db "${TARGET_BACKUP}"
fi

# 5. Restart Services
echo "Restarting services..."
bash "${SCRIPT_DIR}/deploy.sh"

echo "✓ Rollback completed successfully."
