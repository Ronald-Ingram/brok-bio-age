import { getServiceSupabase } from "@/lib/supabase/server";
import { getStripe, siteOrigin } from "@/lib/stripeServer";
import { getTierById, subscriptionStripeDescription } from "@/lib/subscriptionConfig";
import { NEOBANX_LEGAL_NAME } from "@/lib/treasuryBuybackPolicy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      tierId?: string;
      userId?: string;
      accessToken?: string;
    };

    const tier = body.tierId ? getTierById(body.tierId) : undefined;
    if (!tier) {
      return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }
    if (!body.userId || !body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user || authData.user.id !== body.userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const origin = siteOrigin(req);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: tier.priceCents,
            recurring: { interval: "month" },
            product_data: {
              name: `${tier.name} — BROK + Neoscore`,
              description: `${subscriptionStripeDescription(tier)} · ${NEOBANX_LEGAL_NAME}`,
              metadata: {
                product: "brok_subscription",
                tier_id: tier.id,
                seller: "neobanx_software_inc",
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        seller: "neobanx_software_inc",
        product_line: "brok_subscription",
        brok_user_id: body.userId,
        checkout_type: "subscription",
        tier_id: tier.id,
        included_pock: String(tier.includedPockMonthly),
      },
      subscription_data: {
        metadata: {
          brok_user_id: body.userId,
          tier_id: tier.id,
          included_pock: String(tier.includedPockMonthly),
        },
      },
      success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?canceled=1`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout_failed";
    console.error("Stripe subscription checkout error:", e);
    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}