import { boostPcmS16le } from "./audioGain";
import { CARTESIA_API_KEY } from "./brokApiConfig";
import { getActiveCartesiaVoiceId } from "./cartesiaClone";
import { chunkTextForTts } from "./speechChunks";
import { normalizeForSpeech } from "./spokenText";
const CARTESIA_VERSION = "2026-03-01";
const HEYGEN_PCM_SAMPLE_RATE = 24_000;
const CARTESIA_MODEL = "sonic-3.5";
const CARTESIA_CHUNK_CHARS = 1_500;
const CARTESIA_MAX_SEGMENTS = 16;
/** Clone voices often render soft on phone speakers — boost toward full loudness. */
const TTS_PCM_GAIN = 1.9;

function cartesiaHeaders(): Record<string, string> {
  if (!CARTESIA_API_KEY) throw new Error("cartesia_api_key_missing");
  return {
    Authorization: `Bearer ${CARTESIA_API_KEY}`,
    "Cartesia-Version": CARTESIA_VERSION,
    "Content-Type": "application/json",
  };
}

async function fetchCartesiaPcm(
  transcript: string,
  sampleRate: number
): Promise<Buffer> {
  const voiceId = await getActiveCartesiaVoiceId();
  const baseBody = {
    model_id: CARTESIA_MODEL,
    transcript,
    voice: { mode: "id" as const, id: voiceId },
    output_format: {
      container: "raw" as const,
      encoding: "pcm_s16le" as const,
      sample_rate: sampleRate,
    },
  };

  // Loudness first; if Cartesia rejects generation_config, retry plain body.
  let res = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: cartesiaHeaders(),
    body: JSON.stringify({
      ...baseBody,
      generation_config: { volume: 2, speed: 1 },
    }),
  });
  if (!res.ok) {
    res = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: cartesiaHeaders(),
      body: JSON.stringify(baseBody),
    });
  }

  if (!res.ok) {
    throw new Error(`cartesia_tts_failed: ${(await res.text()).slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function pcmToBase64Chunks(pcm: Buffer, sampleRate: number): string[] {
  const chunkBytes = sampleRate * 2;
  const chunks: string[] = [];
  for (let i = 0; i < pcm.length; i += chunkBytes) {
    chunks.push(pcm.subarray(i, i + chunkBytes).toString("base64"));
  }
  return chunks.length ? chunks : [pcm.toString("base64")];
}

export async function synthesizeCartesiaWavBlob(
  text: string,
  opts?: { fullLength?: boolean }
): Promise<{ wav: Buffer; segments: number }> {
  const limit = opts?.fullLength ? 12_000 : 4_000;
  const normalized = normalizeForSpeech(text).slice(0, limit);
  const parts = chunkTextForTts(
    normalized,
    CARTESIA_CHUNK_CHARS,
    CARTESIA_MAX_SEGMENTS
  );

  const pcmParts: Buffer[] = [];
  for (const part of parts) {
    pcmParts.push(await fetchCartesiaPcm(part, 24_000));
  }

  const pcm = boostPcmS16le(Buffer.concat(pcmParts), TTS_PCM_GAIN);
  return { wav: pcmToWav(pcm, 24_000), segments: parts.length };
}

export async function synthesizeCartesiaPcmForHeyGen(
  text: string,
  opts?: { fullLength?: boolean }
): Promise<{ chunks: string[]; segments: number }> {
  const limit = opts?.fullLength ? 12_000 : 4_000;
  const normalized = normalizeForSpeech(text).slice(0, limit);
  const parts = chunkTextForTts(
    normalized,
    CARTESIA_CHUNK_CHARS,
    CARTESIA_MAX_SEGMENTS
  );

  const pcmParts: Buffer[] = [];
  for (const part of parts) {
    pcmParts.push(
      await fetchCartesiaPcm(part, HEYGEN_PCM_SAMPLE_RATE)
    );
  }

  const pcm = boostPcmS16le(Buffer.concat(pcmParts), TTS_PCM_GAIN);
  return {
    chunks: pcmToBase64Chunks(pcm, HEYGEN_PCM_SAMPLE_RATE),
    segments: parts.length,
  };
}