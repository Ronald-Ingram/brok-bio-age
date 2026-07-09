import {
  BROK_API_BASE,
  BROK_HEYGEN_AVATAR_ID,
  HEYGEN_AVATAR_ID,
  HEYGEN_SANDBOX_AVATAR_ID,
  brokApiConfigured,
  cartesiaConfigured,
  heygenConfigured,
  voiceCloneConfigured,
} from "@/lib/brokApiConfig";
import { HEYGEN_SANDBOX, brokHeyGenAvatarActive } from "@/lib/heygenLiveAvatar";
import { fetchCartesiaVoiceInfo } from "@/lib/cartesiaVoice";
import { BROK_CLONE_VOICE_NAME } from "@/lib/cartesiaClone";
import {
  BROK_AVATAR_LABEL,
  BROK_VOICE_CLONE_LABEL,
  BROK_VOICE_LABEL,
  KIRON_CANON_LABEL,
  chatProviderLabel,
  modelRouteLabel,
  voiceDisplayName,
} from "@/lib/brokProductLabels";
import { groqChatConfigured } from "@/lib/brokChatGroq";
import { DEFAULT_LLM_PROVIDER, MODEL_ROUTING } from "@/lib/modelRouterConfig";
import {
  PREFER_XTTS_VOICE,
  VOICE_PROVIDER,
  resolvedVoiceProvider,
  xttsVoicePreferred,
} from "@/lib/brokApiConfig";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  let brokHealth: Record<string, unknown> | null = null;
  if (brokApiConfigured()) {
    try {
      const res = await fetch(`${BROK_API_BASE}/health`, {
        next: { revalidate: 0 },
      });
      if (res.ok) brokHealth = await res.json();
    } catch {
      brokHealth = { status: "unreachable" };
    }
  }

  const groqFallback = groqChatConfigured();
  const cartesiaVoice = cartesiaConfigured() ? await fetchCartesiaVoiceInfo() : null;
  const activeProvider = resolvedVoiceProvider();
  const voiceProvider =
    activeProvider === "xtts"
      ? "xtts"
      : (cartesiaVoice as { isBrokClone?: boolean } | null)?.isBrokClone
        ? "cartesia_clone"
        : activeProvider === "cartesia"
          ? "cartesia_stock"
          : null;
  const voiceCloneReady = Boolean(
    (cartesiaVoice as { isBrokClone?: boolean } | null)?.isBrokClone ||
      (activeProvider === "xtts" && voiceCloneConfigured())
  );
  const voiceReady = Boolean(activeProvider);
  const chatProvider = brokApiConfigured()
    ? "brok_api"
    : groqFallback
      ? "groq_fallback"
      : null;

  return NextResponse.json({
    brokApi: brokApiConfigured(),
    brokApiUrl: BROK_API_BASE || null,
    brokHealth,
    chatReady: brokApiConfigured() || groqFallback,
    chatProvider,
    chatProviderLabel: chatProviderLabel(chatProvider),
    groqFallback,
    cartesia: cartesiaConfigured(),
    cartesiaVoice,
    voiceProvider,
    voiceLabel: voiceDisplayName({ voiceCloneReady, voiceProvider }),
    voiceProviderSetting: VOICE_PROVIDER,
    preferXttsVoice: PREFER_XTTS_VOICE,
    xttsVoicePreferred: xttsVoicePreferred(),
    voiceCloneReady,
    voiceReady,
    voiceCloneName: BROK_VOICE_CLONE_LABEL,
    voiceCloneHint:
      activeProvider === "cartesia"
        ? `${BROK_VOICE_LABEL} active — works on phone and all devices. Upgrade voice at play.cartesia.ai/voices for your clone.`
        : voiceCloneConfigured()
          ? `${BROK_VOICE_CLONE_LABEL} active via Neobanx voice service`
          : `Enable BROK Voice (Cartesia) for fast demos on any device`,
    heygen: heygenConfigured(),
    heygenSandbox: HEYGEN_SANDBOX,
    heygenAvatarId: heygenConfigured() ? HEYGEN_AVATAR_ID : null,
    heygenUsingCustomAvatar:
      heygenConfigured() && HEYGEN_AVATAR_ID !== HEYGEN_SANDBOX_AVATAR_ID,
    heygenBrokAvatarActive: brokHeyGenAvatarActive(),
    heygenBrokAvatarId: BROK_HEYGEN_AVATAR_ID,
    brokAvatarImage: "/brok-cyborg.jpg",
    avatarLabel: BROK_AVATAR_LABEL,
    voiceLabelFallback: BROK_VOICE_LABEL,
    heygenNeedsCartesiaForSpeak: activeProvider === "cartesia",
    llmProvider: DEFAULT_LLM_PROVIDER,
    modelRouting: MODEL_ROUTING.map((m) => ({
      id: m.id,
      label: modelRouteLabel(m.id, m.label),
      model: m.model,
      role: m.role,
    })),
    routingSummary: `${KIRON_CANON_LABEL} first → ${chatProviderLabel(chatProvider)}`,
  });
}