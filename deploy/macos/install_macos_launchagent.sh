#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd "$DIR/../.." && pwd)"
PLIST_NAME="com.floodtrace.tunnel.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "=================================================================="
echo "Installing FloodTrace 24/7 Full Stack LaunchAgents on macOS"
echo "=================================================================="

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$WORKSPACE/logs"

SERVICES=("com.floodtrace.api" "com.floodtrace.web" "com.floodtrace.tunnel")

for SVC in "${SERVICES[@]}"; do
    PLIST_FILE="$DIR/$SVC.plist"
    TARGET="$HOME/Library/LaunchAgents/$SVC.plist"
    if [ -f "$PLIST_FILE" ]; then
        echo "Updating $SVC..."
        launchctl unload "$TARGET" 2>/dev/null || true
        cp "$PLIST_FILE" "$TARGET"
        launchctl load -w "$TARGET"
    fi
done

echo "=================================================================="
echo "All FloodTrace Services installed and active 24/7:"
echo "  1. Backend API (FastAPI)     -> http://localhost:8000"
echo "  2. Frontend Web (Vite React) -> http://localhost:5173"
echo "  3. Permanent Static Tunnel   -> https://pogo-wistful-managing.ngrok-free.dev"
echo "=================================================================="
