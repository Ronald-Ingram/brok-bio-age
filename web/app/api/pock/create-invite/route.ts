import {
  formatGiftShareMessage,
  formatGiftSmsMessage,
  giftClaimRegisterUrl,
} from "@/lib/giftPockMessage";
import {
  generateClaimPassword,
  inviteExpiresAt,
  isValidEmail,
  normalizePhone,
  signInvite,
} from "@/lib/pockInvite";
import { balanceUsdValue, fetchPockMarketQuote } from "@/lib/pockPrice";
import { absoluteUrl } from "@/lib/siteConfig";
import { siteOrigin } from "@/lib/stripeServer";
import { isTwilioConfigured, sendSms } from "@/lib/twilioSms";
import { NextResponse } from "next/server";
import { getUserSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_SENDER_NAME = "Ronald Ingram";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      amount?: number;
      phone?: string;
      email?: string;
      recipientBrokId?: string;
      recipientWallet?: string;
      inviteKind?: "transfer" | "gift";
      recipientName?: string;
      usdEquivalent?: number;
      personalMessage?: string;
      senderName?: string;
    };

    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
    }

    const phoneRaw = body.phone?.trim() ?? "";
    const emailRaw = body.email?.trim() ?? "";
    const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
    const email = emailRaw;

    const inviteKindEarly = body.inviteKind === "gift" ? "gift" : "transfer";

    if (!phone && !email && inviteKindEarly !== "gift") {
      return NextResponse.json({ error: "contact_required" }, { status: 400 });
    }
    if (phone && phone.length < 10 && !email && inviteKindEarly !== "gift") {
      return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    if (email && !isValidEmail(email) && !phone) {
      return NextResponse.json({ error: "email_invalid" }, { status: 400 });
    }

    const userClient = getUserSupabase(body.accessToken);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const senderId = authData.user.id;
    const inviteKind = body.inviteKind === "gift" ? "gift" : "transfer";
    const recipientName = body.recipientName?.trim();
    const recipientBrokId = body.recipientBrokId?.trim();

    let giftUsdEquivalent: number | undefined;
    let giftQuoteSource: "dexscreener" | "retail_anchor" | undefined;
    let giftUsdPerPock: number | undefined;
    if (inviteKind === "gift") {
      const quote = await fetchPockMarketQuote();
      giftUsdPerPock = quote.usdPerPock;
      giftQuoteSource = quote.source;
      giftUsdEquivalent = balanceUsdValue(amount, quote.usdPerPock);
    }
    const personalMessage = body.personalMessage?.trim();

    const { data: senderRow } = await userClient
      .from("brok_users")
      .select("display_name")
      .eq("id", senderId)
      .maybeSingle();

    const senderName =
      body.senderName?.trim() ||
      (senderRow?.display_name as string | null)?.trim() ||
      DEFAULT_SENDER_NAME;

    if (inviteKind === "gift" && (!recipientName || recipientName.length < 2)) {
      return NextResponse.json({ error: "recipient_name_required" }, { status: 400 });
    }

    if (recipientBrokId) {
      const { data: recipient } = await userClient
        .from("brok_users")
        .select("id")
        .eq("id", recipientBrokId)
        .maybeSingle();
      if (!recipient) {
        return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
      }
    }

    const claimPassword = generateClaimPassword(8);
    const token = signInvite({
      kind: inviteKind,
      senderId,
      amount,
      phone: phone || undefined,
      email: email || undefined,
      claimPassword,
      exp: inviteExpiresAt(72),
      recipientName: inviteKind === "gift" ? recipientName : undefined,
      usdEquivalent: inviteKind === "gift" ? giftUsdEquivalent : undefined,
      personalMessage: inviteKind === "gift" ? personalMessage : undefined,
      senderName: inviteKind === "gift" ? senderName : undefined,
    });

    const contactTail = email
      ? email.split("@")[0]?.slice(0, 6)
      : phone
        ? phone.slice(-4)
        : "";
    const giftContact =
      email || (phone ? `SMS …${contactTail}` : "link shared by sender");
    const note =
      inviteKind === "gift"
        ? `Gift to ${recipientName} · ${giftContact}`
        : recipientBrokId
          ? `Invite to ${recipientBrokId.slice(0, 8)}… · ${phone ? `SMS …${contactTail}` : email}`
          : `Invite · ${phone ? `SMS …${contactTail}` : email}`;

    const { error: debitErr } = await userClient.rpc("spend_pock", {
      p_amount: amount,
      p_kind: inviteKind === "gift" ? "gift_sent" : "transfer_out",
      p_note: note,
    });

    if (debitErr) {
      if (debitErr.message?.includes("insufficient_pock")) {
        return NextResponse.json({ error: "insufficient_pock" }, { status: 400 });
      }
      return NextResponse.json({ error: debitErr.message }, { status: 500 });
    }

    const origin = siteOrigin(req);
    const giftUrl = giftClaimRegisterUrl(token);
    const claimUrl =
      inviteKind === "gift"
        ? giftUrl
        : `${origin}/claim?token=${encodeURIComponent(token)}`;
    const registerUrl = inviteKind === "gift" ? giftUrl : null;

    const giftShareInput =
      inviteKind === "gift" && recipientName
        ? {
            recipientName,
            amount,
            usdEquivalent: giftUsdEquivalent ?? null,
            quoteSource: giftQuoteSource ?? null,
            giftUrl,
            senderName,
            personalMessage,
          }
        : null;

    const shareMessage = giftShareInput
      ? formatGiftShareMessage(giftShareInput)
      : `You received ${amount} $POCK from BROK. Claim: ${claimUrl} Password: ${claimPassword}`;

    const smsBody = giftShareInput
      ? formatGiftSmsMessage(giftShareInput)
      : shareMessage;

    const smsHint = shareMessage;

    let smsSent = false;
    let smsError: string | null = null;
    if (phone && isTwilioConfigured()) {
      const smsResult = await sendSms(phoneRaw || phone, smsBody);
      smsSent = smsResult.sent;
      smsError = smsResult.error ?? null;
      if (!smsResult.sent) {
        console.warn("Twilio SMS failed:", smsResult.error);
      }
    }

    return NextResponse.json({
      claimUrl,
      giftUrl: inviteKind === "gift" ? giftUrl : null,
      claimPassword: inviteKind === "gift" ? null : claimPassword,
      amount,
      phone: phone || null,
      email: email || null,
      recipientBrokId: recipientBrokId ?? null,
      recipientWallet: body.recipientWallet?.trim() || null,
      expiresInHours: 72,
      inviteKind,
      recipientName: recipientName ?? null,
      usdEquivalent: inviteKind === "gift" ? (giftUsdEquivalent ?? null) : null,
      usdPerPockQuote: inviteKind === "gift" ? (giftUsdPerPock ?? null) : null,
      quoteSource: inviteKind === "gift" ? (giftQuoteSource ?? null) : null,
      registerUrl,
      smsHint,
      shareMessage,
      personalMessage: personalMessage ?? null,
      senderName,
      smsSent,
      smsError,
      smsManual: !phone || !isTwilioConfigured(),
      siteUrl: absoluteUrl("/genius-wallet"),
    });
  } catch (e) {
    console.error("create-invite error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invite_failed" },
      { status: 500 }
    );
  }
}