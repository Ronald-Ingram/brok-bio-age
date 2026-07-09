import {
  BROK_INBOX_EMAIL,
  brokEmailConfigured,
  listBrokInbox,
  sendBrokEmail,
} from "@/lib/brokEmail";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-brok-og-admin")?.trim() === secret;
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!brokEmailConfigured()) {
    return NextResponse.json({
      configured: false,
      inbox: BROK_INBOX_EMAIL,
      hint:
        "Set BROK_GMAIL_CLIENT_ID, BROK_GMAIL_CLIENT_SECRET, BROK_GMAIL_REFRESH_TOKEN for info@neobanx.com read/write via Gmail API.",
    });
  }

  try {
    const messages = await listBrokInbox(15);
    return NextResponse.json({
      configured: true,
      inbox: BROK_INBOX_EMAIL,
      messages,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "inbox_failed";
    return NextResponse.json({ configured: true, error: msg }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!brokEmailConfigured()) {
    return NextResponse.json({ error: "brok_email_not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as { to?: string; subject?: string; body?: string };
  if (!body.to?.trim() || !body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    await sendBrokEmail({
      to: body.to.trim(),
      subject: body.subject.trim(),
      body: body.body.trim(),
    });
    return NextResponse.json({ ok: true, from: BROK_INBOX_EMAIL });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}