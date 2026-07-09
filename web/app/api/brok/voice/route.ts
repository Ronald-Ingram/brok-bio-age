import {
  cartesiaVoiceAllowed,
  resolvedVoiceProvider,
  voiceCloneConfigured,
  xttsVoicePreferred,
} from "@/lib/brokApiConfig";
import { synthesizeCartesiaWavBlob } from "@/lib/cartesiaSynthesis";
import { normalizeForSpeech } from "@/lib/spokenText";
import { synthesizeXttsWavBlob } from "@/lib/xttsSynthesis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Speak text — Cartesia (default) or BROK Voice Clone when explicitly enabled. */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    text?: string;
    provider?: "cartesia" | "xtts";
    fullLength?: boolean;
  };

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const spoken = normalizeForSpeech(text);
  const preferXtts =
    body.provider === "xtts" ||
    (body.provider !== "cartesia" && xttsVoicePreferred());

  if (!preferXtts && cartesiaVoiceAllowed()) {
    try {
      const { wav, segments } = await synthesizeCartesiaWavBlob(spoken, {
        fullLength: body.fullLength,
      });
      return new NextResponse(new Uint8Array(wav), {
        headers: {
          "Content-Type": "audio/wav",
          "X-Voice-Provider": "cartesia",
          "X-Voice-Segments": String(segments),
        },
      });
    } catch (e) {
      if (!voiceCloneConfigured()) {
        const msg = e instanceof Error ? e.message : "cartesia_failed";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }
  }

  if (preferXtts && voiceCloneConfigured()) {
    try {
      const { wav, segments } = await synthesizeXttsWavBlob(spoken, {
        fullLength: body.fullLength,
      });
      return new NextResponse(new Uint8Array(wav), {
        headers: {
          "Content-Type": "audio/wav",
          "X-Voice-Provider": "xtts",
          "X-Voice-Segments": String(segments),
        },
      });
    } catch (e) {
      if (!cartesiaVoiceAllowed()) {
        const msg = e instanceof Error ? e.message : "xtts_failed";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }
  }

  if (cartesiaVoiceAllowed()) {
    try {
      const { wav, segments } = await synthesizeCartesiaWavBlob(spoken, {
        fullLength: body.fullLength,
      });
      return new NextResponse(new Uint8Array(wav), {
        headers: {
          "Content-Type": "audio/wav",
          "X-Voice-Provider": "cartesia",
          "X-Voice-Segments": String(segments),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "cartesia_failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      error: "voice_unavailable",
      hint: "Enable BROK Voice (Cartesia) or connect BROK Voice Clone for demos",
      provider: resolvedVoiceProvider(),
    },
    { status: 503 }
  );
}