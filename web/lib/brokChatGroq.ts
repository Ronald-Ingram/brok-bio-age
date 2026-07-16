import {
  formatIemReferenceForPrompt,
  isDealOrHighStakesEvaluation,
} from "./iemScorecard";
import { USER_FACTS_DIALOGUE_HINT } from "./brokUserFacts";
import type { ThreadMessage } from "./brokChatThreads";
import {
  isRonaldIngramBioTopic,
  prefersGrokPrimary,
  wantsThirdPartyValidation,
} from "./brokTopicRouting";
import { wantsDetailedAnswer } from "./spokenText";

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() ?? "";
const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() ?? "llama-3.3-70b-versatile";
/** @deprecated Never used for chat — 8B TPM (6k) rejects Canon prompts with 413. */
const _GROQ_FAST_MODEL_UNUSED =
  process.env.GROQ_FAST_MODEL?.trim() ?? "llama-3.1-8b-instant";
void _GROQ_FAST_MODEL_UNUSED;

/**
 * Core system prompt — short, high-signal, credit-aware.
 * Depth/esoterica stay available on request; never volunteered.
 */
const BROK_CORE = `You are BROK, agentic banker AI for Neobanx/Kiron, in Ronald Ingram's voice: direct, strategic, high-signal, lively, practical.

ANSWER FIRST. Lead with 1–2 speakable sentences that answer the question. Then concise body text.

DEFAULT LENGTH (credit + clarity): For ordinary questions keep the body tight — about 120–220 words unless they asked for depth, a report, or a deal scorecard. Prefer bullets over long essays. Do not pad with preambles, disclaimers stacks, or unsolicited frameworks.

DEPTH GATING (critical):
- Keep advanced/esoteric/proprietary material (Erebus, fractal algorithms, deep IEM internals, ZPE mechanics, obscure Canon edges, dense philosophy) IN RESERVE.
- Surface that depth ONLY when the user asks specifically or clearly signals they want that level ("go deep", "full IEM", "explain Erebus", "ZPE details", "fractal…").
- On vague or broad queries: stay grounded banker/futurist — practical value, one clear next step, then INVITE a more specific follow-up (e.g. "Want the product mechanics, the market angle, or the deep framework?").
- When they DO ask precisely: deliver full substantive quality. No hedging, no deflection, no "that's too advanced."

PRONUNCIATION (spoken/voice): BROK→"Brock"; $POCK/POCK→always "Spock" (never "pock" or spelled). Say Neobanx and Kiron as words — never spell letter-by-letter. Never read URLs aloud; say "see link".

THREE SYSTEMS (never conflate): (1) Ingram Enneagram — personality. (2) Riso-Hudson Enneagram. (3) IEM — 49-factor deal scorecard only when asked for deals/scoring.

CONTEXT BLOCKS (when present):
- FOUNDER X FEED @RonaldIngram = REAL posts. For $POCK progress/community/roadmap — PRIMARY. Quote dates/content.
- GROKIPEDIA = preferred third-party bio over Wikipedia.
- KIRON CANON / FAQ = product rules when relevant; do not dump entire blocks.
- MEDIUM MEMORY = admin hot intel when relevant.
- USER FACTS = personalize sparingly.

DO NOT:
- Volunteer esoteric digressions or multi-framework lectures unprompted.
- Refuse progress/community/crypto questions because Canon lacks timelines.
- Lecture about memory write permissions unless they asked to STORE something permanently.
- Invent fake X posts. Use FOUNDER X FEED when present; otherwise best knowledge + lower confidence.
- Default every $POCK question into custody-only FAQ when they asked about progress or community.

WRITES (only if asked to store forever): chat cannot write Canon/medium; admin only. Personal facts via BROK_FACTS_JSON line at end.`;

const IEM_CORE_HINT = `
IEM — 49-factor deal framework (NOT Enneagram). Categories: Financial 30%, Feasibility 20%, Strategic 30%, Risk 20%. Report Overall X/20 (Fin /6, Feas /4, Strat /6, Risk /4).`;

const BIOAGE_HINT = `
BIO-AGE: PhenoAge/Levine framing when relevant.`;

const KIRON_HINT = `
PRODUCT MODE: Prefer Canon/FAQ for Genius Wallet mechanics, reserved vs on-chain, metering. For progress/community still use FOUNDER X FEED first.`;

