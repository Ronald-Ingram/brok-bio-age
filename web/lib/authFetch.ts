import { getSupabase, isSupabaseConfigured } from "./supabase/client";

/** Attach Supabase bearer token for metered BROK API routes. */
export async function brokAuthHeaders(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (!isSupabaseConfigured()) return headers;
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* session optional until first auth */
  }
  return headers;
}