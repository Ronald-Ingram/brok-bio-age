import { requireAuthenticatedUser } from "@/lib/apiAuth";
import { groqChatConfigured } from "@/lib/brokChatGroq";
import { brokGuardResponse } from "@/lib/brokApiGuard";
import { generateFinancialsPackage } from "@/lib/financialsGenerate";
import {
  financialsToHtml,
  financialsToMarkdown,
} from "@/lib/financialsFormat";
import {
  financialsToXlsxBuffer,
  slugifyEntity,
} from "@/lib/financialsExcel";
import {
  FINANCIALS_DISCLAIMER,
  type FinancialsPayload,
} from "@/lib/financialsTypes";
import { debitFinancialsReport } from "@/lib/pockMeteringServer";
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
        error: "financials_unavailable",
        hint: "BROK Intelligence is required for financial statement generation",
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
    const meter = await debitFinancialsReport(userId);
    meterCost = meter.meter_cost;
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    throw e;
  }

  try {
    const pkg = await generateFinancialsPackage({
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

    const xlsxBuf = await financialsToXlsxBuffer(pkg, meta);
    const xlsx_filename = `BROK-Financials-${slugifyEntity(pkg.entity_name)}-${generated_at.replace(/\s+/g, "-")}.xlsx`;

    const payload: FinancialsPayload = {
      package: pkg,
      html: financialsToHtml(pkg, meta),
      markdown: financialsToMarkdown(pkg, meta),
      xlsx_base64: xlsxBuf.toString("base64"),
      xlsx_filename,
      generated_at,
      sources,
      provider: "groq_financials",
      meter_cost: meterCost,
      disclaimer: FINANCIALS_DISCLAIMER,
    };

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "financials_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
