import { requireAuthenticatedUser } from "@/lib/apiAuth";
import { brokGuardResponse } from "@/lib/brokApiGuard";
import { synthesizeHeyGenPcmChunks } from "@/lib/heygenLiveAvatar";
import { debitAvatarBlock } from "@/lib/pockMeteringServer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    text?: string;
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
    const meter = await debitAvatarBlock(userId);
    meterCost = meter.meter_cost;
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    throw e;
  }

  try {
    const chunks = await synthesizeHeyGenPcmChunks(text, {
      fullLength: body.fullLength,
    });
    return NextResponse.json({
      chunks,
      sampleRate: 24000,
      encoding: "pcm_s16le",
      segmentCount: body.fullLength ? "chunked" : 1,
      meter_cost: meterCost,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "speak_failed";
    return NextResponse.json(
      {
        error: msg,
        hint:
          msg.includes("brok_voice_clone")
            ? "Connect BROK Voice Clone (Neobanx voice service) for lip-sync audio"
            : undefined,
      },
      { status: 502 }
    );
  }
}