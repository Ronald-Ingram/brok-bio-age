/** Client-safe admin request headers (no Node crypto). */

export function adminAuthHeaders(
  opts: { secret?: string; session?: string }
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts.session?.trim()) {
    headers["x-brok-admin-session"] = opts.session.trim();
  } else if (opts.secret?.trim()) {
    headers["x-brok-og-admin"] = opts.secret.trim();
  }
  return headers;
}