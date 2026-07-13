import { getUserSupabase } from "./supabase/server";

export class ApiAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.code = code;
    this.status = status;
  }
}

export async function requireAuthenticatedUser(
  req: Request,
  expectedUserId?: string | null
): Promise<string> {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new ApiAuthError(
      "auth_required",
      "Sign in via Genius Wallet to use BROK chat and voice.",
      401
    );
  }

  const supabase = getUserSupabase(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new ApiAuthError(
      "auth_invalid",
      "Session expired — refresh the page and try again.",
      401
    );
  }

  if (expectedUserId?.trim() && expectedUserId.trim() !== data.user.id) {
    throw new ApiAuthError("user_mismatch", "Account mismatch — refresh and retry.", 403);
  }

  return data.user.id;
}