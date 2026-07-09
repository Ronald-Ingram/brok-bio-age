import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-brok-og-admin")?.trim();
  return header === secret;
}

function makeCode(): string {
  return "OG" + randomBytes(4).toString("hex").toUpperCase();
}

/** POST — create discretionary VIP grandfather code (not public) */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    code?: string;
    note?: string;
    maxUses?: number;
    expiresInHours?: number;
  };

  const code = (body.code?.trim().toUpperCase() || makeCode()).replace(/\s+/g, "");
  const maxUses = Math.max(1, Math.min(body.maxUses ?? 1, 100));
  const hours = Math.max(1, Math.min(body.expiresInHours ?? 168, 8760));
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("og_redeem_codes").insert({
    code,
    note: body.note ?? "VIP discretionary",
    max_uses: maxUses,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "code_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code,
    maxUses,
    expiresAt,
    note: body.note ?? "VIP discretionary",
  });
}

/** GET — list active codes (admin only) */
export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("og_redeem_codes")
    .select("code, note, max_uses, use_count, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}