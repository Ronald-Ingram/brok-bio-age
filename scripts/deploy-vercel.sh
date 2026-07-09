#!/usr/bin/env bash
# Deploy BROK Bio-Age web to Vercel (run from repo root after `vercel login`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
ENV_FILE="$WEB/.env.local"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
  npm install -g vercel@latest
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: vercel login"
  exit 1
fi

cd "$WEB"

if [[ ! -f .vercel/project.json ]]; then
  echo "Linking project (first time)..."
  vercel link --yes
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "Pushing env vars from .env.local to Vercel (production)..."
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
    [[ "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    # Skip empty and local-only API URL until Fly is live
    [[ -z "$val" ]] && continue
    if [[ "$key" == "NEXT_PUBLIC_API_URL" && "$val" == *"localhost"* ]]; then
      echo "  skip $key (localhost — set Fly URL on Vercel dashboard first)"
      continue
    fi
    if [[ "$key" == "DATABASE_URL" ]]; then
      echo "  skip $key (not needed at runtime on Vercel)"
      continue
    fi
    printf '%s' "$val" | vercel env add "$key" production --force >/dev/null 2>&1 || true
    echo "  ✓ $key"
  done < "$ENV_FILE"
fi

echo ""
echo "Required manual env on Vercel (if not in .env.local):"
echo "  STRIPE_SECRET_KEY"
echo "  STRIPE_WEBHOOK_SECRET"
echo "  NEXT_PUBLIC_SITE_URL  (set after first deploy, e.g. https://brok-bioage.vercel.app)"
echo "  NEXT_PUBLIC_API_URL   (Fly/Railway API URL — not localhost)"
echo ""

echo "Deploying to production..."
vercel deploy --prod --yes

echo ""
echo "Next steps:"
echo "  1. Copy production URL → set NEXT_PUBLIC_SITE_URL on Vercel"
echo "  2. Stripe webhook → https://<your-domain>/api/stripe/webhook"
echo "  3. Run: python3 scripts/apply_pock_migration.py  (or paste 002_through_005_combined.sql in Supabase SQL Editor)"
echo "  4. Run: python3 scripts/seed_corp_float.py --amount 500000"
echo "  5. Deploy API to Fly with BIOAGE_CORS_ORIGINS=<vercel-url>"