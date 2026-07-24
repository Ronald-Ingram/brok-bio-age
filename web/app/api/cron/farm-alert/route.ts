/**
 * Farm / anomaly alert cron (Vercel).
 *
 * Auth: Authorization: Bearer $CRON_SECRET  |  x-vercel-cron: 1  |  admin
 * Schedule: vercel.json → every 15 minutes (Pro) / adjust if Hobby limits apply
 */
import { assertAdmin } from "@/lib/adminAuth";
import { runFarmAnomalyCheck } from "@/lib/farmAnomalyAlert";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const vercelCron = req.headers.get("x-vercel-cron");
  // Vercel Cron injection (with or without CRON_SECRET)
  if (vercelCron === "1") return true;
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
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runFarmAnomalyCheck({ force });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/farm-alert]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "cron_failed",
      },
      { status: 500 }
    );
  }
}
