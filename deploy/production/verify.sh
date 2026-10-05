#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export RUWAIGON_API_URL="${RUWAIGON_API_URL:-${FLOODTRACE_API_URL:-http://127.0.0.1:8001}}"

exec python3 "${ROOT_DIR}/scripts/verify_all_sources.py"
