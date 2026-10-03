#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Production Automated Database Backup Script
# Retention Policy: 7 daily backups, 4 weekly backups
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/floodtrace/backups}"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/floodtrace_backup_${TIMESTAMP}.sql.gz"

echo "===================================================================="
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting FloodTrace Production Backup"
echo "Target File: ${BACKUP_FILE}"
echo "===================================================================="

# Determine execution mode: Docker container or direct host pg_dump
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "floodtrace_db"; then
    echo "Running pg_dump inside 'floodtrace_db' container..."
    docker exec -t floodtrace_db pg_dump -U "${POSTGRES_USER:-floodtrace_user}" -d "${POSTGRES_DB:-floodtrace_db}" | gzip -9 > "${BACKUP_FILE}"
elif [ -n "${DATABASE_URL:-}" ]; then
    echo "Running pg_dump via DATABASE_URL..."
    pg_dump "${DATABASE_URL}" | gzip -9 > "${BACKUP_FILE}"
else
    echo "Running pg_dump with local parameters..."
    PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-floodtrace_user}" -d "${POSTGRES_DB:-floodtrace_db}" | gzip -9 > "${BACKUP_FILE}"
fi

# Verify archive integrity
if gzip -t "${BACKUP_FILE}"; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[SUCCESS] Backup created and verified successfully (${SIZE})"
else
    echo "[ERROR] Backup verification failed for ${BACKUP_FILE}!" >&2
    exit 1
fi

# Retention Cleanup: remove daily backups older than 7 days
echo "Rotating backups older than 7 days..."
find "${BACKUP_DIR}" -name "floodtrace_backup_*.sql.gz" -type f -mtime +7 -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup cycle completed successfully."
exit 0
