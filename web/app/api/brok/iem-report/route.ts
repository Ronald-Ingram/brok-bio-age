import { requireAuthenticatedUser } from "@/lib/apiAuth";
import { groqChatConfigured } from "@/lib/brokChatGroq";
import { brokGuardResponse } from "@/lib/brokApiGuard";
import { generateIemReport } from "@/lib/iemReportGenerate";
import { iemReportToHtml, iemReportToMarkdown } from "@/lib/iemReportFormat";
import { debitIemReport } from "@/lib/pockMeteringServer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    message?: string;
    file_contexts?: { filename: string; text: string }[];
    user_id?: string;
  };

  if (!groqChatConfigured()) {
    return NextResponse.json(
      {
        error: "iem_report_unavailable",
        hint: "BROK Intelligence is required for IEM report generation",
      },
      { status: 503 }
    );
  }

  const contexts = body.file_contexts ?? [];
  if (!body.message?.trim() && !contexts.length) {
    return NextResponse.json(
      { error: "message_or_files_required" },
      { status: 400 }
    );
  }

  let meterCost: number | undefined;
  try {
    const userId = await requireAuthenticatedUser(req, body.user_id);
    const meter = await debitIemReport(userId);
    meterCost = meter.meter_cost;
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    throw e;
  }

  try {
    const report = await generateIemReport({
      message: body.message ?? "",
      fileContexts: contexts,
    });

    const generated_at = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const sources = contexts.map((c) => c.filename);
    const meta = { generated_at, sources };

    return NextResponse.json({
      report,
      html: iemReportToHtml(report, meta),
      markdown: iemReportToMarkdown(report, meta),
      generated_at,
      sources,
      provider: "groq_iem_report",
      meter_cost: meterCost,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "iem_report_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}