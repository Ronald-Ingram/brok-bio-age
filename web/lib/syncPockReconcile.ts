import { ensureAuthSession } from "./pockService";
import type { PockReconcileResult } from "./pockReconcile";
import { getSupabase } from "./supabase/client";

export type { PockReconcileResult };

export async function syncPockReconcile(
  sessionId?: string
): Promise<PockReconcileResult | null> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const res = await fetch("/api/pock/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      sessionId,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    console.error("POCK reconcile failed:", data.error ?? res.status);
    return null;
  }

  return (await res.json()) as PockReconcileResult;
}