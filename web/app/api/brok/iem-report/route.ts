import { groqChatConfigured } from "@/lib/brokChatGroq";
import { generateIemReport } from "@/lib/iemReportGenerate";
import { iemReportToHtml, iemReportToMarkdown } from "@/lib/iemReportFormat";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    message?: string;
    file_contexts?: { filename: string; text: string }[];
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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "iem_report_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}