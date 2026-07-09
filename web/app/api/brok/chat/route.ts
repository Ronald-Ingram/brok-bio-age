import { BROK_API_BASE, brokApiConfigured } from "@/lib/brokApiConfig";
import { logBrokChat } from "@/lib/brokChatLog";
import { formatFileContextsForPrompt } from "@/lib/brokFileIngest";
import { chatViaGroq, groqChatConfigured } from "@/lib/brokChatGroq";
import { buildKnowledgeContext } from "@/lib/brokKnowledge";
import {
  formatPageContextForPrompt,
  type BrokPageContextPayload,
} from "@/lib/brokPageContext";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    message?: string;
    session_id?: string;
    user_id?: string;
    file_ids?: string[];
    file_contexts?: { filename: string; text: string }[];
    page_context?: BrokPageContextPayload;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }

  if (brokApiConfigured()) {
    const res = await fetch(`${BROK_API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        session_id: body.session_id,
        user_id: body.user_id,
        file_ids: body.file_ids,
        page_context: body.page_context,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const reply = (data as { response?: string }).response ?? "";
      void logBrokChat({
        userId: body.user_id,
        sessionId: (data as { session_id?: string }).session_id ?? body.session_id,
        question: body.message!.trim(),
        answer: reply,
        provider: "brok_api",
        pagePathname: body.page_context?.pathname,
      });
      return NextResponse.json({ ...data, provider: "brok_api" });
    }
    if (!groqChatConfigured()) {
      return NextResponse.json(
        { error: (data as { detail?: string }).detail ?? "chat_failed", ...data },
        { status: res.status }
      );
    }
  }

  if (!groqChatConfigured()) {
    return NextResponse.json(
      {
        error: "brok_api_not_configured",
        hint: "BROK Intelligence is temporarily unavailable",
      },
      { status: 503 }
    );
  }

  try {
    const fileBlock = formatFileContextsForPrompt(body.file_contexts ?? []);
    const filenames = (body.file_contexts ?? []).map((c) => c.filename);
    const dealEval =
      Boolean(fileBlock) ||
      /\b(iem|evaluate|deal|investment|partnership|cfo|proposal)\b/i.test(
        body.message ?? ""
      );
    const pageBlock = body.page_context
      ? formatPageContextForPrompt(body.page_context)
      : undefined;

    const knowledgeBlock = await buildKnowledgeContext(
      body.message!.trim(),
      body.user_id
    );

    const result = await chatViaGroq(
      body.message,
      body.session_id,
      fileBlock || undefined,
      {
        maxTokens: dealEval ? 3200 : fileBlock ? 2500 : 1200,
        filenames,
        pageContextBlock: pageBlock,
        knowledgeBlock,
      }
    );

    void logBrokChat({
      userId: body.user_id,
      sessionId: result.session_id,
      question: body.message!.trim(),
      answer: result.response,
      provider: "groq_fallback",
      pagePathname: body.page_context?.pathname,
    });

    return NextResponse.json({ ...result, provider: "groq_fallback" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "chat_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}