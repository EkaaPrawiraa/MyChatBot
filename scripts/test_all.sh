#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Run ALL tests (Backend + Agent)
# ==================================================================
# Usage:
#   ./scripts/test_all.sh          # run both
#   ./scripts/test_all.sh backend  # run only Go tests
#   ./scripts/test_all.sh agent    # run only Python tests
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

# ------------------------------------------------------------------
run_backend_tests() {
    bold "═══════════════════════════════════════════════"
    bold " Go Backend Tests"
    bold "═══════════════════════════════════════════════"
    echo ""

    cd "$ROOT_DIR/backend"

    if ! command -v go &>/dev/null; then
        red "✗ Go is not installed. Skipping backend tests."
        FAIL=$((FAIL + 1))
        return
    fi

    echo "Running: go test ./... -v -count=1"
    echo ""

    if go test ./... -v -count=1; then
        green "✓ Backend tests PASSED"
        PASS=$((PASS + 1))
    else
        red "✗ Backend tests FAILED"
        FAIL=$((FAIL + 1))
    fi

    echo ""
}

# ------------------------------------------------------------------
run_agent_tests() {
    bold "═══════════════════════════════════════════════"
    bold " Python Agent Tests"
    bold "═══════════════════════════════════════════════"
    echo ""

    cd "$ROOT_DIR/agent"

    # Find the Python venv
    VENV=""
    if [ -f "$ROOT_DIR/agent/.venv/bin/python" ]; then
        VENV="$ROOT_DIR/agent/.venv/bin"
    elif [ -f "$ROOT_DIR/.venv/bin/python" ]; then
        VENV="$ROOT_DIR/.venv/bin"
    fi

    if [ -z "$VENV" ]; then
        red "✗ Python venv not found. Create it first:"
        red "  cd agent && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt"
        FAIL=$((FAIL + 1))
        return
    fi

    PYTHON="$VENV/python"
    PIP="$VENV/pip"

    # Install test deps if missing
    if ! "$PYTHON" -c "import pytest" 2>/dev/null; then
        yellow "Installing pytest + pytest-asyncio..."
        "$PIP" install pytest pytest-asyncio httpx 2>/dev/null
    fi

    echo "Running: $PYTHON -m pytest tests/ -v"
    echo ""

    if "$PYTHON" -m pytest tests/ -v; then
        green "✓ Agent tests PASSED"
        PASS=$((PASS + 1))
    else
        red "✗ Agent tests FAILED"
        FAIL=$((FAIL + 1))
    fi

    echo ""
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

bold ""
bold "╔═══════════════════════════════════════════════╗"
bold "║     Axis Assistant — Test Runner              ║"
bold "╚═══════════════════════════════════════════════╝"
echo ""

TARGET="${1:-all}"

case "$TARGET" in
    backend)
        run_backend_tests
        ;;
    agent)
        run_agent_tests
        ;;
    all|"")
        run_backend_tests
        run_agent_tests
        ;;
    *)
        red "Unknown target: $TARGET"
        echo "Usage: $0 [backend|agent|all]"
        exit 1
        ;;
esac

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------

bold "═══════════════════════════════════════════════"
bold " Summary"
bold "═══════════════════════════════════════════════"

green "  Passed: $PASS"
if [ "$FAIL" -gt 0 ]; then
    red "  Failed: $FAIL"
    exit 1
else
    red "  Failed: $FAIL"
    echo ""
    green "All test suites passed! ✓"
fi
