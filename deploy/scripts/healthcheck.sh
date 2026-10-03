#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Container & Process Healthcheck Probe
# Returns exit code 0 when healthy, 1 when unhealthy.
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-http://localhost:8001/health}"
TIMEOUT_SEC="${2:-5}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT_SEC}" "${TARGET_URL}" 2>/dev/null || echo "000")

if [[ "${HTTP_CODE}" == "200" ]]; then
    exit 0
else
    echo "Healthcheck failed for ${TARGET_URL} (HTTP status: ${HTTP_CODE})" >&2
    exit 1
fi
