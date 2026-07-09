import {
  BROK_HEYGEN_AVATAR_ID,
  HEYGEN_API_KEY,
  HEYGEN_AVATAR_ID,
  HEYGEN_SANDBOX_AVATAR_ID,
  cartesiaVoiceAllowed,
  heygenConfigured,
  voiceCloneConfigured,
  xttsVoicePreferred,
} from "./brokApiConfig";
import { synthesizeCartesiaPcmForHeyGen } from "./cartesiaSynthesis";
import { synthesizeXttsPcmForHeyGen } from "./xttsSynthesis";

export const LIVEAVATAR_API_BASE =
  process.env.LIVEAVATAR_API_BASE?.replace(/\/$/, "") ??
  "https://api.liveavatar.com";

/** Sandbox only when explicitly enabled AND using the Wayne test avatar. */
export const HEYGEN_SANDBOX =
  process.env.HEYGEN_SANDBOX?.trim().toLowerCase() === "true" &&
  HEYGEN_AVATAR_ID === HEYGEN_SANDBOX_AVATAR_ID;

/** PCM 16-bit mono 24 kHz — required by LiveAvatar LITE agent.speak */
export const HEYGEN_PCM_SAMPLE_RATE = 24_000;

interface LiveAvatarEnvelope<T> {
  code?: number;
  data?: T;
  message?: string;
}

export interface HeyGenSessionCredentials {
  sessionId: string;
  livekitUrl: string;
  livekitClientToken: string;
  wsUrl: string | null;
  maxSessionDuration: number | null;
  avatarId: string;
  isSandbox: boolean;
}

async function liveAvatarPost<T>(
  path: string,
  opts: { apiKey?: boolean; bearer?: string; body?: object }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.apiKey) {
    if (!HEYGEN_API_KEY) throw new Error("heygen_api_key_missing");
    headers["X-API-KEY"] = HEYGEN_API_KEY;
  }
  if (opts.bearer) {
    headers.Authorization = `Bearer ${opts.bearer}`;
  }

  const res = await fetch(`${LIVEAVATAR_API_BASE}${path}`, {
    method: "POST",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json()) as LiveAvatarEnvelope<T> & T;
  if (!res.ok) {
    const msg =
      (json as LiveAvatarEnvelope<T>).message ??
      JSON.stringify(json).slice(0, 300);
    throw new Error(`liveavatar_${res.status}: ${msg}`);
  }

  const data = (json as LiveAvatarEnvelope<T>).data ?? json;
  return data as T;
}

export async function createHeyGenLiveSession(): Promise<HeyGenSessionCredentials> {
  if (!heygenConfigured()) throw new Error("heygen_not_configured");

  const tokenData = await liveAvatarPost<{
    session_id: string;
    session_token: string;
  }>("/v1/sessions/token", {
    apiKey: true,
    body: {
      mode: "LITE",
      avatar_id: HEYGEN_AVATAR_ID,
      is_sandbox: HEYGEN_SANDBOX,
      video_settings: { quality: "medium", encoding: "H264" },
    },
  });

  const startData = await liveAvatarPost<{
    session_id: string;
    livekit_url: string;
    livekit_client_token: string;
    ws_url?: string | null;
    max_session_duration?: number | null;
  }>("/v1/sessions/start", {
    bearer: tokenData.session_token,
  });

  return {
    sessionId: startData.session_id,
    livekitUrl: startData.livekit_url,
    livekitClientToken: startData.livekit_client_token,
    wsUrl: startData.ws_url ?? null,
    maxSessionDuration: startData.max_session_duration ?? null,
    avatarId: HEYGEN_AVATAR_ID,
    isSandbox: HEYGEN_SANDBOX,
  };
}

export function brokHeyGenAvatarActive(): boolean {
  return HEYGEN_AVATAR_ID === BROK_HEYGEN_AVATAR_ID && !HEYGEN_SANDBOX;
}

export async function stopHeyGenLiveSession(sessionId: string): Promise<void> {
  try {
    await liveAvatarPost("/v1/sessions/stop", {
      apiKey: true,
      body: { session_id: sessionId, reason: "USER_CLOSED" },
    });
  } catch {
    /* best-effort */
  }
}

/** Generate PCM16 24kHz chunks as base64 for agent.speak */
export async function synthesizeHeyGenPcmChunks(
  text: string,
  opts?: { fullLength?: boolean }
): Promise<string[]> {
  if (cartesiaVoiceAllowed()) {
    try {
      const { chunks } = await synthesizeCartesiaPcmForHeyGen(text, opts);
      return chunks;
    } catch (e) {
      if (!xttsVoicePreferred() || !voiceCloneConfigured()) throw e;
      console.warn("BROK Voice unavailable, using voice clone fallback:", e);
    }
  }

  if (voiceCloneConfigured()) {
    const { chunks } = await synthesizeXttsPcmForHeyGen(text, opts);
    return chunks;
  }

  throw new Error("brok_voice_unavailable");
}