#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Start Frontend (Next.js)
# ==================================================================
# Usage:
#   ./scripts/run_frontend.sh
#   PORT=3005 ./scripts/run_frontend.sh
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

PORT="${PORT:-3000}"

bold "Starting Frontend (Next.js)..."
bold "═══════════════════════════════════════════════"

cd "$ROOT_DIR/frontend"

if ! command -v node &>/dev/null; then
  red "✗ Node.js is not installed."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  red "✗ npm is not installed."
  exit 1
fi

if [ ! -d node_modules ]; then
  bold "Installing frontend dependencies (npm install)..."
  npm install
fi

green "Frontend URL: http://localhost:${PORT}"
echo "Running: npm run dev -- -p ${PORT}"
echo ""
exec npm run dev -- -p "$PORT"
