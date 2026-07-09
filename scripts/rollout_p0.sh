#!/usr/bin/env bash
# P0 investor rollout — migrations, corp seed, verify, deploy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== P0 Rollout: Bio-Age / $POCK ==="
echo ""

echo "1. Apply Supabase migrations 002–005"
if ! python3 scripts/apply_pock_migration.py; then
  echo ""
  echo "⚠ DATABASE_URL auth failed? Paste supabase/migrations/002_through_005_combined.sql"
  echo "  in Supabase → SQL Editor, then re-run this script."
  exit 1
fi

echo ""
echo "2. Seed corp float (500K POCK per financial model)"
python3 scripts/seed_corp_float.py --amount 500000

echo ""
echo "3. Verify POCK loop"
python3 scripts/test_pock_supabase.py

echo ""
echo "4. Production build"
cd web && npm run build

echo ""
echo "5. Vercel deploy (requires: vercel login + STRIPE_* in web/.env.local)"
if command -v vercel >/dev/null 2>&1 && vercel whoami >/dev/null 2>&1; then
  cd "$ROOT" && ./scripts/deploy-vercel.sh
else
  echo "  skip — run: vercel login && ./scripts/deploy-vercel.sh"
fi

echo ""
echo "=== P0 complete ==="
echo "Post-deploy:"
echo "  • Stripe webhook → https://<domain>/api/stripe/webhook"
echo "    Events: checkout.session.completed, invoice.paid, customer.subscription.deleted"
echo "  • Set NEXT_PUBLIC_SITE_URL on Vercel"
echo "  • GET /api/admin/corp-float to confirm float_remaining"