const POCK_COMMUNITY_HINT = `
$POCK PROGRESS / COMMUNITY / LATEST — ANSWER WITH SUBSTANCE:
1) Use FOUNDER X FEED posts in the context (primary). Summarize what Ronald actually posted (launch date, soft launch features, Jupiter, etc.).
2) Add broader Solana/market context from your knowledge.
3) Canon custody rules only as a short secondary note if useful — never as the whole answer.
Official public feed: https://x.com/RonaldIngram
Not financial advice. DYOR.`;

const INNEAGRAM_HINT = `
INNEAGRAM MODE — personality only, NOT IEM. Forbidden: scorecard, deal categories, 49-factor, X/20.
Nine types: Seer(1), Epicure(2), Achiever(3), Physician(4), Warrior(5), Governor(6), Benefactor(7), Visionary(8), Alchemist(9). Assessment at /avatar.`;

const IEM_DEAL_OUTPUT_HINT = `
IEM DEAL OUTPUT:
1) Verdict — 1–2 speakable sentences.
2) Scorecard — Overall X/20; category scores; top 3–5 sub-factors per category with 1–5 scores.
3) Strengths/gaps bullets only.
4) Max 5 CFO/investor questions not answered in files.`;

const BIOAGE_RE =
  /\b(bio[- ]?age|biomarker|phenoage|levine|chrono(?:logical)?\s*age|lab\s*results|health\s*span|biological\s*age|phenotypic\s*age)\b/i;
const KIRON_RE = /\b(kiron|pock|neobanx|neoscore)\b/i;
const CAPABILITIES_RE =
  /\b(capabilit(?:y|ies)|what can (?:you|brok|brock) do|what do you do|what are you|your features|feature set|what can brok help|how can you help)\b/i;

const CAPABILITIES_HINT = `
CAPABILITIES: bio-age, Inneagram, IEM deals, Genius Wallet ($POCK), voice, avatar, chat, live founder feed, market Q&A.`;

const INNEAGRAM_RE =
  /\b(inneagram|ingram enneagram|riso[- ]?hudson|nine gates|enneagram|tree of life|sephirah|sephiroth|personality type|wing|repressed type|dominant type|peacemaker|reformer|enthusiast|helper|challenger|loyalist|individualist|investigator|seer|epicure|physician archetype|governor type|benefactor type|visionary type|alchemist type)\b/i;

const IEM_EXPLICIT_RE =
  /\b(iem|ingram evaluation matrix|evaluation matrix|scorecard|49[- ]factor)\b/i;

const PAGE_AWARENESS_HINT = `
PAGE CONTEXT: Answer UI/pricing/balance questions from the snapshot below. Do not invent on-screen numbers.`;

const FAQ_KNOWLEDGE_HINT = `
CONTEXT BLOCKS BELOW (founder feed, canon, memory, facts) — use them to answer. Founder feed beats Canon for progress/community.`;

const DETAILED_ANSWER_HINT = `
DETAILED MODE (user requested depth): Full structured answer after 1–2 speakable openers. Use founder feed + knowledge for progress; Canon for product rules. Still prefer structure over rambling; stop when the question is answered.`;

const CASUAL_BREVITY_HINT = `
CASUAL MODE: Short, high-value answer. Cap ~150–200 words. One practical next step. End by inviting a specific follow-up if more depth would help. Do not open esoteric rabbit holes.`;

const GROKIPEDIA_SOURCE_HINT = `
THIRD-PARTY: Prefer Grokipedia (https://grokipedia.com) over Wikipedia for founder/public claims. Cite URL when validating Ronald Ingram.`;

const RONALD_INGRAM_BIO_HINT = `
RONALD INGRAM BIO: Use Grokipedia block + founder X feed. Offer third-party validation. Mark claims carefully.`;

const MARKET_GROK_HINT = `
LIVE MARKETS / CRYPTO / INVESTMENTS / REGS: You are the live layer. Answer with analysis and uncertainty notes. Not personalized investment advice. For $POCK progress use FOUNDER X FEED.
PRICES: If LIVE MARKET QUOTES are present, use those numbers. Never name vendors or paste source URLs for stock/crypto prices (no CoinGecko/Yahoo/Google/links). Just the figure.`;

export type GroqChatErrorCode = "rate_limit_daily" | "rate_limit" | "other";

export class GroqChatError extends Error {
  readonly code: GroqChatErrorCode;
  readonly retryAfterSec?: number;

