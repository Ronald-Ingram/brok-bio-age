import { ensureAuthSession } from "./pockService";
import { getSupabase } from "./supabase/client";

export interface SyncCheckoutResult {
  ok: boolean;
  mode?: "payment" | "subscription";
  pending?: boolean;
  balance?: number;
  credited?: number;
  subscriptionActive?: boolean;
  tier?: string;
  error?: string;
}

export async function syncStripeCheckout(
  sessionId: string
): Promise<SyncCheckoutResult> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return { ok: false, error: "auth_required" };

  const res = await fetch("/api/stripe/sync-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      accessToken: session.access_token,
    }),
  });

  const data = (await res.json()) as SyncCheckoutResult & { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "sync_failed" };
  }
  return data;
}