#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Start WhatsApp Bot (Baileys / QR scan)
# ==================================================================
# Usage:
#   ./scripts/run_whatsapp_bot.sh
#   WHATSAPP_BOT_PORT=3100 ./scripts/run_whatsapp_bot.sh
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

PORT="${WHATSAPP_BOT_PORT:-3100}"

bold "Starting WhatsApp bot..."
bold "═══════════════════════════════════════════════"

cd "$ROOT_DIR/whatsapp_bot"

# Best-effort defaults so inbound messages can appear in the dashboard Activities.
# You can override these by exporting env vars before running this script.
export WHATSAPP_BOT_PORT="$PORT"
export WHATSAPP_BACKEND_URL="${WHATSAPP_BACKEND_URL:-http://localhost:8080}"
if [ -z "${WHATSAPP_BACKEND_API_KEY:-}" ] && [ -n "${API_KEY:-}" ]; then
  export WHATSAPP_BACKEND_API_KEY="$API_KEY"
fi

if ! command -v node &>/dev/null; then
  red "✗ Node.js is not installed."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  red "✗ npm is not installed."
  exit 1
fi

if [ ! -d node_modules ]; then
  bold "Installing WhatsApp bot dependencies (npm install)..."
  npm install
fi

green "WhatsApp bot listening on: http://localhost:${PORT}"

echo "Backend forwarding: ${WHATSAPP_BACKEND_URL}"
if [ -n "${WHATSAPP_BACKEND_API_KEY:-}" ]; then
  echo "Backend API key: set"
else
  echo "Backend API key: NOT set (inbound won't show in dashboard)"
fi

echo "Running: npm run dev"
echo ""
exec npm run dev
