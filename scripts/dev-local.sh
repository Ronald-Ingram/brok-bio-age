#!/usr/bin/env bash
# Start Bio-Age API (8000) + Next.js web (3000) for local development.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof required to check ports" >&2
  exit 1
fi

port_busy() {
  lsof -i ":$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

if port_busy 8000; then
  echo "Port 8000 already in use — API may already be running."
else
  if [[ ! -d "$ROOT/.venv" ]]; then
    echo "Creating Python venv at $ROOT/.venv"
    python3 -m venv "$ROOT/.venv"
    "$ROOT/.venv/bin/pip" install -r "$ROOT/api/requirements.txt"
  fi
  echo "Starting API on http://localhost:8000"
  (
    cd "$ROOT"
    source .venv/bin/activate
    exec uvicorn api.main:app --reload --port 8000
  ) &
  API_PID=$!
  trap 'kill "$API_PID" 2>/dev/null || true' EXIT
fi

if port_busy 3000; then
  echo "Port 3000 in use — stopping stale Next.js process..."
  lsof -i ":3000" -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Starting web on http://localhost:3000"
cd "$ROOT/web"
# Fresh cache avoids 404 on CSS/JS after a production build.
rm -rf .next
exec npm run dev:clean