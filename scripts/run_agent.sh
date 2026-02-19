#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Start Agent (Python)
# ==================================================================
# Usage:
#   ./scripts/run_agent.sh
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

bold "Starting Python Agent..."
bold "═══════════════════════════════════════════════"

cd "$ROOT_DIR/agent"

# Find the Python venv
VENV=""
if [ -f "$ROOT_DIR/agent/.venv/bin/python" ]; then
    VENV="$ROOT_DIR/agent/.venv/bin"
elif [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    VENV="$ROOT_DIR/.venv/bin"
fi

if [ -z "$VENV" ]; then
    red "✗ Python venv not found."
    echo "  Create it first:"
    echo "    cd agent && python3.12 -m venv .venv"
    echo "    .venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Check .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Copying .env.example → .env"
        cp .env.example .env
    else
        yellow "⚠ No .env file found. Agent may not start correctly."
    fi
fi

UVICORN="$VENV/uvicorn"
if [ ! -f "$UVICORN" ]; then
    red "✗ uvicorn not found in venv."
    echo "  Install it: $VENV/pip install -r requirements.txt"
    exit 1
fi

echo "Running: uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
exec "$UVICORN" app.main:app --host 0.0.0.0 --port 8000
