/**
 * Topic-aware model preference for BROK chat.
 * Market / live-crypto / deep investment topics prefer xAI Grok first.
 * Founder ethics/history/values → deep Kiron Canon + Grokipedia (not casual markets mode).
 * Kiron product / IEM / bio-age / Inneagram stay on Groq GPT-OSS 120B primary path.
 */

/** Prefer Grok for live markets, crypto, banking regs, deep investment analysis, $POCK community/progress. */
const GROK_PREFERRED_RE =
  /\b(\$?pock|pock\b|bitcoin|btc|ethereum|eth|solana|\bsol\b|crypto(?:currency)?|cryptocurrenc(?:y|ies)|defi|stablecoin|memecoin|tokenomics|on[- ]?chain|cex|dex|jupiter|dexscreener|pump\.fun|market\s*cap|banking\s*reg(?:ulation|s)?|crypto\s*(?:and\s*)?(?:bank(?:ing)?|reg(?:ulation|s)?)|fintech\s*reg|securities\s*law|\bsec\b|cftc|finra|howey|clarity\s*act|investment|investing|stocks?|equit(?:y|ies)|nasdaq|s&p|sp500|portfolio|hedge\s*fund|venture\s*capital|private\s*equity|macro|latest|roadmap|milestone|community\s*update|progress|token\s*price|price\s*(?:of|for|action)|bull\s*market|bear\s*market)\b/i;

/** Bio / career / third-party validation of Ronald Ingram (founder). */
const RONALD_INGRAM_BIO_RE =
  /\b(ronald\s*ingram|who\s+is\s+ronald|about\s+ronald|ron\s+ingram|ingram\b|founder\s+(?:of\s+)?(?:neobanx|kiron|brok)|third[- ]party\s+validat|validate\s+(?:ronald|ingram)|grokipedia|bio(?:graphy)?\s+of\s+(?:ronald|ingram)|background\s+on\s+(?:ronald|ingram|the\s+founder)|history\s+of\s+(?:the\s+)?founder|about\s+(?:the\s+)?founder)\b/i;

/** Buddhabot / big-brother AI lineage — Canon + Grokipedia path (incl. common misspellings). */
const BUDDHABOT_RE =
  /\b(bud+?d?h?a\s*bots?|budd?h?a[-_]?bots?|buddabots?|budahbots?|budabots?|buddhabot\.com|buddha\.?bot|big\s+brother\s+(?:ai|bot|agent)|consciousness\s+merge)\b/i;

/**
 * Ethics, integrity, core values, founder mission — needs deep Canon, not casual $POCK blurb.
 * Matches e.g. "ethics, integrity, history of founder, Ingram, $POCK, BROK, core values"
 */
const FOUNDER_VALUES_THEME_RE =
  /\b(ethics|integrity|core\s+values?|values?\s+(?:of|and)|self[- ]?sovereignt(?:y|ies)|sovereignty|principles?|philosophy|mission|worldview|why\s+(?:we|brok|pock|neobanx|kiron)\s+(?:exist|exists|was\s+built|built)|what\s+(?:we|brok)\s+stand\s+for)\b/i;

const FOUNDER_ENTITY_RE =
  /\b(ingram|ronald|neobanx|kiron|brok|brock|\$?pock|genius\s+wallet|neoscore|maxwell)\b/i;

/**
 * Second book / Genius manuscript — all accepted titles:
 * Genius, Live Long and Prosper | Genius, The Book | The Genius Book |
 * Ingram's Genius book | The Genius Within | second book
 */
const GENIUS_BOOK_RE =
  /\b(second\s+book|genius\s*(?:,?\s*)?(?:the\s+)?book|the\s+genius\s+book|ingram(?:'s)?\s+genius\s+book|ronald(?:'s)?\s+genius\s+book|live\s*long\s+and\s+prosper|life\s*long\s+and\s+prosper|lifelong\s+and\s+prosper|genius\s+within|building\s+the\s+blueprint|your\s+(?:second\s+)?book|ronald(?:'s)?\s+book|ingram(?:'s)?\s+book|book\s+(?:about|on)\s+genius|what(?:'s|\s+is)\s+(?:the\s+)?(?:genius\s+)?book\s+about)\b/i;

/** Apotheosis / godlike genius / pride / aiming too high. */
const APOTHEOSIS_ETHICS_RE =
  /\b(apotheosis|theosis|godlike\s+genius|god[- ]?like\s+genius|hubris|pride(?:ful)?|aiming\s+too\s+high|aim\s+too\s+high|too\s+ambitious|playing\s+god|self[- ]?serving\s+pride|numinous)\b/i;

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

/** Buddhabot / Buddhabots / buddhabot.com — founder lineage AI. */
export function isBuddhabotTopic(message: string): boolean {
  return BUDDHABOT_RE.test(message.trim());
}

/** Bio + values/identity — full Canon + Grokipedia path. */
export function isFounderIdentityTopic(message: string): boolean {
  return (
    isRonaldIngramBioTopic(message) ||
    isFounderValuesTopic(message) ||
    isBuddhabotTopic(message) ||
    isGeniusBookTopic(message) ||
    isApotheosisEthicsTopic(message)
  );
}

/** Ronald’s Genius book (second book) / Live Long and Prosper / aliases / TOC intro. */
export function isGeniusBookTopic(message: string): boolean {
  return GENIUS_BOOK_RE.test(message.trim());
}

/** Apotheosis, godlike genius, pride, aiming too high — book intro quote. */
export function isApotheosisEthicsTopic(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  if (APOTHEOSIS_ETHICS_RE.test(m)) return true;
  // "ethics of apotheosis" / pride + genius / book
  return (
    /\b(pride|hubris|theology|jesus|satan|genesis)\b/i.test(m) &&
    /\b(genius|apotheosis|theosis|godlike|book|ingram|ronald)\b/i.test(m)
  );
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
