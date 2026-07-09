#!/usr/bin/env python3
"""Apply POCK migrations to the shared BROK Supabase project.

Requires DATABASE_URL (direct Postgres connection string) in env or web/.env.local:
  postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

Usage:
  python scripts/apply_pock_migration.py              # apply pending 002–005
  python scripts/apply_pock_migration.py --all        # apply 001–005 (idempotent where possible)
  python scripts/apply_pock_migration.py --only 003   # single migration
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
ENV_LOCAL = ROOT / "web" / ".env.local"

ORDERED = [
    "001_pock_system.sql",
    "002_stripe_pock.sql",
    "003_tiered_subscriptions.sql",
    "004_pock_og_grandfather.sql",
    "005_corp_wallet_funding.sql",
    "006_ingram_inneagram.sql",
    "007_hybrid_custody.sql",
    "008_treasury_buyback.sql",
    "009_treasury_buyback_batches.sql",
    "010_genius_sub_wallets.sql",
    "011_brok_qa_admin.sql",
    "012_custody_release_settlement.sql",
]


def load_database_url() -> str | None:
    url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if url:
        return url
    if ENV_LOCAL.exists():
        for line in ENV_LOCAL.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() in ("DATABASE_URL", "SUPABASE_DB_URL") and val.strip():
                return val.strip().strip('"').strip("'")
    return None


def ensure_tracking_table(cur) -> None:
    cur.execute(
        """
        create table if not exists public.schema_migrations (
          name text primary key,
          applied_at timestamptz not null default now()
        );
        """
    )


def applied_names(cur) -> set[str]:
    ensure_tracking_table(cur)
    cur.execute("select name from public.schema_migrations")
    return {row[0] for row in cur.fetchall()}


def apply_one(cur, path: Path) -> None:
    sql = path.read_text()
    cur.execute(sql)
    cur.execute(
        "insert into public.schema_migrations (name) values (%s) on conflict do nothing",
        (path.name,),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply POCK Supabase migrations")
    parser.add_argument("--all", action="store_true", help="Include 001 (default: 002+ only)")
    parser.add_argument("--only", metavar="NNN", help="Apply single migration prefix e.g. 003")
    args = parser.parse_args()

    db_url = load_database_url()
    if not db_url:
        print(
            "ERROR: Set DATABASE_URL (Supabase → Settings → Database → Connection string)",
            file=sys.stderr,
        )
        print(f"Then run: DATABASE_URL='...' python {__file__}", file=sys.stderr)
        return 1

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...", file=sys.stderr)
        os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
        import psycopg2

    if args.only:
        matches = [n for n in ORDERED if n.startswith(f"{args.only}_")]
        if not matches:
            print(f"ERROR: No migration matching prefix {args.only}", file=sys.stderr)
            return 1
        targets = matches
    elif args.all:
        targets = ORDERED
    else:
        targets = [n for n in ORDERED if n != "001_pock_system.sql"]

    print(f"Connecting to Supabase …")
    try:
        conn = psycopg2.connect(db_url, connect_timeout=15)
    except Exception as e:
        print(f"ERROR: Database connection failed: {e}", file=sys.stderr)
        print(
            "Tip: Reset database password in Supabase dashboard and update DATABASE_URL in web/.env.local",
            file=sys.stderr,
        )
        return 1

    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            done = applied_names(cur)
            pending = [n for n in targets if n not in done]
            if not pending:
                print("✓ All requested migrations already applied")
                return 0
            for name in pending:
                path = MIGRATIONS_DIR / name
                if not path.exists():
                    print(f"ERROR: Missing {path}", file=sys.stderr)
                    return 1
                print(f"Applying {name} …")
                apply_one(cur, path)
                print(f"  ✓ {name}")
        print("✓ Migration batch complete")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())