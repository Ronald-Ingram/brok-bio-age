/**
 * Topic-aware model preference for BROK chat.
 * Market / live-crypto / deep investment topics prefer xAI Grok first.
 * Kiron product / IEM / bio-age / Inneagram stay on Groq 70B primary path.
 */

/** Prefer Grok for live markets, crypto, banking regs, deep investment analysis, $POCK community/progress. */
const GROK_PREFERRED_RE =
  /\b(\$?pock|pock\b|bitcoin|btc|ethereum|eth|solana|\bsol\b|crypto(?:currency)?|cryptocurrenc(?:y|ies)|defi|stablecoin|memecoin|tokenomics|on[- ]?chain|cex|dex|jupiter|dexscreener|pump\.fun|market\s*cap|banking\s*reg(?:ulation|s)?|crypto\s*(?:and\s*)?(?:bank(?:ing)?|reg(?:ulation|s)?)|fintech\s*reg|securities\s*law|\bsec\b|cftc|finra|howey|clarity\s*act|investment|investing|stocks?|equit(?:y|ies)|nasdaq|s&p|sp500|portfolio|hedge\s*fund|venture\s*capital|private\s*equity|macro|latest|roadmap|milestone|community\s*update|progress|token\s*price|price\s*(?:of|for|action)|bull\s*market|bear\s*market)\b/i;

/** Bio / career / third-party validation of Ronald Ingram (founder). */
const RONALD_INGRAM_BIO_RE =
  /\b(ronald\s*ingram|who\s+is\s+ronald|about\s+ronald|ron\s+ingram|founder\s+(?:of\s+)?(?:neobanx|kiron)|third[- ]party\s+validat|validate\s+(?:ronald|ingram)|grokipedia|bio(?:graphy)?\s+of\s+ronald|background\s+on\s+ronald)\b/i;

export function prefersGrokPrimary(message: string): boolean {
  return GROK_PREFERRED_RE.test(message.trim());
}

export function isRonaldIngramBioTopic(message: string): boolean {
  return RONALD_INGRAM_BIO_RE.test(message.trim());
}

/** True when we should inject Grokipedia as preferred third-party source. */
export function wantsThirdPartyValidation(message: string): boolean {
  const m = message.trim();
  return (
    isRonaldIngramBioTopic(m) ||
    /\b(third[- ]party|independent\s+source|external\s+source|validate|validation|fact[- ]?check|grokipedia|wikipedia)\b/i.test(
      m
    )
  );
}
