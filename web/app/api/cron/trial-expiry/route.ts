/**
 * Reclaim expired unused Welcome trial $POCK → Neobanx corp treasury float.
 * Auth: Bearer CRON_SECRET | x-vercel-cron: 1 | admin
 */
import { assertAdmin } from "@/lib/adminAuth";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if (assertAdmin(req)) return true;
  return false;
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    2000,
    Math.max(1, parseInt(url.searchParams.get("limit") || "500", 10) || 500)
  );

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc("reclaim_expired_trials", {
      p_limit: limit,
    });
    if (error) {
      console.error("[trial-expiry]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, result: data, at: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
