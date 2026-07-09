import {
  brokApiConfigured,
  cartesiaConfigured,
  heygenConfigured,
} from "@/lib/brokApiConfig";
import { HEYGEN_SANDBOX } from "@/lib/heygenLiveAvatar";
import { isTwilioConfigured } from "@/lib/twilioSms";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const twilio = isTwilioConfigured();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? null;
  const inviteSecret = Boolean(process.env.POCK_INVITE_SECRET?.trim());

  const brokApi = brokApiConfigured();
  const cartesia = cartesiaConfigured();
  const heygen = heygenConfigured();

  return NextResponse.json({
    stripe,
    stripeWebhook,
    twilio,
    siteUrl,
    inviteSecret,
    brokApi,
    cartesia,
    heygen,
    heygenSandbox: HEYGEN_SANDBOX,
    avatarReady: heygen && cartesia,
    paymentsReady: stripe && stripeWebhook,
    smsReady: twilio,
  });
}