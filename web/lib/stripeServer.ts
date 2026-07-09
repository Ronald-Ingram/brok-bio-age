import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

import { SITE_URL } from "./siteConfig";

export function siteOrigin(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    req.headers.get("origin") ??
    SITE_URL
  ).replace(/\/$/, "");
}

/** One-time $POCK top-ups — card + US bank ACH when enabled on Stripe account */
export function pockTopupPaymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  return ["card", "us_bank_account"];
}