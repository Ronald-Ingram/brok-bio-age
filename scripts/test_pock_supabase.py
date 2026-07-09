#!/usr/bin/env python3
"""Integration test: BROK Bio-Age POCK ↔ Supabase (requires migration applied)."""

from __future__ import annotations

import sys
import uuid

import httpx
from supabase import create_client

URL = "https://avfuuzloxgqqkrdxkqzf.supabase.co"
ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZnV1emxveGdxcWtyZHhrcXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzYyMTEsImV4cCI6MjA5MzMxMjIxMX0."
    "f6SLskUJBguusJsaqErYiKI91nwbw_wgIh3mxChMSPI"
)
WEB_PORTS = (3003, 3002, 3000)


def main() -> int:
    device = str(uuid.uuid4())
    print(f"1. Auth device={device[:8]}…")
    r = None
    for port in WEB_PORTS:
        try:
            resp = httpx.post(
                f"http://localhost:{port}/api/pock/auth",
                json={"deviceId": device},
                timeout=15,
            )
            if resp.status_code == 200:
                r = resp
                print(f"   via localhost:{port}")
                break
        except httpx.HTTPError:
            continue
    if r is None:
        print("   FAIL: no dev server responded on ports 3003/3002/3000")
        return 1
    tokens = r.json()
    print("   OK session tokens received")

    sb = create_client(URL, ANON)
    sb.auth.set_session(tokens["access_token"], tokens["refresh_token"])

    print("2. bootstrap_user RPC")
    try:
        boot = sb.rpc("bootstrap_user").execute()
    except Exception as e:
        print(f"   FAIL: {e}")
        print("   → Run supabase/migrations/001_pock_system.sql in Supabase SQL editor")
        return 1

    user = boot.data
    print(f"   OK balance={user['pock_balance']} trial={user['trial_credited']}")

    print("3. debit_for_calc RPC")
    debit = sb.rpc("debit_for_calc").execute().data
    print(f"   OK debited={debit['debited']} balance={debit['balance']}")

    ledger = (
        sb.table("pock_ledger")
        .select("kind,amount,balance_after,note")
        .order("created_at", desc=True)
        .limit(3)
        .execute()
        .data
    )
    print(f"4. ledger ({len(ledger)} recent)")
    for row in ledger:
        print(f"   {row['kind']:16} {row['amount']:+4} → bal {row['balance_after']}")

    print("\n✓ POCK ↔ Supabase flow verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())