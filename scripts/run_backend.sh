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
exec go run ./cmd/api/
