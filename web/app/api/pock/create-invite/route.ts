import {
  formatGiftShareMessage,
  formatGiftSmsMessage,
  giftClaimRegisterUrl,
} from "@/lib/giftPockMessage";
import {
  isP2pTransfersKilled,
  isUserFrozen,
} from "@/lib/emergencyKill";
import {
  generateClaimPassword,
  inviteExpiresAt,
  isValidEmail,
  normalizePhone,
  signInvite,
} from "@/lib/pockInvite";
import { balanceUsdValue, fetchPockMarketQuote } from "@/lib/pockPrice";
import { claimGiftForUser } from "@/lib/pockGiftClaimServer";
import { resolveBrokAccountId } from "@/lib/resolveBrokAccountId";
import { absoluteUrl } from "@/lib/siteConfig";
import { isTwilioConfigured, sendSms } from "@/lib/twilioSms";
import { NextResponse } from "next/server";
import { getServiceSupabase, getUserSupabase } from "@/lib/supabase/server";

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
    const nameEarly = body.recipientName?.trim() ?? "";
    const brokIdEarly = body.recipientBrokId?.trim() ?? "";

    // Gift / Send: name (or known BROK id) is enough — phone optional (same as gift).
    // Phone/email only required for legacy transfer with no name and no BROK id.
    if (!phone && !email && inviteKindEarly !== "gift") {
      if (nameEarly.length < 2 && !brokIdEarly) {
        return NextResponse.json(
          { error: "recipient_name_required" },
          { status: 400 }
        );
      }
    }
    if (phone && phone.length < 10 && !email && inviteKindEarly !== "gift" && nameEarly.length < 2 && !brokIdEarly) {
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
    if (isUserFrozen(senderId)) {
      return NextResponse.json({ error: "account_frozen" }, { status: 403 });
    }
    if (isP2pTransfersKilled()) {
      return NextResponse.json(
        {
          error: "transfers_disabled",
          message:
            "Gifts and sends are temporarily paused while we stop automated abuse. Card top-ups and your balance are safe.",
        },
        { status: 503 }
      );
    }
    const inviteKind = body.inviteKind === "gift" ? "gift" : "transfer";
    const recipientName = body.recipientName?.trim();
    // Accept full UUID, BROK-BD66A7B6, or compact hex — resolve to real user id.
    const recipientBrokIdRaw = body.recipientBrokId?.trim() || "";
    let recipientBrokId: string | undefined;
    if (recipientBrokIdRaw) {
      const resolved = await resolveBrokAccountId(recipientBrokIdRaw);
      if (!resolved) {
        return NextResponse.json(
          {
            error: "recipient_not_found",
            hint: "Use their BROK-XXXXXXXX account code exactly as shown in Genius Wallet (e.g. BROK-BD66A7B6).",
          },
          { status: 404 }
        );
      }
      recipientBrokId = resolved;
    }
    if (recipientBrokId && isUserFrozen(recipientBrokId)) {
      return NextResponse.json(
        { error: "recipient_frozen", message: "Cannot send to this account." },
        { status: 403 }
      );
    }

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

    // Name required for gift; for send (transfer) name required unless BROK id is known.
    if (inviteKind === "gift" && (!recipientName || recipientName.length < 2)) {
      return NextResponse.json({ error: "recipient_name_required" }, { status: 400 });
    }
    if (
      inviteKind === "transfer" &&
      !recipientBrokId &&
      (!recipientName || recipientName.length < 2)
    ) {
      return NextResponse.json({ error: "recipient_name_required" }, { status: 400 });
    }

    if (recipientBrokId) {
      if (recipientBrokId === senderId) {
        return NextResponse.json({ error: "cannot_send_to_self" }, { status: 400 });
      }
      // Confirm row exists (resolve already matched brok_users; re-check for safety).
      const { data: recipient } = await getServiceSupabase()
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
      recipientName: recipientName || undefined,
      usdEquivalent: inviteKind === "gift" ? giftUsdEquivalent : undefined,
      personalMessage: personalMessage || undefined,
      senderName: senderName || undefined,
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
          ? `Send to account ${recipientBrokId.slice(0, 8)}… · ${recipientName ?? "member"}`
          : `Send to ${recipientName ?? "recipient"} · ${giftContact}`;

    const { error: debitErr } = await userClient.rpc("spend_pock", {
      p_amount: amount,
      p_kind: inviteKind === "gift" ? "gift_sent" : "transfer_out",
      p_note: note,
    });

    if (debitErr) {
      if (debitErr.message?.includes("insufficient_pock")) {
        return NextResponse.json({ error: "insufficient_pock" }, { status: 400 });
      }
      if (debitErr.message?.includes("transfers_disabled")) {
        return NextResponse.json({ error: "transfers_disabled" }, { status: 503 });
      }
      if (debitErr.message?.includes("account_frozen")) {
        return NextResponse.json({ error: "account_frozen" }, { status: 403 });
      }
      if (debitErr.message?.includes("min_reserve_required")) {
        return NextResponse.json(
          {
            error: "min_reserve_required",
            message:
              "Genius Wallet keeps at least 100 $POCK reserved (including welcome trial). Enter a smaller amount.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: debitErr.message }, { status: 500 });
    }

    // Durable invite row (for unclaimed circle-back + contact capture).
    try {
      const { recordPockInvite } = await import("@/lib/giftOutreach");
      await recordPockInvite(getServiceSupabase(), {
        token,
        kind: inviteKind,
        senderId,
        amount,
        recipientName,
        recipientEmail: email || null,
        recipientPhone: phone || null,
        expiresAtMs: inviteExpiresAt(72),
      });
    } catch (e) {
      console.warn("record pock invite failed:", e);
    }

    // Instant credit when sender knows the recipient's BROK account id.
    let instantCredit = false;
    if (recipientBrokId) {
      try {
        await claimGiftForUser(getServiceSupabase(), recipientBrokId, token);
        instantCredit = true;
      } catch (e) {
        console.error("instant transfer credit failed:", e);
        // Link still works for claim fallback
      }
    }

    // One claim path for gift + send: open while logged in → credits existing wallet.
    const giftUrl = giftClaimRegisterUrl(token);
    const claimUrl = giftUrl;
    const registerUrl = giftUrl;

    const displayName = recipientName || "friend";
    const giftShareInput = {
      recipientName: displayName,
      amount,
      usdEquivalent: giftUsdEquivalent ?? null,
      quoteSource: giftQuoteSource ?? null,
      giftUrl,
      senderName,
      personalMessage,
    };

    const shareMessage = formatGiftShareMessage(giftShareInput);
    const smsBody = formatGiftSmsMessage(giftShareInput);
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
      giftUrl,
      claimPassword: null,
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
      instantCredit,
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