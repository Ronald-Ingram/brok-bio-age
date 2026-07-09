#!/usr/bin/env python3
"""Seed Neobanx corp $POCK float after migration 005 (model default: 500K POCK).

Requires SUPABASE_SERVICE_ROLE_KEY and BROK_OG_ADMIN_SECRET in web/.env.local,
or call the admin API directly:

  curl -X POST "$SITE/api/admin/corp-float" \\
    -H "x-brok-og-admin: $BROK_OG_ADMIN_SECRET" \\
    -H "Content-Type: application/json" \\
    -d '{"amount": 500000, "note": "Jul 2026 investor rollout seed"}'
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
ENV_LOCAL = ROOT / "web" / ".env.local"
DEFAULT_AMOUNT = 500_000


def load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    if ENV_LOCAL.exists():
        for line in ENV_LOCAL.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("BROK_OG_ADMIN_SECRET", "NEXT_PUBLIC_SITE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if os.getenv(k):
            out[k] = os.getenv(k) or ""
    return out


def seed_via_rpc(env: dict[str, str], amount: int, note: str) -> int:
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required", file=sys.stderr)
        return 1
    from supabase import create_client

    sb = create_client(url, key)
    try:
        r = sb.rpc("seed_corp_pock_float", {"p_amount": amount, "p_note": note}).execute()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("→ Apply migration 005 first", file=sys.stderr)
        return 1
    wallet = r.data
    print(f"✓ Corp float seeded: {amount:,} POCK")
    if wallet:
        print(f"  float_remaining={wallet.get('float_remaining')}")
        print(f"  wallet={wallet.get('wallet_address')}")
    return 0


def seed_via_api(env: dict[str, str], amount: int, note: str) -> int:
    secret = env.get("BROK_OG_ADMIN_SECRET")
    site = env.get("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").rstrip("/")
    if not secret:
        print("ERROR: BROK_OG_ADMIN_SECRET required for API seed", file=sys.stderr)
        return 1
    resp = httpx.post(
        f"{site}/api/admin/corp-float",
        headers={"x-brok-og-admin": secret, "Content-Type": "application/json"},
        json={"amount": amount, "note": note},
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"ERROR: HTTP {resp.status_code} {resp.text}", file=sys.stderr)
        return 1
    data = resp.json()
    w = data.get("wallet", {})
    print(f"✓ Corp float seeded via API: {amount:,} POCK")
    print(f"  float_remaining={w.get('float_remaining')}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--amount", type=int, default=DEFAULT_AMOUNT)
    parser.add_argument("--note", default="Jul 2026 investor rollout seed (500K POCK)")
    parser.add_argument("--api", action="store_true", help="Use HTTP admin API instead of direct RPC")
    args = parser.parse_args()

    env = load_env()
    if args.api:
        return seed_via_api(env, args.amount, args.note)
    return seed_via_rpc(env, args.amount, args.note)


if __name__ == "__main__":
    raise SystemExit(main())