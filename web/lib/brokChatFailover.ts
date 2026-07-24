/**
 * Multi-provider BROK chat failover.
 *
 * Default chain:
 *   1. Groq openai/gpt-oss-120b for product / Canon / IEM / bio-age
 *   2. xAI Grok on capacity failure
 *
 * Topic override (markets / crypto / regs / deep investments / Ronald bio validation):
 *   1. xAI Grok first
 *   2. Groq GPT-OSS 120B fallback
 *
 * User-facing labels stay Neobanx product names — never expose vendor in UI copy.
 */

import {
  buildBrokSystemPrompt,
  chatViaGroq,
  GroqChatError,
  groqChatConfigured,
  resolveGroqMaxTokens,
  resolveGroqModel,
} from "./brokChatGroq";
import type { ThreadMessage } from "./brokChatThreads";
import {
  isRonaldIngramBioTopic,
  prefersGrokPrimary,
} from "./brokTopicRouting";

export type BackupProviderId =
  | "xai"
  | "openai_compat"
  | "together"
  | "fireworks"
  | "cerebras"
  | "openai"
  | "ollama";

export type ChatProviderId = "groq_fallback" | "brok_backup" | BackupProviderId;

export interface BrokChatResult {
  response: string;
  session_id: string;
  model: string;
  /** Internal provider id for logs/status (not shown raw to end users). */
  provider: ChatProviderId;
  /** True when response came from a non-primary (non-Groq-primary) path. */
  used_backup: boolean;
  /** Optional capacity note safe for clients. */
  capacity_note?: string;
}

export class BrokChatFailoverError extends Error {
  readonly code: "all_backends_failed" | "not_configured";
  readonly retryAfterSec?: number;
  readonly attempts: string[];

  constructor(
    message: string,
    code: "all_backends_failed" | "not_configured",
    opts?: { retryAfterSec?: number; attempts?: string[] }
  ) {
    super(message);
    this.name = "BrokChatFailoverError";
    this.code = code;
    this.retryAfterSec = opts?.retryAfterSec;
    this.attempts = opts?.attempts ?? [];
  }
}

