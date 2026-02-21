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

echo "Running: npm run dev"
echo ""
exec npm run dev
