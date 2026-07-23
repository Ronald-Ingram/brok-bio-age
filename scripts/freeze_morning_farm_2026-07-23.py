#!/usr/bin/env python3
"""
Freeze + reclaim pure trial wallets from the 2026-07-23 morning farm burst.
Does NOT enable kill switches (trial mint stays on).

Usage (from bio-age-tool/web with DATABASE_URL):
  /tmp/brok-ops-venv/bin/python ../scripts/freeze_morning_farm_2026-07-23.py
  /tmp/brok-ops-venv/bin/python ../scripts/freeze_morning_farm_2026-07-23.py --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Need psycopg2: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

# Load web/.env.local if present
_env = Path(__file__).resolve().parents[1] / "web" / ".env.local"
if _env.exists():
    for line in _env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

REASON = (
    "2026-07-23 farm freeze: unused Welcome trial clawed back to treasury; "
    "account frozen (bot/device farm pattern)"
)

# Morning PDT burst window (matches investigation)
SINCE = "2026-07-23T14:00:00+00:00"
UNTIL = "2026-07-23T17:00:00+00:00"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL required", file=sys.stderr)
        return 1

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        """
        select id, pock_balance, trial_credited, calc_count, created_at
        from brok_users
        where created_at >= %s and created_at < %s
          and trial_credited = true
          and coalesce(calc_count, 0) = 0
          and pock_balance = 100
          and account_frozen_at is null
        order by created_at
        """,
        (SINCE, UNTIL),
    )
    rows = cur.fetchall()
    print(f"candidates: {len(rows)} (dry_run={args.dry_run})")

    if args.dry_run:
        for r in rows[:10]:
            print(" ", r["id"], r["created_at"], r["pock_balance"])
        if len(rows) > 10:
            print(f"  ... +{len(rows) - 10} more")
        conn.rollback()
        return 0

    ok = 0
    total_reclaimed = 0
    errors = []
    for r in rows:
        cur.execute(
            "select public.reclaim_unused_trial(%s::uuid, %s, true) as res",
            (r["id"], REASON),
        )
        res = cur.fetchone()["res"]
        if res.get("ok"):
            ok += 1
            total_reclaimed += int(res.get("reclaimed") or 0)
        else:
            errors.append((r["id"], res))

    conn.commit()
    print(f"processed_ok={ok} pock_returned={total_reclaimed} errors={len(errors)}")
    for e in errors[:10]:
        print(" err", e)
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
