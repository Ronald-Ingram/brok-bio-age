import { readFile } from "fs/promises";
import path from "path";
import { CARTESIA_API_KEY, CARTESIA_VOICE_ID } from "./brokApiConfig";

export const BROK_CLONE_VOICE_NAME = "Ronald Ingram BROK";

const CARTESIA_VERSION = "2026-03-01";

export interface CartesiaVoiceSummary {
  id: string;
  name: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
}

function cartesiaHeaders(): Record<string, string> {
  if (!CARTESIA_API_KEY) throw new Error("cartesia_api_key_missing");
  return {
    Authorization: `Bearer ${CARTESIA_API_KEY}`,
    "Cartesia-Version": CARTESIA_VERSION,
  };
}

export async function listCartesiaVoices(): Promise<CartesiaVoiceSummary[]> {
  const res = await fetch("https://api.cartesia.ai/voices", {
    headers: cartesiaHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`cartesia_list_voices_${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      name: string;
      description?: string;
      language?: string;
      is_public?: boolean;
    }>;
  };
  return (json.data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    language: v.language,
    isPublic: v.is_public,
  }));
}

export function findBrokCloneVoice(
  voices: CartesiaVoiceSummary[]
): CartesiaVoiceSummary | null {
  const exact = voices.find((v) => v.name === BROK_CLONE_VOICE_NAME);
  if (exact) return exact;
  return (
    voices.find((v) =>
      /ronald\s*ingram|brok\s*clone|brok\s*voice/i.test(v.name)
    ) ?? null
  );
}

export async function cloneBrokVoiceFromReference(): Promise<CartesiaVoiceSummary> {
  const clipPath = path.join(process.cwd(), "assets", "brok-reference-clip.wav");
  const clip = await readFile(clipPath);

  const form = new FormData();
  form.append("clip", new Blob([clip], { type: "audio/wav" }), "brok-reference-clip.wav");
  form.append("name", BROK_CLONE_VOICE_NAME);
  form.append("description", "Ronald Ingram voice clone from brok-reference.wav for BROK avatar");
  form.append("language", "en");

  const res = await fetch("https://api.cartesia.ai/voices/clone", {
    method: "POST",
    headers: cartesiaHeaders(),
    body: form,
  });

  if (!res.ok) {
    throw new Error(`cartesia_clone_failed_${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    id: string;
    name: string;
    description?: string;
    language?: string;
  };

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    language: data.language,
  };
}

let voiceIdCache: { id: string; at: number } | null = null;
const VOICE_CACHE_MS = 5 * 60 * 1000;

/** Prefer Ronald Ingram BROK clone over stock Cartesia voices. */
export async function getActiveCartesiaVoiceId(): Promise<string> {
  if (!CARTESIA_API_KEY) throw new Error("cartesia_api_key_missing");

  const now = Date.now();
  if (voiceIdCache && now - voiceIdCache.at < VOICE_CACHE_MS) {
    return voiceIdCache.id;
  }

  try {
    const voices = await listCartesiaVoices();
    const brok = findBrokCloneVoice(voices);
    if (brok) {
      voiceIdCache = { id: brok.id, at: now };
      return brok.id;
    }
  } catch {
    /* fall through to configured id */
  }

  if (CARTESIA_VOICE_ID) return CARTESIA_VOICE_ID;
  throw new Error("cartesia_voice_id_missing");
}

export function isBrokCloneVoice(voice: CartesiaVoiceSummary | null): boolean {
  if (!voice) return false;
  if (voice.name === BROK_CLONE_VOICE_NAME) return true;
  return /ronald\s*ingram|brok\s*clone|brok\s*voice/i.test(voice.name);
}