import { BROK_API_BASE, brokApiConfigured } from "@/lib/brokApiConfig";
import { brokGuardResponse, guardChatRequest } from "@/lib/brokApiGuard";
import {
  appendThreadMessage,
  getOrCreateThread,
  loadThreadHistory,
} from "@/lib/brokChatThreads";
import { logBrokChat } from "@/lib/brokChatLog";
import { formatFileContextsForPrompt } from "@/lib/brokFileIngest";
import {
  anyChatBackendConfigured,
  BrokChatFailoverError,
  chatWithFailover,
} from "@/lib/brokChatFailover";
import { GroqChatError, resolveGroqMaxTokens } from "@/lib/brokChatGroq";
import { buildKnowledgeContext } from "@/lib/brokKnowledge";
import {
  formatPageContextForPrompt,
  needsPageContext,
  type BrokPageContextPayload,
} from "@/lib/brokPageContext";
import {
  parseFactsJsonFromResponse,
  upsertUserFacts,
} from "@/lib/brokUserFacts";
import {
  isRonaldIngramBioTopic,
  prefersGrokPrimary,
  wantsThirdPartyValidation,
} from "@/lib/brokTopicRouting";
import { fetchGrokipediaRonaldIngram } from "@/lib/grokipedia";
import { buildMarketPricesKnowledgeBlock } from "@/lib/marketPrices";
import { buildRonaldIngramXKnowledgeBlock } from "@/lib/ronaldIngramX";
import { wantsDetailedAnswer } from "@/lib/spokenText";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    message?: string;
    session_id?: string;
    thread_id?: string;
    user_id?: string;
    file_ids?: string[];
    file_contexts?: { filename: string; text: string }[];
    page_context?: BrokPageContextPayload;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }

  let meteredUserId: string;
  let meterCost: number | undefined;
  try {
    const guarded = await guardChatRequest(req, body.user_id);
    meteredUserId = guarded.userId;
    meterCost = guarded.meter?.meter_cost;
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    throw e;
  }

  const message = body.message!.trim();
  const pagePathname = body.page_context?.pathname;

  let threadId: string | null = null;
  let history: Awaited<ReturnType<typeof loadThreadHistory>> = [];

  try {
    threadId = await getOrCreateThread(meteredUserId, body.thread_id, {
      pagePathname,
      titleSeed: message.slice(0, 80),
    });
    history = await loadThreadHistory(threadId);
    await appendThreadMessage(threadId, "user", message, {
      fileMeta: body.file_contexts?.length
        ? { filenames: body.file_contexts.map((c) => c.filename) }
        : undefined,
    });
  } catch (e) {
    console.error("[brok_chat_threads]", e);
  }

  if (brokApiConfigured()) {
    const res = await fetch(`${BROK_API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        session_id: body.session_id ?? threadId,
        thread_id: threadId,
        user_id: meteredUserId,
        file_ids: body.file_ids,
        page_context: body.page_context,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const reply = (data as { response?: string }).response ?? "";
      if (threadId) {
        void appendThreadMessage(threadId, "assistant", reply, {
          provider: "brok_api",
        });
      }
      void logBrokChat({
        userId: meteredUserId,
        sessionId:
          (data as { session_id?: string }).session_id ??
          body.session_id ??
          threadId ??
          undefined,
        question: message,
        answer: reply,
        provider: "brok_api",
        pagePathname,
      });
      return NextResponse.json({
        ...data,
        thread_id: threadId,
        provider: "brok_api",
        meter_cost: meterCost,
      });
    }
    if (!anyChatBackendConfigured()) {
      return NextResponse.json(
        { error: (data as { detail?: string }).detail ?? "chat_failed", ...data },
        { status: res.status }
      );
    }
  }

  if (!anyChatBackendConfigured()) {
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
    const pageAware = needsPageContext(message, pagePathname);
    const pageBlock = body.page_context
      ? formatPageContextForPrompt(body.page_context, { compact: !pageAware })
      : undefined;

    const detailed = wantsDetailedAnswer(message);
    const marketOrProgress =
      prefersGrokPrimary(message) ||
      isRonaldIngramBioTopic(message) ||
      /\b(progress|latest|update|community|roadmap|milestone|development|news|launch)\b/i.test(
        message
      );

    // For live/progress topics: founder X feed FIRST; lighten pure Canon dump dominance.
    const { knowledgeBlock, userFactsBlock } = await buildKnowledgeContext(
      message,
      meteredUserId,
      { detailed: detailed && !marketOrProgress }
    );

    const parts: string[] = [];

    // Live prices (CoinGecko crypto + Yahoo stocks) when user asks price/ticker/name
    const prices = await buildMarketPricesKnowledgeBlock(message).catch(
      () => null
    );
    if (prices) parts.push(prices);

    // Founder X feed for $POCK / markets / Ronald / "latest" — includes most-relevant tweet link
    if (
      marketOrProgress ||
      /\bpock\b|\$pock|neobanx|ronald/i.test(message)
    ) {
      const xFeed = await buildRonaldIngramXKnowledgeBlock(message).catch(
        () => null
      );
      if (xFeed) parts.push(xFeed);
    }
    if (isRonaldIngramBioTopic(message) || wantsThirdPartyValidation(message)) {
      const gp = await fetchGrokipediaRonaldIngram().catch(() => null);
      if (gp) parts.push(gp);
    }
    // Product FAQ/canon still useful, but after live feed for progress questions
    if (knowledgeBlock?.trim()) {
      if (marketOrProgress) {
        parts.push(
          "PRODUCT CANON / FAQ (secondary for progress questions — mechanics only):\n" +
            knowledgeBlock
        );
      } else {
        parts.push(knowledgeBlock);
      }
    }
    const knowledgeWithSources = parts.length ? parts.join("\n\n") : knowledgeBlock;

    const result = await chatWithFailover(
      body.message,
      body.session_id ?? threadId,
      fileBlock || undefined,
      {
        maxTokens: resolveGroqMaxTokens(message, {
          fileContextBlock: fileBlock,
          filenames,
        }),
        filenames,
        pageContextBlock: pageBlock,
        knowledgeBlock: knowledgeWithSources,
        userFactsBlock,
        history,
      }
    );

    const { cleanText, factsPatch } = parseFactsJsonFromResponse(result.response);
    if (factsPatch) {
      void upsertUserFacts(meteredUserId, factsPatch);
    }

    // Always record model so logs show groq 70B vs xAI grok-3 (preferred markets path).
    const providerTag =
      result.provider === "xai" || result.model?.includes("grok")
        ? `xai:${result.model}`
        : `${result.provider}:${result.model}`;

    if (threadId) {
      void appendThreadMessage(threadId, "assistant", cleanText, {
        provider: providerTag,
      });
    }

    void logBrokChat({
      userId: meteredUserId,
      sessionId: result.session_id,
      question: message,
      answer: cleanText,
      provider: providerTag,
      pagePathname,
    });

    return NextResponse.json({
      response: cleanText,
      session_id: result.session_id,
      thread_id: threadId,
      model: result.model,
      provider: result.provider,
      used_backup: result.used_backup,
      capacity_note: result.capacity_note,
      // Back-compat for clients that still read groq_model
      groq_model: result.model,
      meter_cost: meterCost,
      detailed_requested: detailed,
    });
  } catch (e) {
    if (e instanceof BrokChatFailoverError) {
      return NextResponse.json(
        {
          error: e.code,
          hint: e.message,
          retry_after_sec: e.retryAfterSec,
        },
        { status: 503 }
      );
    }
    if (e instanceof GroqChatError) {
      return NextResponse.json(
        {
          error: e.code,
          hint: e.message,
          retry_after_sec: e.retryAfterSec,
        },
        { status: e.code === "other" ? 502 : 429 }
      );
    }
    const msg = e instanceof Error ? e.message : "chat_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}