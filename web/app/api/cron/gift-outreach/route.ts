/**
 * Gift activation cron:
 * - Backfill historical first receivers
 * - Day-5 circle-back for unengaged accounts
 * - Daily anonymous feedback/usage report email
 *
 * Auth: Authorization: Bearer $CRON_SECRET  OR  admin session (assertAdmin)
 * Schedule: Vercel cron daily 14:00 UTC (~7am PT)
 */
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

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  // Vercel Cron sends this header when CRON_SECRET is set in project
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron === "1" && !cronSecret) return true;
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
  const mode = url.searchParams.get("mode") ?? "all";
  const supabase = getServiceSupabase();

  const result: Record<string, unknown> = {
    ok: true,
    mode,
    at: new Date().toISOString(),
  };

  try {
    if (mode === "all" || mode === "backfill") {
      result.backfill = await backfillGiftOutreachFromClaims(supabase);
    }
    if (mode === "all" || mode === "day5") {
      result.day5 = await runDay5CircleBacks(supabase);
    }
    if (mode === "all" || mode === "report") {
      const report = await buildDailyFeedbackUsageReport(supabase, 24);
      result.report = {
        feedbackCount: report.feedback.count,
        avgEase: report.feedback.avgEase,
        firstReceives: report.outreach.firstReceivesInWindow,
        unengaged: report.outreach.unengaged,
        activeAccounts: report.usageByAccount.length,
      };
      result.reportPreview = report.summaryText.slice(0, 2500);
      if (mode === "all" || url.searchParams.get("email") === "1") {
        result.email = await emailDailyReport(supabase);
      }
    }
    if (mode === "report-full") {
      result.report = await buildDailyFeedbackUsageReport(supabase, 24);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/gift-outreach]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "cron_failed",
        ...result,
      },
      { status: 500 }
    );
  }
}
