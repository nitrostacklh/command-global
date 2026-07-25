#!/usr/bin/env bash
# SENTINEL demo launcher (macOS / Linux)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "◉ SENTINEL demo starting..."

(cd service && python -m uvicorn app.main:app --port 8000 --reload) &
SERVICE_PID=$!
sleep 2

python -m sentinel &
SENTINEL_PID=$!
sleep 2

echo "Dashboard: http://127.0.0.1:8100"
trap "kill $SERVICE_PID $SENTINEL_PID 2>/dev/null || true" EXIT
wait
