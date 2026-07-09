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
      return fallback;
  }
}