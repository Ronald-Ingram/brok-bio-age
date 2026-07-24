#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
# shellcheck disable=SC1091
source "$ROOT/web/.env.local" 2>/dev/null || true
# shellcheck disable=SC1091
source "$HOME/neobanx-brok-mvp/.env" 2>/dev/null || true
# shellcheck disable=SC1091
source "$HOME/.env" 2>/dev/null || true
set +a
export BROK_ALERT_TELEGRAM_CHAT_ID="${BROK_ALERT_TELEGRAM_CHAT_ID:-6211143757}"
exec "$ROOT/.venv/bin/python" "$ROOT/scripts/farm_anomaly_alert.py"
