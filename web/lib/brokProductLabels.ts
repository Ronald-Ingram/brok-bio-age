/** User-facing Neobanx product names — hide third-party stack vendors in UI. */

export const BROK_AVATAR_LABEL = "BROK Live Avatar";
export const BROK_VOICE_LABEL = "BROK Voice";
export const BROK_VOICE_CLONE_LABEL = "BROK Voice Clone";
export const BROK_INTELLIGENCE_LABEL = "BROK Intelligence";
export const BROK_GENIUS_LABEL = "BROK Genius";
export const KIRON_CANON_LABEL = "Kiron Canon";

export function voiceDisplayName(opts: {
  voiceCloneReady?: boolean;
  voiceProvider?: string | null;
}): string {
  if (opts.voiceProvider === "cartesia_clone") return BROK_VOICE_CLONE_LABEL;
  if (opts.voiceProvider === "xtts" || opts.voiceCloneReady) {
    return BROK_VOICE_CLONE_LABEL;
  }
  if (
    opts.voiceProvider === "cartesia_stock" ||
    opts.voiceProvider === "cartesia"
  ) {
    return BROK_VOICE_LABEL;
  }
  return BROK_VOICE_LABEL;
}

export function chatProviderLabel(provider?: string | null): string {
  if (provider === "brok_api") return BROK_INTELLIGENCE_LABEL;
  if (provider === "groq_fallback") return BROK_INTELLIGENCE_LABEL;
  if (provider === "brok_backup") return BROK_INTELLIGENCE_LABEL;
  if (provider === "xai" || provider === "grok") return BROK_GENIUS_LABEL;
  return BROK_INTELLIGENCE_LABEL;
}

/**
 * Map internal model IDs / provider tags to product labels for end users.
 * Admin may show raw IDs; never leak "grok-3", "gpt-oss", etc. outside admin.
 */
export function modelDisplayLabel(
  model?: string | null,
  provider?: string | null
): string {
  const m = (model ?? "").toLowerCase();
  const p = (provider ?? "").toLowerCase();
  if (
    p === "xai" ||
    p === "grok" ||
    m.includes("grok") ||
    m.startsWith("xai:")
  ) {
    return BROK_GENIUS_LABEL;
  }
  if (
    p.includes("groq") ||
    m.includes("gpt-oss") ||
    m.includes("llama") ||
    m.includes("qwen") ||
    m.startsWith("groq:")
  ) {
    return BROK_INTELLIGENCE_LABEL;
  }
  if (p) return chatProviderLabel(p);
  if (m) return BROK_INTELLIGENCE_LABEL;
  return BROK_INTELLIGENCE_LABEL;
}

export function modelRouteLabel(id: string, fallback: string): string {
  switch (id) {
    case "kiron_canon":
      return KIRON_CANON_LABEL;
    case "grok":
      return BROK_GENIUS_LABEL;
    case "groq":
      return BROK_INTELLIGENCE_LABEL;
    case "vertex":
      return "Neobanx Cloud";
    case "ollama":
      return BROK_INTELLIGENCE_LABEL;
    default:
      return fallback.includes("Grok") || fallback.includes("Groq")
        ? BROK_INTELLIGENCE_LABEL
        : fallback;
  }
}

/** Vendor / infra strings that must never appear in user-facing text or errors. */
const VENDOR_PHRASE_RE =
  /\b(xAI|xai|OpenAI|Anthropic|Claude|Gemini|Google\s*AI|Vertex|Cartesia|HeyGen|LiveAvatar|LiveKit|ElevenLabs|Cerebras|Together\.?AI|DeepSeek|Meta\s*AI)\b/gi;

const MODEL_ID_RE =
  /\b(grok[-\s]?\d*(?:\.\d+)?(?:-mini|-fast|-2|-3|-4)?|gpt-oss(?:-\d+b)?|llama[-\s]?\d+(?:\.\d+)?(?:-\d+b)?(?:-[a-z0-9-]+)?|qwen[-\s]?\d*(?:\.\d+)?(?:-\d+b)?|claude-[\w.-]+|gpt-4[\w.-]*|o\d+-mini)\b/gi;

const STACK_PATH_RE =
  /\b(groq_fallback|brok_backup|used_backup|backup path|openai\/[^\s,]+|api\.x\.ai|api\.groq\.com)\b/gi;

/**
 * Strip vendor/model leakage from chat answers, hints, and non-admin errors.
 * Keeps "Grokipedia" (public product name / URL brand) intact.
 */
export function sanitizeUserFacingText(raw: string): string {
  if (!raw) return raw;
  let s = raw;
  // Protect Grokipedia from Grok-stripping
  s = s.replace(/Grokipedia/gi, "\u0000GROKIPEDIA\u0000");
  s = s.replace(VENDOR_PHRASE_RE, "BROK");
  s = s.replace(/\bGroq\b/gi, "BROK Intelligence");
  s = s.replace(/\bGrok\b/gi, "BROK Genius");
  s = s.replace(MODEL_ID_RE, (match) => {
    const lower = match.toLowerCase();
    if (lower.includes("grok")) return BROK_GENIUS_LABEL;
    return BROK_INTELLIGENCE_LABEL;
  });
  s = s.replace(STACK_PATH_RE, "BROK Intelligence");
  s = s.replace(/powered by (?:xAI|OpenAI|Anthropic|Groq)\b/gi, "powered by BROK");
  s = s.replace(/\u0000GROKIPEDIA\u0000/g, "Grokipedia");
  // Collapse awkward doubles
  s = s.replace(/BROK Intelligence Intelligence/g, "BROK Intelligence");
  s = s.replace(/BROK Genius Genius/g, "BROK Genius");
  return s;
}

/** User-facing error strings — product language only. */
export function sanitizeUserFacingError(raw: string): string {
  const cleaned = sanitizeUserFacingText(raw);
  const lower = cleaned.toLowerCase();
  if (
    lower.includes("rate_limit") ||
    lower.includes("tpd") ||
    lower.includes("tokens per day") ||
    lower.includes("busy")
  ) {
    return "BROK Intelligence is at capacity — try again in a moment.";
  }
  if (lower.includes("not_configured") || lower.includes("all_backends")) {
    return "BROK Intelligence is temporarily unavailable — try again shortly.";
  }
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}…` : cleaned;
}
