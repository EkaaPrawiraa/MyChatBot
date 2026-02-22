#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/launcher"

echo "Starting Axis Assistant Launcher…"
echo "It will open a browser at http://127.0.0.1:4187"
echo ""

exec go run .
