import { seedFaqToCanon } from "@/lib/brokKnowledge";
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await seedFaqToCanon();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "seed_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}