type Peer = {
  id: BackupProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Bearer auth; Ollama often accepts any key. */
  auth: boolean;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Configured backup peers in failover order. */
export function listBackupPeers(opts?: {
  /** Paid subscriber / payment received → premium xAI model (default grok-4.5). */
  paidAccess?: boolean;
}): Peer[] {
  const peers: Peer[] = [];

  const xaiKey = env("XAI_API_KEY");
  if (xaiKey) {
    const premium =
      env("XAI_PREMIUM_MODEL") || env("XAI_MODEL_PREMIUM") || "grok-4.5";
    const standard = env("XAI_MODEL") || "grok-3";
    peers.push({
      id: "xai",
      baseUrl: env("XAI_BASE_URL") || "https://api.x.ai/v1",
      apiKey: xaiKey,
      model: opts?.paidAccess ? premium : standard,
      auth: true,
    });
  }

  const failoverKey = env("CHAT_FAILOVER_API_KEY");
  const failoverBase = env("CHAT_FAILOVER_BASE_URL");
  const failoverModel = env("CHAT_FAILOVER_MODEL");
  if (failoverKey && failoverBase && failoverModel) {
    peers.push({
      id: "openai_compat",
      baseUrl: failoverBase.replace(/\/$/, ""),
      apiKey: failoverKey,
      model: failoverModel,
      auth: true,
    });
  }

  const together = env("TOGETHER_API_KEY");
  if (together) {
    peers.push({
      id: "together",
      baseUrl: "https://api.together.xyz/v1",
      apiKey: together,
      model: env("TOGETHER_MODEL") || "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      auth: true,
    });
  }

  const fireworks = env("FIREWORKS_API_KEY");
  if (fireworks) {
    peers.push({
      id: "fireworks",
      baseUrl: "https://api.fireworks.ai/inference/v1",
      apiKey: fireworks,
      model:
        env("FIREWORKS_MODEL") ||
        "accounts/fireworks/models/llama-v3p3-70b-instruct",
      auth: true,
    });
  }

  const cerebras = env("CEREBRAS_API_KEY");
  if (cerebras) {
    peers.push({
      id: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      apiKey: cerebras,
      model: env("CEREBRAS_MODEL") || "llama-3.3-70b",
      auth: true,
    });
  }

  const openai = env("OPENAI_API_KEY");
  if (openai) {
    peers.push({
      id: "openai",
      baseUrl: env("OPENAI_BASE_URL") || "https://api.openai.com/v1",
      apiKey: openai,
      model: env("OPENAI_MODEL") || "gpt-4o-mini",
      auth: true,
    });
  }

  const ollamaBase = env("OLLAMA_BASE_URL") || env("OLLAMA_HOST");
  // Only register Ollama when explicitly configured (avoid hanging on localhost in Vercel).
  if (ollamaBase) {
    const base = ollamaBase.replace(/\/$/, "").replace(/\/v1$/, "") + "/v1";
    peers.push({
      id: "ollama",
      baseUrl: base,
      apiKey: env("OLLAMA_API_KEY") || "ollama",
      model: env("OLLAMA_MODEL") || "llama3.1:70b",
      auth: Boolean(env("OLLAMA_API_KEY")),
    });
  }

  return peers;
}

export function backupPeersConfigured(): BackupProviderId[] {
  return listBackupPeers().map((p) => p.id);
}

export function anyChatBackendConfigured(): boolean {
  return groqChatConfigured() || listBackupPeers().length > 0;
}

export function chatFailoverSummary(): {
  groq: boolean;
  backups: BackupProviderId[];
  chain: string[];
  topicOverride: string;
} {
  const backups = backupPeersConfigured();
  const chain: string[] = [];
  if (groqChatConfigured()) {
    chain.push(`groq:${resolveGroqModel()}`);
  }
  for (const p of listBackupPeers()) {
    chain.push(`${p.id}:${p.model}`);
  }
  return {
    groq: groqChatConfigured(),
    backups,
    chain,
    topicOverride:
      "markets/crypto/regs/investments/Ronald-bio → xai:grok first, then groq gpt-oss-120b",
  };
}

function isFailoverWorthy(err: GroqChatError): boolean {
  if (err.code === "rate_limit" || err.code === "rate_limit_daily") return true;
  // Capacity / upstream failures only — not auth or bad-request errors.
  const m = err.message.toLowerCase();
  return /503|502|500|413|overloaded|capacity|unavailable|timeout|timed out|econnreset|fetch failed|upstream unavailable|request too large|tokens per minute|tpm|busy/i.test(
    m
  );
}

async function openAiCompatibleChat(
  peer: Peer,
  system: string,
  userContent: string,
  history: ThreadMessage[] | undefined,
  maxTokens: number
): Promise<string> {
  const historyMessages = (history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (peer.auth || peer.apiKey) {
    headers.Authorization = `Bearer ${peer.apiKey}`;
  }

  const controller = new AbortController();
  const timeoutMs = peer.id === "ollama" ? 55_000 : 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${peer.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: peer.model,
        temperature: 0.7,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          ...historyMessages,
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `${peer.id}_http_${res.status}:${errText.slice(0, 240)}`
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`${peer.id}_empty_response`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

const CAPACITY_NOTE =
  "BROK Intelligence is on backup capacity — reply quality may vary slightly.";

export async function chatWithFailover(
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
    /** Paid / payment-received users get premium xAI (grok-4.5) and Grok-first routing. */
    paidAccess?: boolean;
  }
): Promise<BrokChatResult> {
  const sid = sessionId ?? crypto.randomUUID();
  const attempts: string[] = [];
  let retryAfterSec: number | undefined;

  const maxTokens =
    opts?.maxTokens ??
    resolveGroqMaxTokens(message, {
      fileContextBlock,
      filenames: opts?.filenames,
    });

  const userContent = fileContextBlock
    ? `${message.trim()}\n\n${fileContextBlock}`
    : message.trim();

  const hasFiles = Boolean(fileContextBlock?.trim());
  const promptOpts = {
    filenames: opts?.filenames,
    hasFileContext: hasFiles,
    pageContextBlock: opts?.pageContextBlock,
    knowledgeBlock: opts?.knowledgeBlock,
    userFactsBlock: opts?.userFactsBlock,
  };

  const paidAccess = Boolean(opts?.paidAccess);
  const peers = listBackupPeers({ paidAccess });
  const xaiPeer = peers.find((p) => p.id === "xai");
  // Allow runtime model override (tests / admin)
  if (xaiPeer && opts?.model?.trim()) {
    xaiPeer.model = opts.model.trim();
  }
  const otherPeers = peers.filter((p) => p.id !== "xai");

  // Paid users: prefer premium xAI first for quality.
  // Free path: Grok-first only for markets / bio / when BROK_GROK_DEFAULT not false.
  // Groq remains capacity / product fallback.
  const topicWantsGrok =
    prefersGrokPrimary(message) || isRonaldIngramBioTopic(message);
  const grokDefault =
    process.env.BROK_GROK_DEFAULT?.trim().toLowerCase() !== "false";
  const grokFirst =
    Boolean(xaiPeer) &&
    (paidAccess || grokDefault || topicWantsGrok);

  const runXai = async (
    peer: Peer,
    asPrimary: boolean
  ): Promise<BrokChatResult | null> => {
    try {
      const system = buildBrokSystemPrompt(message, {
        ...promptOpts,
        compact: false,
      });
      const response = await openAiCompatibleChat(
        peer,
        system,
        userContent,
        opts?.history,
        maxTokens
      );
      console.info(
        `[brok_chat_failover] served via xai model=${peer.model} primary=${asPrimary}`
      );
      return {
        response,
        session_id: sid,
        model: peer.model,
        // Preferential Grok = primary for markets; log as xai so admin/UI show the real path.
        provider: "xai",
        used_backup: !asPrimary,
        capacity_note: asPrimary ? undefined : CAPACITY_NOTE,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push(`xai:fail`);
      console.warn("[brok_chat_failover] xai failed:", msg.slice(0, 200));
      return null;
    }
  };

  if (grokFirst && xaiPeer) {
    const hit = await runXai(xaiPeer, true);
    if (hit) {
      // Log as preferred Grok path; model field carries grok-3.
      return { ...hit, used_backup: false };
    }
  }

  // Default / after Grok-first miss: Groq GPT-OSS 120B
  if (groqChatConfigured()) {
    try {
      const result = await chatViaGroq(
        message,
        sid,
        fileContextBlock,
        opts
      );
      return {
        response: result.response,
        session_id: result.session_id,
        model: result.model,
        provider: "groq_fallback",
        used_backup: false,
      };
    } catch (e) {
      if (e instanceof GroqChatError) {
        attempts.push(`groq:${e.code}`);
        retryAfterSec = e.retryAfterSec ?? retryAfterSec;
        if (!isFailoverWorthy(e)) {
          throw e;
        }
        console.warn(
          "[brok_chat_failover] groq gpt-oss-120b failed, trying backups:",
          e.code,
          e.message.slice(0, 160)
        );
      } else {
        attempts.push("groq:exception");
        console.warn("[brok_chat_failover] groq exception:", e);
      }
    }
  } else {
    attempts.push("groq:not_configured");
  }

  // Capacity path: xAI if not already tried, then other peers
  if (!grokFirst && xaiPeer) {
    const hit = await runXai(xaiPeer, false);
    if (hit) return hit;
  }

  if (!groqChatConfigured() && peers.length === 0) {
    throw new BrokChatFailoverError(
      "BROK Intelligence is temporarily unavailable.",
      "not_configured",
      { attempts }
    );
  }

  let useCompact = true;
  for (const peer of otherPeers) {
    const system = buildBrokSystemPrompt(message, {
      ...promptOpts,
      knowledgeBlock: useCompact ? undefined : promptOpts.knowledgeBlock,
      userFactsBlock: useCompact ? undefined : promptOpts.userFactsBlock,
      compact: useCompact,
    });
    const tokens = Math.min(maxTokens, peer.id === "ollama" ? 1200 : 1600);

    try {
      const response = await openAiCompatibleChat(
        peer,
        system,
        userContent,
        opts?.history,
        tokens
      );
      console.info(
        `[brok_chat_failover] served via backup provider=${peer.id} model=${peer.model}`
      );
      return {
        response,
        session_id: sid,
        model: peer.model,
        provider: "brok_backup",
        used_backup: true,
        capacity_note: CAPACITY_NOTE,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push(`${peer.id}:fail`);
      console.warn(
        `[brok_chat_failover] ${peer.id} failed:`,
        msg.slice(0, 200)
      );
    }
  }

  throw new BrokChatFailoverError(
    retryAfterSec
      ? `BROK Intelligence is at capacity. Please retry in ~${Math.ceil(retryAfterSec / 60)} minute(s).`
      : "BROK Intelligence is at capacity right now. Please try again shortly.",
    "all_backends_failed",
    { retryAfterSec, attempts }
  );
}
