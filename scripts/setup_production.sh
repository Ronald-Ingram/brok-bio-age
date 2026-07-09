#!/usr/bin/env bash
# One-shot production setup: env secrets, migrations, build, deploy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
ENV_FILE="$WEB/.env.local"

echo "=== BROK Bio-Age production setup ==="

ensure_env_key() {
  local key="$1"
  local value="$2"
  if [[ -f "$ENV_FILE" ]] && grep -q "^${key}=" "$ENV_FILE"; then
    echo "  ✓ $key (already set)"
    return
  fi
  echo "${key}=${value}" >> "$ENV_FILE"
  echo "  + $key (generated)"
}

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$WEB/.env.local.example" "$ENV_FILE"
  echo "Created $ENV_FILE from example"
fi

if ! grep -q "^POCK_INVITE_SECRET=" "$ENV_FILE" 2>/dev/null; then
  ensure_env_key "POCK_INVITE_SECRET" "$(openssl rand -hex 32)"
fi
if ! grep -q "^BROK_OG_ADMIN_SECRET=" "$ENV_FILE" 2>/dev/null; then
  ensure_env_key "BROK_OG_ADMIN_SECRET" "$(openssl rand -hex 24)"
fi
if ! grep -q "^NEXT_PUBLIC_SITE_URL=" "$ENV_FILE" 2>/dev/null; then
  ensure_env_key "NEXT_PUBLIC_SITE_URL" "https://bio-age.kiron.ai"
fi
if ! grep -q "^NEOBANX_CORP_WALLET=" "$ENV_FILE" 2>/dev/null; then
  ensure_env_key "NEOBANX_CORP_WALLET" "GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7"
fi

echo ""
echo "Required manual keys (add to $ENV_FILE and Vercel):"
grep -E '^(# )?(STRIPE_|TWILIO_)' "$WEB/.env.local.example" | sed 's/^/  /'

echo ""
echo "1. Supabase migrations"
if python3 "$ROOT/scripts/apply_pock_migration.py"; then
  echo "  ✓ migrations applied"
else
  echo "  ⚠ migration failed — paste supabase/migrations/002_through_005_combined.sql in Supabase SQL Editor"
  echo "    Or fix DATABASE_URL password in web/.env.local and re-run"
fi

echo ""
echo "2. Corp float seed"
if python3 "$ROOT/scripts/seed_corp_float.py" --amount 500000 2>/dev/null; then
  echo "  ✓ corp float seeded"
else
  echo "  ⚠ skip corp seed until migrations succeed"
fi

echo ""
echo "3. Production build"
cd "$WEB" && npm run build

echo ""
echo "4. Vercel deploy"
if command -v vercel >/dev/null 2>&1 && vercel whoami >/dev/null 2>&1; then
  "$ROOT/scripts/deploy-vercel.sh"
else
  echo "  skip — run: vercel login && ./scripts/deploy-vercel.sh"
fi

echo ""
echo "5. Website patches (paste into GoDaddy / Vercel v0):"
echo "  deploy/website-patches/kiron-bio-age-cta.html"
echo "  deploy/website-patches/neobanx-wallet-live.html"
echo ""
echo "6. GoDaddy DNS: CNAME bio-age → cname.vercel-dns.com"
echo "7. Stripe webhook: POST https://bio-age.kiron.ai/api/stripe/webhook"
echo "   Events: checkout.session.completed, invoice.paid, customer.subscription.deleted"