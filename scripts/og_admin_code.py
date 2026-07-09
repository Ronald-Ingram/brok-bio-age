#!/usr/bin/env python3
"""Create a discretionary POCK OG VIP code (admin only — not published)."""

from __future__ import annotations

import argparse
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="Create POCK OG VIP redeem code")
    parser.add_argument("--note", default="VIP discretionary")
    parser.add_argument("--max-uses", type=int, default=1)
    parser.add_argument("--hours", type=int, default=168, help="Expires in N hours")
    parser.add_argument("--code", help="Custom code (else auto OGxxxxxxxx)")
    parser.add_argument(
        "--base-url",
        default=os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
    )
    args = parser.parse_args()

    secret = os.getenv("BROK_OG_ADMIN_SECRET")
    if not secret:
        print("Set BROK_OG_ADMIN_SECRET in env", file=sys.stderr)
        return 1

    payload = {
        "note": args.note,
        "maxUses": args.max_uses,
        "expiresInHours": args.hours,
    }
    if args.code:
        payload["code"] = args.code.upper()

    url = args.base_url.rstrip("/") + "/api/admin/og-codes"
    r = httpx.post(
        url,
        json=payload,
        headers={"x-brok-og-admin": secret},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"FAIL {r.status_code}: {r.text}", file=sys.stderr)
        return 1

    data = r.json()
    exp = data.get("expiresAt", "")
    print("POCK OG VIP code created (give privately):")
    print(f"  Code:      {data['code']}")
    print(f"  Max uses:  {data['maxUses']}")
    print(f"  Expires:   {exp}")
    print(f"  Note:      {data.get('note', '')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())