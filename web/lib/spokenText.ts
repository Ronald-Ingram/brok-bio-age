export const CONTINUE_READING_CUE = "Continue reading below.";

/** Max spoken sentences when the full reply is longer (default excerpt mode). */
const MAX_SPOKEN_SENTENCES = 2;
const MAX_SPOKEN_CHARS = 480;

/** Cap for full-length read-aloud — chunked TTS stays within server timeout. */
export const MAX_FULL_SPOKEN_CHARS = 12_000;

const FULL_LENGTH_REQUEST_RE =
  /\b(full\s*length|read\s*(?:me\s*)?(?:the\s*)?(?:whole|entire|full|complete)|speak\s*(?:the\s*)?(?:whole|entire|full|complete)|read\s*all(?:\s*of\s*it)?|verbatim|out\s*loud\s*(?:all|everything|the\s*full)|complete\s*response|don't\s*truncate|do\s*not\s*truncate|no\s*truncat(?:e|ion))\b/i;

/** User asked for depth in the chat reply (written answer), not only spoken length. */
const DETAILED_ANSWER_RE =
  /\b(long\s*answer|detailed|in\s*detail|full\s*detail|more\s*detail|thorough|comprehensive|expand(?:\s*on)?|deep\s*dive|tell\s*me\s*everything|explain\s*(?:fully|thoroughly|in\s*depth|at\s*length)|go\s*deep|as\s*much\s*detail|full\s*(?:response|explanation|write[- ]?up)|don't\s*truncate|do\s*not\s*truncate|no\s*truncat(?:e|ion)|write\s*a\s*long)\b/i;

export function wantsFullLengthSpeech(userMessage: string): boolean {
  const m = userMessage.trim();
  return FULL_LENGTH_REQUEST_RE.test(m) || DETAILED_ANSWER_RE.test(m);
}

/** Prefer higher max_tokens + deeper Kiron Canon when the user asks for length/depth. */
export function wantsDetailedAnswer(userMessage: string): boolean {
  return DETAILED_ANSWER_RE.test(userMessage.trim()) || wantsFullLengthSpeech(userMessage);
}

export interface SpokenExcerptOptions {
  fullLength?: boolean;
}

/** Decimal-aware sentence split — avoids breaking "$1.5 million" at the period. */
export function extractSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences: string[] = [];
  let buf = "";

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    buf += ch;

    const isDecimalPoint =
      ch === "." &&
      i > 0 &&
      i + 1 < trimmed.length &&
      /\d/.test(trimmed[i - 1]!) &&
      /\d/.test(trimmed[i + 1]!);

    if (isDecimalPoint) continue;

    if (ch === "." || ch === "!" || ch === "?") {
      const next = trimmed[i + 1];
      const atEnd = i + 1 >= trimmed.length;
      const followedBySpace = next === " " || next === "\n";
      if (atEnd || followedBySpace) {
        const s = buf.trim();
        if (s) sentences.push(s);
        buf = "";
        if (followedBySpace) i++;
      }
    }
  }

  const tail = buf.trim();
  if (tail) sentences.push(tail);

  return sentences.length ? sentences : [trimmed];
}

