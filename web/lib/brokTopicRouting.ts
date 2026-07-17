/**
 * Topic-aware model preference for BROK chat.
 * Market / live-crypto / deep investment topics prefer xAI Grok first.
 * Founder ethics/history/values → deep Kiron Canon + Grokipedia (not casual markets mode).
 * Kiron product / IEM / bio-age / Inneagram stay on Groq 70B primary path.
 */

/** Prefer Grok for live markets, crypto, banking regs, deep investment analysis, $POCK community/progress. */
const GROK_PREFERRED_RE =
  /\b(\$?pock|pock\b|bitcoin|btc|ethereum|eth|solana|\bsol\b|crypto(?:currency)?|cryptocurrenc(?:y|ies)|defi|stablecoin|memecoin|tokenomics|on[- ]?chain|cex|dex|jupiter|dexscreener|pump\.fun|market\s*cap|banking\s*reg(?:ulation|s)?|crypto\s*(?:and\s*)?(?:bank(?:ing)?|reg(?:ulation|s)?)|fintech\s*reg|securities\s*law|\bsec\b|cftc|finra|howey|clarity\s*act|investment|investing|stocks?|equit(?:y|ies)|nasdaq|s&p|sp500|portfolio|hedge\s*fund|venture\s*capital|private\s*equity|macro|latest|roadmap|milestone|community\s*update|progress|token\s*price|price\s*(?:of|for|action)|bull\s*market|bear\s*market)\b/i;

/** Bio / career / third-party validation of Ronald Ingram (founder). */
const RONALD_INGRAM_BIO_RE =
  /\b(ronald\s*ingram|who\s+is\s+ronald|about\s+ronald|ron\s+ingram|ingram\b|founder\s+(?:of\s+)?(?:neobanx|kiron|brok)|third[- ]party\s+validat|validate\s+(?:ronald|ingram)|grokipedia|bio(?:graphy)?\s+of\s+(?:ronald|ingram)|background\s+on\s+(?:ronald|ingram|the\s+founder)|history\s+of\s+(?:the\s+)?founder|about\s+(?:the\s+)?founder)\b/i;

/**
 * Ethics, integrity, core values, founder mission — needs deep Canon, not casual $POCK blurb.
 * Matches e.g. "ethics, integrity, history of founder, Ingram, $POCK, BROK, core values"
 */
const FOUNDER_VALUES_THEME_RE =
  /\b(ethics|integrity|core\s+values?|values?\s+(?:of|and)|self[- ]?sovereignt(?:y|ies)|sovereignty|principles?|philosophy|mission|worldview|why\s+(?:we|brok|pock|neobanx|kiron)\s+(?:exist|exists|was\s+built|built)|what\s+(?:we|brok)\s+stand\s+for)\b/i;

const FOUNDER_ENTITY_RE =
  /\b(ingram|ronald|neobanx|kiron|brok|brock|\$?pock|genius\s+wallet|neoscore|maxwell)\b/i;

const LIVE_PROGRESS_RE =
  /\b(progress|latest|update|community|roadmap|milestone|development|news|launch|soft\s*launch)\b/i;

export function prefersGrokPrimary(message: string): boolean {
  return GROK_PREFERRED_RE.test(message.trim());
}

export function isRonaldIngramBioTopic(message: string): boolean {
  return RONALD_INGRAM_BIO_RE.test(message.trim());
}

/** Founder ethics / integrity / values / multi-theme identity questions. */
export function isFounderValuesTopic(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  if (FOUNDER_VALUES_THEME_RE.test(m) && FOUNDER_ENTITY_RE.test(m)) return true;
  if (FOUNDER_VALUES_THEME_RE.test(m) && isRonaldIngramBioTopic(m)) return true;
  // Multi-theme lists: ethics + integrity + history + founder + product names
  const hits =
    m.match(
      /\b(ethics|integrity|history|values?|founder|ingram|ronald|\$?pock|brok|neobanx|kiron|sovereignty)\b/gi
    ) ?? [];
  const unique = new Set(hits.map((h) => h.toLowerCase()));
  return unique.size >= 3 && FOUNDER_ENTITY_RE.test(m);
}

/** Bio + values/identity — full Canon + Grokipedia path. */
export function isFounderIdentityTopic(message: string): boolean {
  return isRonaldIngramBioTopic(message) || isFounderValuesTopic(message);
}

/**
 * Live progress / markets mode: X feed primary, shorter Canon.
 * Excludes founder identity/values so ethics questions get deep Canon.
 */
export function isLiveProgressTopic(message: string): boolean {
  const m = message.trim();
  if (isFounderIdentityTopic(m)) return false;
  return (
    prefersGrokPrimary(m) ||
    LIVE_PROGRESS_RE.test(m) ||
    (/\$?pock\b/i.test(m) && LIVE_PROGRESS_RE.test(m))
  );
}

/** True when we should inject Grokipedia as preferred third-party source. */
export function wantsThirdPartyValidation(message: string): boolean {
  const m = message.trim();
  return (
    isFounderIdentityTopic(m) ||
    /\b(third[- ]party|independent\s+source|external\s+source|validate|validation|fact[- ]?check|grokipedia|wikipedia)\b/i.test(
      m
    )
  );
}

/** Multi-theme founder questions warrant detailed answers without "go deep". */
export function wantsFounderDetailedAnswer(message: string): boolean {
  return isFounderIdentityTopic(message);
}
