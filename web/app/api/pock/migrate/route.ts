import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIGRATION_ORDER = [
  "001_pock_system.sql",
  "002_stripe_pock.sql",
  "003_tiered_subscriptions.sql",
  "004_pock_og_grandfather.sql",
  "005_corp_wallet_funding.sql",
];

function migrationsDir(): string {
  return join(process.cwd(), "..", "supabase", "migrations");
}

async function appliedNames(client: import("pg").Client): Promise<Set<string>> {
  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  const res = await client.query("select name from public.schema_migrations");
  return new Set(res.rows.map((r: { name: string }) => r.name));
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const dir = migrationsDir();
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    return NextResponse.json({
      migrations: MIGRATION_ORDER.filter((n) => files.includes(n)),
      applied: [],
      pending: MIGRATION_ORDER.filter((n) => files.includes(n)),
      databaseConfigured: false,
    });
  }

  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    const applied = await appliedNames(client);
    await client.end();
    const ordered = MIGRATION_ORDER.filter((n) => files.includes(n));
    return NextResponse.json({
      migrations: ordered,
      applied: [...applied].filter((n) => ordered.includes(n)),
      pending: ordered.filter((n) => !applied.has(n)),
      databaseConfigured: true,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "status_failed",
        databaseConfigured: true,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    return NextResponse.json(
      {
        error: "DATABASE_URL not set",
        hint: "Add DATABASE_URL to web/.env.local, then POST with x-brok-og-admin header",
      },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { all?: boolean; only?: string };
  const targets = body.only
    ? MIGRATION_ORDER.filter((n) => n.startsWith(`${body.only}_`))
    : body.all
      ? MIGRATION_ORDER
      : MIGRATION_ORDER.filter((n) => n !== "001_pock_system.sql");

  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    const applied = await appliedNames(client);
    const pending = targets.filter((n) => !applied.has(n));
    const results: string[] = [];

    for (const name of pending) {
      const path = join(migrationsDir(), name);
      const sql = readFileSync(path, "utf8");
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (name) values ($1) on conflict do nothing",
        [name]
      );
      results.push(name);
    }

    await client.end();
    return NextResponse.json({
      ok: true,
      applied: results,
      message:
        results.length > 0
          ? `Applied ${results.length} migration(s)`
          : "All requested migrations already applied",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "migration_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}