/** BROK is always spoken "Brock" — soft short O, never "broke". */
function brokToBrock(text: string): string {
  return text
    .replace(/\bB\.?\s*R\.?\s*O\.?\s*K('s)?\b/gi, "Brock$1")
    .replace(/\bBrok('s)?\b/g, "Brock$1");
}

/**
 * Brand TTS rules:
 * - $POCK / POCK → always "Spock"
 * - Neobanx / Kiron: leave natural (do NOT spell out letter-by-letter)
 */
function brandPronunciationForSpeech(text: string): string {
  return text
    .replace(/\$POCK/gi, "Spock")
    .replace(/\bPOCK\b/gi, "Spock")
    // Undo accidental letter-spaced brands if model emits them
    .replace(/\bN\s*[\.\- ]\s*E\s*[\.\- ]\s*O\s*[\.\- ]\s*B\s*[\.\- ]\s*A\s*[\.\- ]\s*N\s*[\.\- ]\s*X\b/gi, "Neobanx")
    .replace(/\bK\s*[\.\- ]\s*I\s*[\.\- ]\s*R\s*[\.\- ]\s*O\s*[\.\- ]\s*N\b/gi, "Kiron");
}

/**
 * URLs must not be spoken character-by-character.
 * Markdown links → spoken label only; bare URLs → "see link".
 */
export function urlsForSpeech(text: string): string {
  let t = text;
  // [visible label](https://...) → "visible label, see link"
  t = t.replace(
    /\[([^\]]+)\]\(\s*https?:\/\/[^)\s]+\s*\)/gi,
    (_m, label: string) => {
      const clean = String(label).trim();
      if (!clean || /^https?:\/\//i.test(clean)) return "see link";
      return `${clean}, see link`;
    }
  );
  // Bare http(s) URLs (and common www.)
  t = t.replace(/\bhttps?:\/\/[^\s\]\)>"']+/gi, "see link");
  t = t.replace(/\bwww\.[^\s\]\)>"']+/gi, "see link");
  // Collapse "see link see link" / "see link, see link"
  t = t.replace(/(?:see link\s*,?\s*){2,}/gi, "see link ");
  // "See see link" / "see the see link" → natural phrasing
  t = t.replace(/\bsee\s+see link\b/gi, "see link");
  t = t.replace(/\b(see|view|open|visit|check)\s+(the\s+)?see link\b/gi, "see link");
  return t;
}

/** Expand currency/units for TTS so million/billion are never dropped. */
export function normalizeForSpeech(text: string): string {
  let t = urlsForSpeech(text);
  t = brokToBrock(t);
  t = brandPronunciationForSpeech(t);
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Tt]rillion)\b/g, "$1 $2 dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Bb]illion)\b/g, "$1 $2 dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Mm]illion)\b/g, "$1 $2 dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Tt]r)\b/g, "$1 trillion dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Bb])\b/g, "$1 billion dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Mm])\b/g, "$1 million dollars");
  t = t.replace(/\$(\d+(?:\.\d+)?)\s*([Kk])\b/g, "$1 thousand dollars");
  t = t.replace(
    /\$(\d+(?:\.\d+)?)(?=\s+(?!(?:million|billion|trillion|thousand)\b))/gi,
    "$1 dollars"
  );
  t = t.replace(/(\d+(?:\.\d+)?)\s*([Bb]illion)\b/g, "$1 $2");
  t = t.replace(/(\d+(?:\.\d+)?)\s*([Mm]illion)\b/g, "$1 $2");
  t = t.replace(/(\d+(?:\.\d+)?)\s*([Tt]rillion)\b/g, "$1 $2");

  t = t.replace(new RegExp(CONTINUE_READING_CUE.replace(/\./g, "\\."), "gi"), "");

  return t.replace(/\s+/g, " ").trim();
}

export function spokenExcerpt(
  text: string,
  opts?: SpokenExcerptOptions
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (opts?.fullLength) {
    const spoken =
      trimmed.length <= MAX_FULL_SPOKEN_CHARS
        ? trimmed
        : `${trimmed.slice(0, MAX_FULL_SPOKEN_CHARS).trim()}…`;
    return normalizeForSpeech(spoken);
  }

  const sentences = extractSentences(trimmed);
  const spokenParts: string[] = [];
  let charCount = 0;

  for (const sentence of sentences) {
    if (spokenParts.length >= MAX_SPOKEN_SENTENCES) break;
    if (charCount > 0 && charCount + sentence.length > MAX_SPOKEN_CHARS) break;
    spokenParts.push(sentence);
    charCount += sentence.length + 1;
  }

  let spoken = spokenParts.join(" ").trim();
  if (!spoken) {
    spoken =
      trimmed.length <= MAX_SPOKEN_CHARS
        ? trimmed
        : `${trimmed.slice(0, MAX_SPOKEN_CHARS).trim()} ${CONTINUE_READING_CUE}`;
    return normalizeForSpeech(spoken);
  }

  const spokenStart = trimmed.indexOf(spoken);
  const remainder =
    spokenStart >= 0
      ? trimmed.slice(spokenStart + spoken.length).trim()
      : trimmed.slice(spoken.length).trim();

  if (remainder.length > 0) {
    spoken = `${spoken} ${CONTINUE_READING_CUE}`;
  }

  return normalizeForSpeech(spoken);
}