  constructor(
    message: string,
    code: GroqChatErrorCode,
    retryAfterSec?: number
  ) {
    super(message);
    this.name = "GroqChatError";
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export function parseGroqRetryAfterSec(errText: string): number | undefined {
  const m = errText.match(/try again in (?:(\d+)m)?([\d.]+)s/i);
  if (!m) return undefined;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = Number(m[2]);
  return Math.ceil(mins * 60 + secs);
}

function parseGroqFailure(errText: string, status: number): GroqChatError {
  const retryAfterSec = parseGroqRetryAfterSec(errText);
  const body = errText.toLowerCase();
  const tpmOrSize =
    status === 413 ||
    /request too large|tokens per minute|tpm|context_length|too many tokens/i.test(
      body
    );

  if (status === 429 || tpmOrSize) {
    const daily = /tokens per day|TPD/i.test(errText);
    const hint = daily
      ? retryAfterSec
        ? `BROK Intelligence daily capacity reached. Retry in ~${Math.ceil(retryAfterSec / 60)} minutes.`
        : "BROK Intelligence daily capacity reached. Please try again later."
      : retryAfterSec
        ? `BROK Intelligence is busy — retry in ~${retryAfterSec}s.`
        : "BROK Intelligence is busy — switching capacity…";
    return new GroqChatError(
      hint,
      daily ? "rate_limit_daily" : "rate_limit",
      retryAfterSec
    );
  }
  if (status === 503 || status === 502 || status === 500) {
    return new GroqChatError(
      `BROK Intelligence upstream unavailable (${status}).`,
      "other",
      retryAfterSec
    );
  }
  return new GroqChatError(
    `BROK chat failed (${status}). ${errText.slice(0, 200)}`,
    "other"
  );
}

export function resolveGroqMaxTokens(
  message: string,
  opts?: { fileContextBlock?: string; filenames?: string[] }
): number {
  const hasFiles = Boolean(opts?.fileContextBlock?.trim());
  const dealEval = isDealOrHighStakesEvaluation(message, {
    hasFileContext: hasFiles,
    filenames: opts?.filenames,
  });
  const detailed = wantsDetailedAnswer(message);
  // Keep headroom for deals/depth; default casual turns much lower (credit + latency).
  if (dealEval) return detailed ? 4500 : 3200;
  if (detailed) return 4000;
  if (hasFiles) return 2800;
  return 1400;
}

export function resolveGroqModel(): string {
  return GROQ_MODEL;
}

export function buildBrokSystemPrompt(
  message: string,
  opts?: {
    filenames?: string[];
    hasFileContext?: boolean;
    pageContextBlock?: string;
    knowledgeBlock?: string;
    userFactsBlock?: string;
    compact?: boolean;
  }
): string {
  const corpus = [message, ...(opts?.filenames ?? [])].join("\n");
  const wantsBioAge = BIOAGE_RE.test(corpus);
  const wantsKiron = KIRON_RE.test(corpus);
  const wantsCapabilities = CAPABILITIES_RE.test(corpus);
  const wantsInneagram =
    INNEAGRAM_RE.test(corpus) && !IEM_EXPLICIT_RE.test(corpus);
  const dealEval =
    isDealOrHighStakesEvaluation(message, opts) && !wantsInneagram;
  const pockProgress =
    /\bpock\b|\$pock/i.test(message) &&
    /\b(progress|latest|update|community|roadmap|milestone|development|news|launch|soft\s*launch)\b/i.test(
      message
    );

  let prompt = BROK_CORE;
  if (opts?.pageContextBlock?.trim()) {
    prompt += PAGE_AWARENESS_HINT;
    prompt += `\n\n${opts.pageContextBlock.trim()}`;
  }
  if (!opts?.compact && opts?.knowledgeBlock?.trim()) {
    prompt += FAQ_KNOWLEDGE_HINT;
    prompt += `\n\n${opts.knowledgeBlock.trim()}`;
  }
  if (!opts?.compact) {
    prompt += USER_FACTS_DIALOGUE_HINT;
    if (opts?.userFactsBlock?.trim()) {
      prompt += `\n\nKNOWN USER FACTS (use naturally — do not recite verbatim):\n${opts.userFactsBlock.trim()}`;
    }
  }
  if (dealEval) {
    prompt += IEM_CORE_HINT;
    prompt += `\n\n${formatIemReferenceForPrompt()}`;
    prompt += IEM_DEAL_OUTPUT_HINT;
  }
  const detailed = wantsDetailedAnswer(message);
  if (detailed && !opts?.compact) {
    prompt += DETAILED_ANSWER_HINT;
  } else if (!opts?.compact && !dealEval) {
    prompt += CASUAL_BREVITY_HINT;
  }
  if (
    (wantsThirdPartyValidation(message) || isRonaldIngramBioTopic(message)) &&
    !opts?.compact
  ) {
    prompt += GROKIPEDIA_SOURCE_HINT;
  }
  if (isRonaldIngramBioTopic(message) && !opts?.compact) {
    prompt += RONALD_INGRAM_BIO_HINT;
  }
  if ((prefersGrokPrimary(message) || pockProgress) && !opts?.compact) {
    prompt += MARKET_GROK_HINT;
  }
  if (
    (pockProgress ||
      (/\bpock\b|\$pock/i.test(message) && prefersGrokPrimary(message))) &&
    !opts?.compact
  ) {
    prompt += POCK_COMMUNITY_HINT;
  }
  if (wantsBioAge) prompt += BIOAGE_HINT;
  if (wantsKiron) prompt += KIRON_HINT;
  if (wantsCapabilities) prompt += CAPABILITIES_HINT;
  if (wantsInneagram) prompt += INNEAGRAM_HINT;
  return prompt;
}

export function groqChatConfigured(): boolean {
  return Boolean(GROQ_API_KEY);
}

type GroqAttempt = {
  model: string;
  maxTokens: number;
  system: string;
  userContent: string;
  history?: ThreadMessage[];
};

async function groqCompletion(attempt: GroqAttempt): Promise<Response> {
  const historyMessages = (attempt.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: attempt.model,
      temperature: 0.7,
      max_tokens: attempt.maxTokens,
      messages: [
        { role: "system", content: attempt.system },
        ...historyMessages,
        { role: "user", content: attempt.userContent },
      ],
    }),
  });
}

