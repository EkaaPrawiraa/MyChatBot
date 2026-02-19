#!/usr/bin/env bash
# ==================================================================
# Axis Assistant — Run Go backend tests only
# ==================================================================
# Usage:
#   ./scripts/test_backend.sh            # all backend tests
#   ./scripts/test_backend.sh -run TestHealth  # specific test
# ==================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

bold "Go Backend Tests"
bold "═══════════════════════════════════════════════"

cd "$ROOT_DIR/backend"

if ! command -v go &>/dev/null; then
    red "✗ Go is not installed."
    exit 1
fi

EXTRA_ARGS="${*}"

echo "Running: go test ./... -v -count=1 $EXTRA_ARGS"
echo ""

if go test ./... -v -count=1 $EXTRA_ARGS; then
    echo ""
    green "✓ All backend tests passed!"
else
    echo ""
    red "✗ Some backend tests failed."
    exit 1
fi
