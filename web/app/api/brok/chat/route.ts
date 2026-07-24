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
import {
  buildKnowledgeContext,
  getBrokDifferentiationCanonBlock,
  getFounderValuesCanonBlock,
  getGeniusBookCanonBlock,
} from "@/lib/brokKnowledge";
import { isBrokDifferentiationTopic } from "@/lib/kironCanonBrokDifferentiation";
import { buildSecretArchivesKnowledgeBlock } from "@/lib/secretArchives";
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
  isApotheosisEthicsTopic,
  isFounderIdentityTopic,
  isGeniusBookTopic,
  isLiveProgressTopic,
  isRonaldIngramBioTopic,
  wantsFounderDetailedAnswer,
  wantsThirdPartyValidation,
} from "@/lib/brokTopicRouting";
import { fetchGrokipediaRonaldIngram } from "@/lib/grokipedia";
import { buildMarketPricesKnowledgeBlock } from "@/lib/marketPrices";
import { buildPockPriceKnowledgeBlock } from "@/lib/pockPrice";
import { buildAstrologyKnowledgeBlock } from "@/lib/westernAstrology";
import { loadUserFacts } from "@/lib/brokUserFacts";
import {
  buildRonaldIngramXKnowledgeBlock,
  shouldInjectFounderXFeed,
} from "@/lib/ronaldIngramX";
import { sanitizeUserFacingError, sanitizeUserFacingText } from "@/lib/brokProductLabels";
import { wantsDetailedAnswer } from "@/lib/spokenText";
import {
  buildBrokTimeContextBlock,
  wantsTimeAwareness,
} from "@/lib/brokTimeContext";
import { markGiftEngaged } from "@/lib/giftOutreach";
import { getServiceSupabase } from "@/lib/supabase/server";
import { resolvePremiumChatAccess } from "@/lib/userPaidAccess";
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

  // Gift cohort: any chat attempt counts as engagement (stops day-5 circle-back).
  void markGiftEngaged(getServiceSupabase(), meteredUserId);

  // Time questions need local context injection — skip peer API when clock is required.
  const needsLocalTime = wantsTimeAwareness(message);

  if (brokApiConfigured() && !needsLocalTime) {
    const timeContext = buildBrokTimeContextBlock();
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
        time_context: timeContext,
        system_context: timeContext,
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

    const detailed =
      wantsDetailedAnswer(message) || wantsFounderDetailedAnswer(message);
    const founderIdentity = isFounderIdentityTopic(message);
    const liveProgress = isLiveProgressTopic(message);
    // Live/progress: X feed first, lighter Canon. Founder identity/values: full Canon first.
    // Never fail the whole chat if Canon/DB retrieval blips.
    let knowledgeBlock: string | undefined;
    let userFactsBlock: string | undefined;
    try {
      const built = await buildKnowledgeContext(message, meteredUserId, {
        detailed: detailed || founderIdentity || !liveProgress,
      });
      knowledgeBlock = built.knowledgeBlock;
      userFactsBlock = built.userFactsBlock;
    } catch (knowErr) {
      console.warn("[brok_chat] knowledge context failed (continuing):", knowErr);
    }

    const parts: string[] = [];

    // Always give BROK a real clock (safe, read-only).
    parts.push(buildBrokTimeContextBlock());

    // Live $POCK/USD (DEX) for convert / how much is X $POCK questions
    const pockPx = await buildPockPriceKnowledgeBlock(message).catch(
      () => null
    );
    if (pockPx) parts.push(pockPx);

    // Western astrology chart / horoscope when asked (or DOB on file)
    try {
      const uf = meteredUserId
        ? await loadUserFacts(meteredUserId)
        : {};
      const astro = buildAstrologyKnowledgeBlock({
        message,
        date_of_birth: uf.date_of_birth,
        birth_time: uf.birth_time,
        birth_place: uf.birth_place,
        sun_sign: uf.sun_sign,
      });
      if (astro) parts.push(astro);
    } catch {
      /* ignore */
    }

    // Live prices (crypto + stocks) when user asks price/ticker/name
    const prices = await buildMarketPricesKnowledgeBlock(message).catch(
      () => null
    );
    if (prices) parts.push(prices);

    // Secret Archives — quote-only literature (never Canon; Nomotheticus anonymity)
    const secretArchives = await buildSecretArchivesKnowledgeBlock(message).catch(
      (err) => {
        console.warn("[brok_chat] secret archives failed (continuing):", err);
        return null;
      }
    );
    if (secretArchives) parts.push(secretArchives);

    if (founderIdentity) {
      // Highest-tier founder ethics/values/history Canon (static + DB)
      parts.push(
        "KIRON CANON — FOUNDER ETHICS / VALUES / HISTORY (primary truth — prefer this voice and structure):\n" +
          getFounderValuesCanonBlock()
      );
      // Genius second book + apotheosis quote (always when identity path)
      if (isGeniusBookTopic(message) || isApotheosisEthicsTopic(message)) {
        parts.push(
          "KIRON CANON — GENIUS BOOK / APOTHEOSIS (primary for second book & pride/godlike-genius ethics — cite Substack URL):\n" +
            getGeniusBookCanonBlock()
        );
      }
      if (isBrokDifferentiationTopic(message)) {
        parts.push(
          "KIRON CANON — BROK DIFFERENTIATION A–H (pick ONE register; do not merge):\n" +
            getBrokDifferentiationCanonBlock()
        );
      }
      if (knowledgeBlock?.trim()) {
        parts.push(
          "KIRON CANON / FAQ / MEMORY (supporting product mechanics):\n" +
            knowledgeBlock
        );
      }
      const gp = await fetchGrokipediaRonaldIngram().catch(() => null);
      if (gp) parts.push(gp);
      // X feed secondary — dated launch/progress only
      if (shouldInjectFounderXFeed(message) || /\$?pock|brok|launch/i.test(message)) {
        const xFeed = await buildRonaldIngramXKnowledgeBlock(message).catch(
          () => null
        );
        if (xFeed) {
          parts.push(
            "FOUNDER X FEED (secondary — use only for dated progress/launch claims):\n" +
              xFeed
          );
        }
      }
    } else {
      if (isBrokDifferentiationTopic(message)) {
        parts.push(
          "KIRON CANON — BROK DIFFERENTIATION A–H (pick ONE register; do not merge):\n" +
            getBrokDifferentiationCanonBlock()
        );
      }
      // Live/progress: founder X feed first; lighten pure Canon dump dominance
      if (liveProgress || shouldInjectFounderXFeed(message)) {
        const xFeed = await buildRonaldIngramXKnowledgeBlock(message).catch(
          () => null
        );
        if (xFeed) parts.push(xFeed);
      }
      if (isRonaldIngramBioTopic(message) || wantsThirdPartyValidation(message)) {
        const gp = await fetchGrokipediaRonaldIngram().catch(() => null);
        if (gp) parts.push(gp);
      }
      if (knowledgeBlock?.trim()) {
        if (liveProgress) {
          parts.push(
            "PRODUCT CANON / FAQ (secondary for progress questions — mechanics only):\n" +
              knowledgeBlock
          );
        } else {
          parts.push(knowledgeBlock);
        }
      }
    }
    const knowledgeWithSources = parts.length ? parts.join("\n\n") : knowledgeBlock;

    // Premium xAI (grok-4.5): paid users always; everyone gets first 15 turns (intro).
    const premiumAccess = await resolvePremiumChatAccess(meteredUserId).catch(
      () =>
        ({
          usePremium: false,
          reason: "none" as const,
          chatTurns: 0,
          introLimit: 15,
        })
    );
    if (premiumAccess.usePremium) {
      console.info(
        `[brok_chat] premium_xai reason=${premiumAccess.reason} turns=${premiumAccess.chatTurns}/${premiumAccess.introLimit}`
      );
    }

    const result = await chatWithFailover(
      body.message,
      body.session_id ?? threadId,
      fileBlock || undefined,
      {
        paidAccess: premiumAccess.usePremium,
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

    // User-facing answer: never leak vendor/model names. Logs keep real providerTag.
    const userText = sanitizeUserFacingText(cleanText);

    // Always record model so logs show groq gpt-oss-120b vs xAI grok-3 (preferred markets path).
    const providerTag =
      result.provider === "xai" || result.model?.includes("grok")
        ? `xai:${result.model}`
        : `${result.provider}:${result.model}`;

    if (threadId) {
      void appendThreadMessage(threadId, "assistant", userText, {
        provider: providerTag,
      });
    }

    void logBrokChat({
      userId: meteredUserId,
      sessionId: result.session_id,
      question: message,
      answer: userText,
      provider: providerTag,
      pagePathname,
    });

    return NextResponse.json({
      response: userText,
      session_id: result.session_id,
      thread_id: threadId,
      // Client maps these to product labels (BROK Intelligence / BROK Genius).
      model: result.model,
      provider: result.provider,
      used_backup: result.used_backup,
      capacity_note: result.capacity_note
        ? sanitizeUserFacingText(result.capacity_note)
        : undefined,
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
          hint: sanitizeUserFacingError(e.message),
          retry_after_sec: e.retryAfterSec,
        },
        { status: 503 }
      );
    }
    if (e instanceof GroqChatError) {
      return NextResponse.json(
        {
          error: e.code,
          hint: sanitizeUserFacingError(e.message),
          retry_after_sec: e.retryAfterSec,
        },
        { status: e.code === "other" ? 502 : 429 }
      );
    }
    const msg = e instanceof Error ? e.message : "chat_failed";
    return NextResponse.json(
      { error: sanitizeUserFacingError(msg) },
      { status: 502 }
    );
  }
}