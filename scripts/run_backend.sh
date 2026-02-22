#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Start Backend (Go)
# ==================================================================
# Usage:
#   ./scripts/run_backend.sh
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

bold "Starting Go Backend..."
bold "═══════════════════════════════════════════════"

cd "$ROOT_DIR/backend"

if ! command -v go &>/dev/null; then
    red "✗ Go is not installed."
    exit 1
fi

# Check .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Copying .env.example → .env"
        cp .env.example .env
    else
        red "✗ No .env file found. Create backend/.env first."
        exit 1
    fi
fi

echo "Running: go run ./cmd/api/"
echo ""

# Fail fast if the port is already taken (common when an old backend is still running).
if command -v lsof &>/dev/null; then
    PIDS="$(lsof -ti tcp:8080 -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$PIDS" ]; then
        red "✗ Port 8080 is already in use."
        echo "Listening PID(s):"; echo "$PIDS" | sed 's/^/  - /'
        echo "Stop them with: kill <pid>  (or: kill -9 <pid>)"
        exit 1
    fi
fi

exec go run ./cmd/api/
