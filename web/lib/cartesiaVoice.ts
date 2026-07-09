import { CARTESIA_API_KEY, CARTESIA_VOICE_ID } from "./brokApiConfig";
import {
  getActiveCartesiaVoiceId,
  isBrokCloneVoice,
} from "./cartesiaClone";

export interface CartesiaVoiceInfo {
  id: string;
  name: string;
  description?: string;
  language?: string;
}

export async function fetchCartesiaVoiceInfo(): Promise<CartesiaVoiceInfo | null> {
  if (!CARTESIA_API_KEY) return null;

  let voiceId = CARTESIA_VOICE_ID;
  try {
    voiceId = await getActiveCartesiaVoiceId();
  } catch {
    if (!voiceId) return null;
  }

  const res = await fetch(`https://api.cartesia.ai/voices/${voiceId}`, {
    headers: {
      "Cartesia-Version": "2024-06-10",
      "X-API-Key": CARTESIA_API_KEY,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) return { id: voiceId, name: "configured" };

  const data = (await res.json()) as {
    id?: string;
    name?: string;
    description?: string;
    language?: string;
  };

  const info: CartesiaVoiceInfo = {
    id: data.id ?? voiceId,
    name: data.name ?? "configured",
    description: data.description,
    language: data.language,
  };

  return {
    ...info,
    isBrokClone: isBrokCloneVoice(info),
  } as CartesiaVoiceInfo & { isBrokClone?: boolean };
}