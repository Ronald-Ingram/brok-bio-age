import { assertAdmin, createAdminSessionToken } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Mint a short-lived admin session from the raw secret (optional fallback). */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    session: createAdminSessionToken(),
  });
}