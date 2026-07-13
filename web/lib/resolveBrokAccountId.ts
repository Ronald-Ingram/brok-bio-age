import { getServiceSupabase } from "./supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BROK_CODE_RE = /^BROK-([0-9A-F]{4,12})$/i;
const HEX8_RE = /^[0-9a-f]{8}$/i;
const HEX4_RE = /^[0-9a-f]{4}$/i;

function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

/**
 * Match users whose UUID first segment equals the 8-char hex prefix.
 * PostgREST cannot ilike on uuid columns — use an ordered range instead.
 */
async function findByUuidFirstSegment(
  prefix8: string
): Promise<string | null> {
  const p = prefix8.toLowerCase().slice(0, 8);
  if (!HEX8_RE.test(p)) return null;

  const supabase = getServiceSupabase();
  const low = `${p}-0000-0000-0000-000000000000`;
  const high = `${p}-ffff-ffff-ffff-ffffffffffff`;

  const { data, error } = await supabase
    .from("brok_users")
    .select("id")
    .gte("id", low)
    .lte("id", high)
    .limit(2);

  if (error) {
    console.error("[resolveBrokAccountId] prefix range:", error.message);
    return null;
  }
  if (data?.length === 1) return data[0].id as string;
  return null;
}

/** Last-4 hex suffix — requires RPC (uuid ~~* unsupported on column). */
async function findByUuidSuffix(suffix4: string): Promise<string | null> {
  const s = suffix4.toLowerCase().slice(-4);
  if (!HEX4_RE.test(s)) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("resolve_brok_user_by_suffix", {
    p_suffix: s,
  });

  if (error) {
    if (error.code === "42883" || error.message?.includes("does not exist")) {
      return null;
    }
    console.error("[resolveBrokAccountId] suffix rpc:", error.message);
    return null;
  }

  const id = data as string | null;
  return id?.trim() ? id : null;
}

/** Resolve account identifier: full UUID, BROK-C6C1E4C7, or compact hex prefix/suffix. */
export async function resolveBrokAccountId(
  input: string
): Promise<string | null> {
  const value = normalizeInput(input);
  if (!value) return null;

  if (UUID_RE.test(value)) return value.toLowerCase();

  const brokMatch = value.match(BROK_CODE_RE);
  if (brokMatch) {
    const hex = brokMatch[1].toLowerCase();
    if (hex.length >= 8) return findByUuidFirstSegment(hex.slice(0, 8));
    if (hex.length === 4) return findByUuidSuffix(hex);
    return null;
  }

  const compact = value.replace(/-/g, "").toLowerCase();
  if (compact.length >= 8) return findByUuidFirstSegment(compact.slice(0, 8));
  if (compact.length === 4) return findByUuidSuffix(compact);

  return null;
}

export function extractStripeSessionId(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
  return match?.[0] ?? (trimmed.startsWith("cs_") ? trimmed.split(/\s/)[0] : null);
}