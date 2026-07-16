import { normalizePcmS16lePeak } from "./audioGain";
import { voiceCloneEndpoint } from "./brokApiConfig";
import { chunkTextForTts, MAX_TTS_SEGMENTS, TTS_CHUNK_CHARS } from "./speechChunks";
import { normalizeForSpeech } from "./spokenText";
import { wavToPcmS16leChunks } from "./wavPcm";

const XTTS_FETCH_MS = 40_000;
const TUNNEL_HEADERS = {
  "Bypass-Tunnel-Reminder": "1",
};

export async function fetchXttsWav(text: string): Promise<Buffer> {
  const endpoint = voiceCloneEndpoint();
  if (!endpoint) throw new Error("xtts_not_configured");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...TUNNEL_HEADERS,
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(XTTS_FETCH_MS),
  });

  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || ct.includes("text/html")) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(`xtts_speak_failed: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/** Synthesize long text as sequential XTTS calls; returns PCM base64 chunks for HeyGen. */
export async function synthesizeXttsPcmForHeyGen(
  text: string,
  opts?: { fullLength?: boolean }
): Promise<{ chunks: string[]; segments: number }> {
  const limit = opts?.fullLength ? 7_500 : 1_800;
  const normalized = normalizeForSpeech(text).slice(0, limit);
  const parts = chunkTextForTts(normalized, TTS_CHUNK_CHARS, MAX_TTS_SEGMENTS);

  const pcmBuffers: Buffer[] = [];
  for (const part of parts) {
    const wav = await fetchXttsWav(part);
    const b64chunks = wavToPcmS16leChunks(wav, 24_000);
    for (const b64 of b64chunks) {
      pcmBuffers.push(Buffer.from(b64, "base64"));
    }
  }

  const combined = normalizePcmS16lePeak(Buffer.concat(pcmBuffers), 0.88);
  const chunkBytes = 24_000 * 2;
  const out: string[] = [];
  for (let i = 0; i < combined.length; i += chunkBytes) {
    out.push(combined.subarray(i, i + chunkBytes).toString("base64"));
  }

  return {
    chunks: out.length ? out : [combined.toString("base64")],
    segments: parts.length,
  };
}

/** Concatenate WAV segments for browser playback. */
export async function synthesizeXttsWavBlob(
  text: string,
  opts?: { fullLength?: boolean }
): Promise<{ wav: Buffer; segments: number }> {
  const limit = opts?.fullLength ? 7_500 : 1_800;
  const normalized = normalizeForSpeech(text).slice(0, limit);
  const parts = chunkTextForTts(normalized, TTS_CHUNK_CHARS, MAX_TTS_SEGMENTS);

  const pcmParts: Buffer[] = [];
  for (const part of parts) {
    const wav = await fetchXttsWav(part);
    const pcmChunks = wavToPcmS16leChunks(wav, 24_000);
    for (const b64 of pcmChunks) {
      pcmParts.push(Buffer.from(b64, "base64"));
    }
  }

  const pcm = normalizePcmS16lePeak(Buffer.concat(pcmParts), 0.88);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24_000, 24);
  header.writeUInt32LE(48_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return { wav: Buffer.concat([header, pcm]), segments: parts.length };
}