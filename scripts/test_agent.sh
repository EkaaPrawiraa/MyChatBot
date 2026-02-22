#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Run Python agent tests only
# ==================================================================
# Usage:
#   ./scripts/test_agent.sh              # all agent tests
#   ./scripts/test_agent.sh -k "TestHealth"  # specific test class
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

bold "Python Agent Tests"
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

PYTHON="$VENV/python"
PIP="$VENV/pip"

# Install test deps if missing
if ! "$PYTHON" -c "import pytest" 2>/dev/null; then
    yellow "Installing pytest + pytest-asyncio..."
    "$PIP" install pytest pytest-asyncio httpx
fi

EXTRA_ARGS="${*:-}"

echo "Running: $PYTHON -m pytest tests/ -v $EXTRA_ARGS"
echo ""

if "$PYTHON" -m pytest tests/ -v $EXTRA_ARGS; then
    echo ""
    green "✓ All agent tests passed!"
else
    echo ""
    red "✗ Some agent tests failed."
    exit 1
fi
