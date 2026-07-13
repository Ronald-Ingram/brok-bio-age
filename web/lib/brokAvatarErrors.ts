import { BROK_AVATAR_LABEL } from "./brokProductLabels";

const VENDOR_RE =
  /heygen|liveavatar|cartesia|xtts|livekit|groq|openai|anthropic|gemini|vertex/gi;

/** User-facing avatar errors — never expose vendor names or internal stack codes. */
export function sanitizeBrokAvatarError(raw: string): string {
  const lower = raw.toLowerCase();

  if (
    lower.includes("403") ||
    lower.includes("402") ||
    lower.includes("credit") ||
    lower.includes("quota") ||
    lower.includes("billing")
  ) {
    return `${BROK_AVATAR_LABEL} session limit reached — toggle Avatar off or try again later.`;
  }

  if (lower.includes("not_configured") || lower.includes("api_key_missing")) {
    return `${BROK_AVATAR_LABEL} is temporarily unavailable. Text and voice still work.`;
  }

  if (
    lower.includes("ws_open_timeout") ||
    lower.includes("ws_timeout") ||
    lower.includes("connect_failed") ||
    lower.includes("session_failed") ||
    lower.includes("no_websocket")
  ) {
    return `${BROK_AVATAR_LABEL} could not connect — try toggling Avatar off and on.`;
  }

  if (
    lower.includes("ws_not_ready") ||
    lower.includes("ws_closed") ||
    lower.includes("ws_error")
  ) {
    return `${BROK_AVATAR_LABEL} connection interrupted — toggle Avatar or send again to reconnect.`;
  }

  if (lower.includes("speak_timeout") || lower.includes("speak_failed")) {
    return `BROK could not finish lip-sync for this reply — voice fallback if enabled.`;
  }

  if (/^(heygen_|liveavatar_|avatar_)/i.test(raw.trim())) {
    return `${BROK_AVATAR_LABEL} hit a temporary error — toggle off to save credits, or retry.`;
  }

  let cleaned = raw.replace(VENDOR_RE, "BROK");
  cleaned = cleaned.replace(/liveavatar_\d+/gi, "avatar_error");
  cleaned = cleaned.replace(/heygen_/gi, "avatar_");

  if (
    cleaned.length < 120 &&
    (cleaned.includes("_") || /^\w+:\s/.test(cleaned))
  ) {
    return `${BROK_AVATAR_LABEL} hit a temporary error — toggle off to save credits, or retry.`;
  }

  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}…` : cleaned;
}