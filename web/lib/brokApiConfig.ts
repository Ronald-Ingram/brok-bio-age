/** BROK agent / avatar backend — neobanx API on VM or local */

export const BROK_API_BASE =
  process.env.BROK_API_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_BROK_API_URL?.replace(/\/$/, "") ??
  "";

/** Direct XTTS voice service (brok-reference.wav clone) — lighter than full BROK API. */
export const XTTS_URL = process.env.XTTS_URL?.replace(/\/$/, "") ?? "";

export function voiceCloneEndpoint(): string | null {
  if (BROK_API_BASE) return `${BROK_API_BASE}/voicebox/speak`;
  if (XTTS_URL) return `${XTTS_URL}/speak`;
  return null;
}

export function voiceCloneConfigured(): boolean {
  return Boolean(voiceCloneEndpoint());
}

export const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY?.trim() ?? "";
export const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY?.trim() ?? "";

/** HeyGen sandbox default — Wayne test face; never use in production. */
export const HEYGEN_SANDBOX_AVATAR_ID =
  "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

/** Approved BROK image avatar (ringram08) on LiveAvatar. */
export const BROK_HEYGEN_AVATAR_ID =
  "aca479e7-483b-4aca-ba55-ae8d13f54f6c";

const configuredAvatarId = process.env.HEYGEN_AVATAR_ID?.trim() ?? "";
export const HEYGEN_AVATAR_ID =
  configuredAvatarId &&
  configuredAvatarId !== HEYGEN_SANDBOX_AVATAR_ID
    ? configuredAvatarId
    : BROK_HEYGEN_AVATAR_ID;

export const BROK_REFERENCE_IMAGE = "/brok-cyborg.jpg";

/** Cartesia voice ID — clone from reference sample when configured */
export const CARTESIA_VOICE_ID =
  process.env.CARTESIA_VOICE_ID?.trim() ?? "";

export function brokApiConfigured(): boolean {
  return BROK_API_BASE.length > 0;
}

export function cartesiaConfigured(): boolean {
  return Boolean(CARTESIA_API_KEY && CARTESIA_VOICE_ID);
}

/** cartesia = cloud TTS (phone-friendly); xtts = local clone; auto = cartesia unless PREFER_XTTS_VOICE. */
export type VoiceProviderSetting = "cartesia" | "xtts" | "auto";

export const VOICE_PROVIDER = (
  process.env.VOICE_PROVIDER?.trim().toLowerCase() ?? "cartesia"
) as VoiceProviderSetting;

/** When true with VOICE_PROVIDER=auto, prefer local BROK Voice Clone over Cartesia. */
export const PREFER_XTTS_VOICE =
  process.env.PREFER_XTTS_VOICE?.trim().toLowerCase() === "true";

export function xttsVoicePreferred(): boolean {
  if (VOICE_PROVIDER === "cartesia") return false;
  if (VOICE_PROVIDER === "xtts") return voiceCloneConfigured();
  return PREFER_XTTS_VOICE && voiceCloneConfigured();
}

export function cartesiaVoiceAllowed(): boolean {
  if (!cartesiaConfigured()) return false;
  if (VOICE_PROVIDER === "cartesia") return true;
  if (VOICE_PROVIDER === "xtts") return false;
  return !xttsVoicePreferred();
}

export function resolvedVoiceProvider(): "cartesia" | "xtts" | null {
  if (cartesiaVoiceAllowed()) return "cartesia";
  if (xttsVoicePreferred() && voiceCloneConfigured()) return "xtts";
  if (cartesiaConfigured()) return "cartesia";
  if (voiceCloneConfigured()) return "xtts";
  return null;
}

export function heygenConfigured(): boolean {
  return Boolean(HEYGEN_API_KEY && HEYGEN_AVATAR_ID);
}