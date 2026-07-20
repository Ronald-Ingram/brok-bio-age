import { assertAdmin } from "@/lib/adminAuth";
import {
  backfillGiftOutreachFromClaims,
  buildDailyFeedbackUsageReport,
  emailDailyReport,
  runDay5CircleBacks,
} from "@/lib/giftOutreach";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const hours = Number(new URL(req.url).searchParams.get("hours") ?? "24");
  const report = await buildDailyFeedbackUsageReport(
    getServiceSupabase(),
    Number.isFinite(hours) ? Math.min(168, Math.max(1, hours)) : 24
  );
  return NextResponse.json(report);
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: "backfill" | "day5" | "email_report" | "all";
  };
  const action = body.action ?? "all";
  const supabase = getServiceSupabase();
  const out: Record<string, unknown> = { ok: true, action };

  if (action === "backfill" || action === "all") {
    out.backfill = await backfillGiftOutreachFromClaims(supabase);
  }
  if (action === "day5" || action === "all") {
    out.day5 = await runDay5CircleBacks(supabase);
  }
  if (action === "email_report" || action === "all") {
    out.email = await emailDailyReport(supabase);
  }
  out.report = await buildDailyFeedbackUsageReport(supabase, 24);
  return NextResponse.json(out);
}
