#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Production Deployment Script
# Orchestrates container building, dependency verification, startup, and healthchecks.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================================"
echo "FLOODTRACE PRODUCTION DEPLOYMENT"
echo "Target Root: ${ROOT_DIR}"
echo "================================================================================"

# 1. Verify Prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ ERROR: docker is not installed. Aborting."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ ERROR: docker compose is not available. Aborting."; exit 1; }

# 2. Verify Production Environment Configuration
ENV_FILE="${ROOT_DIR}/.env.production"
if [[ ! -f "${ENV_FILE}" ]]; then
    if [[ -f "${ROOT_DIR}/.env" ]]; then
        ENV_FILE="${ROOT_DIR}/.env"
        echo "ℹ️  Using .env configuration file."
    else
        echo "❌ ERROR: Neither .env.production nor .env found."
        echo "Please copy deploy/production/.env.production.example to .env.production and configure real production secrets."
        exit 1
    fi
fi

echo "✓ Found environment configuration: ${ENV_FILE}"

# 3. Validate Configuration Secrets
if command -v python3 >/dev/null 2>&1; then
    echo "Running production configuration validator..."
    python3 "${ROOT_DIR}/scripts/validate_production_config.py" --env-file "${ENV_FILE}" || {
        echo "❌ ERROR: Production configuration validation failed. Resolve blockers before deploying."
        exit 1
    }
fi

# 4. Determine Stack (SSL with Caddy vs. Standard Port 80 for Cloudflare Tunnel)
USE_SSL=false
if grep -q "ENABLE_SSL=true" "${ENV_FILE}" 2>/dev/null || [[ "${1:-}" == "--ssl" ]]; then
    USE_SSL=true
    COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.ssl.yml"
    echo "Mode: Production with Caddy Automated SSL (${COMPOSE_FILE})"
else
    COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
    echo "Mode: Production Web Port 80 / Cloudflare Named Tunnel (${COMPOSE_FILE})"
fi

# 5. Build and Launch Containers
echo "Building and launching containers..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "Waiting for services to become healthy (30s)..."
sleep 10

# 6. Verify System Health
echo "Executing deployment verification..."
"${SCRIPT_DIR}/verify.sh"
