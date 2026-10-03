#!/usr/bin/env bash
# ==============================================================================
# FloodTrace Dependency Installer
# Installs Python packages, Node.js, Docker, and utilities on Debian/Ubuntu/macOS.
# ==============================================================================

set -euo pipefail

OS="$(uname -s)"
echo "Detected Operating System: ${OS}"

if [[ "${OS}" == "Linux" ]]; then
    if command -v apt-get >/dev/null 2>&1; then
        echo "Installing Linux dependencies via apt..."
        sudo apt-get update -q
        sudo apt-get install -y -q curl jq git python3 python3-pip python3-venv
    fi
elif [[ "${OS}" == "Darwin" ]]; then
    if command -v brew >/dev/null 2>&1; then
        echo "Installing macOS dependencies via Homebrew..."
        brew install jq curl git
    fi
fi

# Ensure Python Virtual Environment
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ ! -d "${ROOT_DIR}/.venv" ]]; then
    echo "Creating Python virtual environment in ${ROOT_DIR}/.venv..."
    python3 -m venv "${ROOT_DIR}/.venv"
fi

echo "Installing Python dependencies..."
"${ROOT_DIR}/.venv/bin/pip" install --upgrade pip
"${ROOT_DIR}/.venv/bin/pip" install -r "${ROOT_DIR}/apps/api/requirements.txt"

echo "✓ Dependencies installed successfully."
