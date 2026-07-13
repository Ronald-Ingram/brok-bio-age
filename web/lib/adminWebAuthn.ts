import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { getServiceSupabase } from "./supabase/server";
import { getAdminSecret } from "./adminAuth";

const ADMIN_USER_ID = "brok-admin-passkey-v1";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function resolveWebAuthnOrigin(req: Request): string {
  const envOrigin = process.env.ADMIN_WEBAUTHN_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host.split(",")[0].trim()}`;
  return "https://brok.neobanx.com";
}

export function resolveWebAuthnRpId(req: Request): string {
  const envRp = process.env.ADMIN_WEBAUTHN_RP_ID?.trim();
  if (envRp) return envRp;

  try {
    const host = new URL(resolveWebAuthnOrigin(req)).hostname;
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    return host;
  } catch {
    return "brok.neobanx.com";
  }
}

async function storeChallenge(challenge: string, purpose: "register" | "login") {
  const supabase = getServiceSupabase();
  const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  await supabase.from("brok_admin_webauthn_challenges").insert({
    challenge,
    purpose,
    expires_at: expires,
  });
  await supabase
    .from("brok_admin_webauthn_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString());
}

async function consumeChallenge(
  challenge: string,
  purpose: "register" | "login"
): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("brok_admin_webauthn_challenges")
    .select("id, expires_at")
    .eq("challenge", challenge)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error || !data) return false;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return false;

  await supabase
    .from("brok_admin_webauthn_challenges")
    .delete()
    .eq("id", data.id as string);
  return true;
}

export async function adminPasskeyCount(): Promise<number> {
  const supabase = getServiceSupabase();
  const { count, error } = await supabase
    .from("brok_admin_passkeys")
    .select("id", { count: "exact", head: true });
  if (error) {
    if (error.code === "42P01") return 0;
    throw error;
  }
  return count ?? 0;
}

export async function buildRegistrationOptions(req: Request) {
  const { generateRegistrationOptions } = await import("@simplewebauthn/server");
  const rpID = resolveWebAuthnRpId(req);
  const supabase = getServiceSupabase();

  const { data: existing } = await supabase
    .from("brok_admin_passkeys")
    .select("credential_id, transports");

  const options = await generateRegistrationOptions({
    rpName: "BROK Admin",
    rpID,
    userName: "admin@brok.neobanx.com",
    userDisplayName: "BROK Kiron Admin",
    userID: new TextEncoder().encode(ADMIN_USER_ID),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((row) => ({
      id: row.credential_id as string,
      transports: (row.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });

  await storeChallenge(options.challenge, "register");
  return options;
}

export async function verifyRegistration(
  req: Request,
  body: RegistrationResponseJSON,
  deviceLabel?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!getAdminSecret()) return { ok: false, error: "admin_secret_not_configured" };

  let expectedChallenge = "";
  try {
    const clientData = JSON.parse(
      Buffer.from(body.response.clientDataJSON, "base64url").toString("utf8")
    ) as { challenge?: string };
    expectedChallenge = clientData.challenge ?? "";
  } catch {
    return { ok: false, error: "invalid_client_data" };
  }

  if (!(await consumeChallenge(expectedChallenge, "register"))) {
    return { ok: false, error: "challenge_expired" };
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: resolveWebAuthnOrigin(req),
    expectedRPID: resolveWebAuthnRpId(req),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "verification_failed" };
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("brok_admin_passkeys").insert({
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    device_label:
      deviceLabel?.trim() ||
      (credentialDeviceType === "singleDevice" ? "This device" : "Passkey"),
    transports: credential.transports ?? [],
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "passkey_already_registered" };
    throw error;
  }

  return { ok: true };
}

export async function buildAuthenticationOptions(req: Request) {
  const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
  const rpID = resolveWebAuthnRpId(req);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [],
  });

  await storeChallenge(options.challenge, "login");
  return options;
}

export async function verifyAuthentication(
  req: Request,
  body: AuthenticationResponseJSON
): Promise<{ ok: boolean; error?: string }> {
  let expectedChallenge = "";
  try {
    const clientData = JSON.parse(
      Buffer.from(body.response.clientDataJSON, "base64url").toString("utf8")
    ) as { challenge?: string };
    expectedChallenge = clientData.challenge ?? "";
  } catch {
    return { ok: false, error: "invalid_client_data" };
  }

  if (!(await consumeChallenge(expectedChallenge, "login"))) {
    return { ok: false, error: "challenge_expired" };
  }

  const supabase = getServiceSupabase();
  const { data: row, error } = await supabase
    .from("brok_admin_passkeys")
    .select("credential_id, public_key, counter, transports")
    .eq("credential_id", body.id)
    .maybeSingle();

  if (error || !row) return { ok: false, error: "passkey_not_found" };

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: resolveWebAuthnOrigin(req),
    expectedRPID: resolveWebAuthnRpId(req),
    requireUserVerification: true,
    credential: {
      id: row.credential_id as string,
      publicKey: new Uint8Array(row.public_key as Buffer),
      counter: Number(row.counter ?? 0),
      transports: (row.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    },
  });

  if (!verification.verified) return { ok: false, error: "verification_failed" };

  await supabase
    .from("brok_admin_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", row.credential_id as string);

  return { ok: true };
}