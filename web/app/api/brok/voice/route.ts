import { requireAuthenticatedUser } from "@/lib/apiAuth";
import {
  cartesiaVoiceAllowed,
  resolvedVoiceProvider,
  voiceCloneConfigured,
  xttsVoicePreferred,
} from "@/lib/brokApiConfig";
import { brokGuardResponse } from "@/lib/brokApiGuard";
import { synthesizeCartesiaWavBlob } from "@/lib/cartesiaSynthesis";
import { debitVoiceBlock } from "@/lib/pockMeteringServer";
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
    user_id?: string;
  };

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  let meterCost: number | undefined;
  try {
    const userId = await requireAuthenticatedUser(req, body.user_id);
    const meter = await debitVoiceBlock(userId);
    meterCost = meter.meter_cost;
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    throw e;
  }

  const spoken = normalizeForSpeech(text);
  const preferXtts =
    body.provider === "xtts" ||
    (body.provider !== "cartesia" && xttsVoicePreferred());

  const wavHeaders = (provider: string, segments: number) => ({
    "Content-Type": "audio/wav",
    "X-Voice-Provider": provider,
    "X-Voice-Segments": String(segments),
    "X-Meter-Cost": String(meterCost ?? ""),
  });

  if (!preferXtts && cartesiaVoiceAllowed()) {
    try {
      const { wav, segments } = await synthesizeCartesiaWavBlob(spoken, {
        fullLength: body.fullLength,
      });
      return new NextResponse(new Uint8Array(wav), { headers: wavHeaders("cartesia", segments) });
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
      return new NextResponse(new Uint8Array(wav), { headers: wavHeaders("xtts", segments) });
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
      return new NextResponse(new Uint8Array(wav), { headers: wavHeaders("cartesia", segments) });
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