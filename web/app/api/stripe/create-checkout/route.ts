import {
  POCK_CHECKOUT_EXPIRY_MINUTES,
  POCK_PRICING_MODEL,
} from "@/lib/pockPricingPolicy";
import { NEOBANX_LEGAL_NAME } from "@/lib/treasuryBuybackPolicy";
import {
  POCK_PACKAGES,
  PREPAID_MIN_USD,
  PREPAID_SANITY_MAX_USD,
} from "@/lib/purchaseConfig";
import {
  estimatePockFromUsd,
  fetchPockMarketQuote,
  formatEstimatedPock,
} from "@/lib/pockPrice";
import { getStripe, pockTopupPaymentMethods, siteOrigin } from "@/lib/stripeServer";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      packageId?: string;
      customUsd?: number;
      userId?: string;
      accessToken?: string;
    };

    if (!body.userId || !body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    let priceUsd: number;
    let priceCents: number;
    let tierLabel: string;
    let packageId: string;

    if (body.customUsd != null) {
      priceUsd = Math.round(body.customUsd * 100) / 100;
      if (priceUsd < PREPAID_MIN_USD || priceUsd > PREPAID_SANITY_MAX_USD) {
        return NextResponse.json({ error: "amount_out_of_range" }, { status: 400 });
      }
      priceCents = Math.round(priceUsd * 100);
      tierLabel = "Prepaid";
      packageId = "prepaid-custom";
    } else {
      const pkg = POCK_PACKAGES.find((p) => p.id === body.packageId);
      if (!pkg) {
        return NextResponse.json({ error: "invalid_package" }, { status: 400 });
      }
      priceUsd = pkg.priceUsd;
      priceCents = pkg.priceCents;
      tierLabel = pkg.label;
      packageId = pkg.id;
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user || authData.user.id !== body.userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const quote = await fetchPockMarketQuote();
    const pockAmount = estimatePockFromUsd(priceUsd, quote.usdPerPock);
    if (pockAmount < 1) {
      return NextResponse.json({ error: "quote_too_low" }, { status: 400 });
    }

    const origin = siteOrigin(req);
    const stripe = getStripe();
    const estLabel = formatEstimatedPock(pockAmount);
    const quoteLockedAt = new Date().toISOString();
    const expiresAt = Math.floor(
      (Date.now() + POCK_CHECKOUT_EXPIRY_MINUTES * 60 * 1000) / 1000
    );

    const sessionParams = {
      mode: "payment" as const,
      expires_at: expiresAt,
      payment_method_types: pockTopupPaymentMethods(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: {
              name: `~${estLabel} $POCK — Genius Wallet`,
              description: `${tierLabel} · ${estLabel} $POCK locked at $${quote.usdPerPock.toFixed(6)}/token · ${NEOBANX_LEGAL_NAME}`,
              metadata: {
                product: "brok_pock",
                package_id: packageId,
                seller: "neobanx_software_inc",
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        seller: "neobanx_software_inc",
        product_line: "brok_pock_topup",
        brok_user_id: body.userId,
        pock_amount: String(pockAmount),
        package_id: packageId,
        usd_paid: String(priceUsd),
        usd_per_pock_quote: String(quote.usdPerPock),
        quote_as_of: quote.asOf,
        quote_source: quote.source,
        quote_locked_at: quoteLockedAt,
        pricing_model: POCK_PRICING_MODEL,
      },
      success_url: `${origin}/genius-wallet?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/genius-wallet?canceled=1#buy-pock`,
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (bankErr) {
      const msg = bankErr instanceof Error ? bankErr.message : "";
      if (!msg.includes("us_bank_account")) throw bankErr;
      session = await stripe.checkout.sessions.create({
        ...sessionParams,
        payment_method_types: ["card"],
      });
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      estimatedPock: pockAmount,
      usdPerPock: quote.usdPerPock,
      quoteLockedAt,
      pricingModel: POCK_PRICING_MODEL,
      expiresAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout_failed";
    console.error("Stripe checkout error:", e);
    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}