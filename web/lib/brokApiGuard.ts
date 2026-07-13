import { ApiAuthError, requireAuthenticatedUser } from "./apiAuth";
import {
  assertChatRateLimit,
  PockMeterError,
  type MeterDebitResult,
} from "./pockMeteringServer";
import { NextResponse } from "next/server";

export function brokGuardResponse(
  err: unknown
): NextResponse | null {
  if (err instanceof ApiAuthError) {
    return NextResponse.json(
      { error: err.code, hint: err.message },
      { status: err.status }
    );
  }
  if (err instanceof PockMeterError) {
    return NextResponse.json(
      { error: err.code, hint: err.message },
      { status: err.status }
    );
  }
  return null;
}

export async function guardChatRequest(
  req: Request,
  userId?: string | null
): Promise<{ userId: string; meter?: MeterDebitResult }> {
  const uid = await requireAuthenticatedUser(req, userId);
  await assertChatRateLimit(uid);
  const { debitChatTurn } = await import("./pockMeteringServer");
  const meter = await debitChatTurn(uid);
  return { userId: uid, meter };
}