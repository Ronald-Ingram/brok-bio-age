import { extractSentences, normalizeForSpeech } from "./spokenText";

/** XTTS stays responsive under ~350 chars per synthesis call. */
export const TTS_CHUNK_CHARS = 350;

/** Max segments for one full-length read (keeps total under Vercel timeout). */
export const MAX_TTS_SEGMENTS = 24;

export function chunkTextForTts(
  text: string,
  maxChunkChars = TTS_CHUNK_CHARS,
  maxSegments = MAX_TTS_SEGMENTS
): string[] {
  const normalized = normalizeForSpeech(text);
  if (!normalized) return [];

  if (normalized.length <= maxChunkChars) return [normalized];

  const sentences = extractSentences(normalized);
  const chunks: string[] = [];
  let buf = "";

  for (const sentence of sentences) {
    const next = buf ? `${buf} ${sentence}` : sentence;
    if (next.length > maxChunkChars && buf) {
      chunks.push(buf.trim());
      buf = sentence;
    } else {
      buf = next;
    }
    if (chunks.length >= maxSegments) break;
  }

  if (buf.trim() && chunks.length < maxSegments) {
    chunks.push(buf.trim());
  }

  if (!chunks.length) {
    return [normalized.slice(0, maxChunkChars)];
  }

  return chunks;
}