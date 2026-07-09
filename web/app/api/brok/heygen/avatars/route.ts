import { HEYGEN_API_KEY, CARTESIA_VOICE_ID } from "@/lib/brokApiConfig";
import { fetchCartesiaVoiceInfo } from "@/lib/cartesiaVoice";
import { LIVEAVATAR_API_BASE } from "@/lib/heygenLiveAvatar";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  if (!HEYGEN_API_KEY) {
    return NextResponse.json({ error: "heygen_not_configured" }, { status: 503 });
  }

  const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/avatars`, {
    headers: { "X-API-KEY": HEYGEN_API_KEY },
    next: { revalidate: 0 },
  });
  const json = (await res.json()) as {
    data?: {
      results?: Array<{
        id: string;
        name: string;
        status: string;
        type: string;
        preview_url?: string;
      }>;
    };
  };

  const avatars = json.data?.results ?? [];
  const cartesiaVoice = await fetchCartesiaVoiceInfo();

  return NextResponse.json({
    avatars,
    brokReferenceImage: "/brok-cyborg.jpg",
    brokReferenceAudio: "xtts_service/brok-reference.wav (local VM sample)",
    sandboxAvatarId: "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a",
    cartesiaVoice,
    cartesiaVoiceId: CARTESIA_VOICE_ID || null,
    voiceClone: {
      status: cartesiaVoice ? "active" : "missing",
      name: cartesiaVoice?.name ?? null,
      drives: "HeyGen lip-sync PCM + Cartesia browser fallback",
      recloneNote:
        "New clones from brok-reference.wav need Cartesia paid plan; Ronald - Thinker clone is already wired",
    },
    setupSteps: [
      "1. LiveAvatar: create Image Avatar from brok-cyborg.jpg → copy UUID",
      "2. Vercel: HEYGEN_AVATAR_ID=<uuid>, HEYGEN_SANDBOX=false",
      "3. Voice: CARTESIA_VOICE_ID already set (Ronald - Thinker clone)",
      "4. Optional: upgrade Cartesia → re-clone from brok-reference.wav at play.cartesia.ai/voices",
    ],
    setupHint:
      avatars.length === 0
        ? "Create Image Avatar at app.liveavatar.com, then disable sandbox"
        : "Set HEYGEN_AVATAR_ID to your BROK avatar UUID and HEYGEN_SANDBOX=false",
  });
}