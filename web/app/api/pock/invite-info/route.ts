import { verifyInvite } from "@/lib/pockInvite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token_required" }, { status: 400 });
  }

  const payload = verifyInvite(token);
  if (!payload) {
    return NextResponse.json({ error: "invite_expired_or_invalid" }, { status: 400 });
  }

  return NextResponse.json({
    kind: payload.kind,
    amount: payload.amount,
    usdEquivalent: payload.usdEquivalent ?? null,
    recipientName: payload.recipientName ?? null,
    personalMessage: payload.personalMessage ?? null,
    senderName: payload.senderName ?? null,
    expiresAt: payload.exp,
  });
}