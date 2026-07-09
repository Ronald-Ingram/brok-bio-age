#!/usr/bin/env python3
"""Report P0 rollout status against investor handoff checklist."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from supabase import create_client  # noqa: E402


def load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    path = ROOT / "web" / ".env.local"
    if path.exists():
        for line in path.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def check_table(sb, name: str) -> bool:
    try:
        sb.table(name).select("*").limit(1).execute()
        return True
    except Exception:
        return False


def check_rpc(sb, name: str) -> bool:
    try:
        sb.rpc(name, {}).execute()
        return True
    except Exception as e:
        return "Could not find the function" not in str(e) and "PGRST202" not in str(e)


def main() -> int:
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("FAIL: Supabase env missing")
        return 1

    sb = create_client(url, key)
    checks = {
        "002 stripe_payments": check_table(sb, "stripe_payments"),
        "003 stripe_subscription_events": check_table(sb, "stripe_subscription_events"),
        "004 og_redeem_codes": check_table(sb, "og_redeem_codes"),
        "005 corp_pock_wallet": check_table(sb, "corp_pock_wallet"),
        "RPC credit_pock_from_stripe": check_rpc(sb, "credit_pock_from_stripe"),
        "RPC apply_stripe_subscription": check_rpc(sb, "apply_stripe_subscription"),
        "RPC seed_corp_pock_float": check_rpc(sb, "seed_corp_pock_float"),
        "RPC debit_metered_turn": check_rpc(sb, "debit_metered_turn"),
    }

    print("P0 status (bio-age-tool):")
    ok = 0
    for label, passed in checks.items():
        mark = "✓" if passed else "✗"
        print(f"  {mark} {label}")
        if passed:
            ok += 1

    if check_table(sb, "corp_pock_wallet"):
        row = (
            sb.table("corp_pock_wallet")
            .select("float_remaining,float_allocated,wallet_address")
            .eq("id", "neobanx")
            .maybe_single()
            .execute()
            .data
        )
        if row:
            print(f"\nCorp float: remaining={row.get('float_remaining')} allocated={row.get('float_allocated')}")
            print(f"Wallet: {row.get('wallet_address')}")

    env_flags = {
        "DATABASE_URL": bool(env.get("DATABASE_URL")),
        "STRIPE_SECRET_KEY": bool(env.get("STRIPE_SECRET_KEY")),
        "STRIPE_WEBHOOK_SECRET": bool(env.get("STRIPE_WEBHOOK_SECRET")),
        "BROK_OG_ADMIN_SECRET": bool(env.get("BROK_OG_ADMIN_SECRET")),
    }
    print("\nLocal env:")
    for k, v in env_flags.items():
        print(f"  {'✓' if v else '✗'} {k}")

    print(f"\n{ok}/{len(checks)} schema checks passed")
    return 0 if ok == len(checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())