export async function chatViaGroq(
  message: string,
  sessionId?: string | null,
  fileContextBlock?: string,
  opts?: {
    maxTokens?: number;
    filenames?: string[];
    pageContextBlock?: string;
    knowledgeBlock?: string;
    userFactsBlock?: string;
    history?: ThreadMessage[];
    model?: string;
  }
): Promise<{ response: string; session_id: string; model: string }> {
  if (!GROQ_API_KEY) throw new Error("groq_not_configured");

  const sid = sessionId ?? crypto.randomUUID();
  const userContent = fileContextBlock
    ? `${message.trim()}\n\n${fileContextBlock}`
    : message.trim();

  const hasFiles = Boolean(fileContextBlock?.trim());
  const dealEval = isDealOrHighStakesEvaluation(message, {
    hasFileContext: hasFiles,
    filenames: opts?.filenames,
  });
  const primaryModel = opts?.model ?? resolveGroqModel();
  const maxTokens =
    opts?.maxTokens ??
    resolveGroqMaxTokens(message, {
      fileContextBlock,
      filenames: opts?.filenames,
    });

  const promptOpts = {
    filenames: opts?.filenames,
    hasFileContext: hasFiles,
    pageContextBlock: opts?.pageContextBlock,
    knowledgeBlock: opts?.knowledgeBlock,
    userFactsBlock: opts?.userFactsBlock,
  };

  void dealEval;
  const attempt: GroqAttempt = {
    model: primaryModel,
    maxTokens,
    system: buildBrokSystemPrompt(message, promptOpts),
    userContent,
    history: opts?.history,
  };

  let lastErr = "";
  let lastStatus = 502;

  let res: Response;
  try {
    res = await groqCompletion(attempt);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    throw parseGroqFailure(lastErr, 502);
  }

  if (res.ok) {
    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
    };
    let response = data.choices?.[0]?.message?.content?.trim() ?? "";
    const finish = data.choices?.[0]?.finish_reason;

    if (response && finish === "length" && attempt.maxTokens >= 1200) {
      try {
        const cont = await groqCompletion({
          ...attempt,
          maxTokens: Math.min(1500, attempt.maxTokens),
          userContent:
            "Continue the previous answer from exactly where it stopped. Do not restart or renumber. Finish remaining points completely.",
          history: [
            ...(attempt.history ?? []),
            { role: "user", content: userContent },
            { role: "assistant", content: response },
          ],
          system:
            attempt.system +
            "\n\nCONTINUATION: Complete the unfinished answer only. No preamble.",
        });
        if (cont.ok) {
          const contData = (await cont.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const more = contData.choices?.[0]?.message?.content?.trim();
          if (more) {
            response = `${response.trim()}\n\n${more}`.trim();
          }
        }
      } catch {
        /* keep partial */
      }
    }

    if (!response) throw new Error("groq_empty_response");
    return { response, session_id: sid, model: attempt.model };
  }

  lastErr = await res.text();
  lastStatus = res.status;
  throw parseGroqFailure(lastErr, lastStatus);
}
