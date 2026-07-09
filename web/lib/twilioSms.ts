import { normalizePhone } from "@/lib/pockInvite";

export interface TwilioSendResult {
  sent: boolean;
  sid?: string;
  error?: string;
}

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function isTwilioConfigured(): boolean {
  return twilioConfig() !== null;
}

/** E.164 preferred; falls back to +1 for 10-digit US numbers. */
export function toE164(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function sendSms(
  toPhone: string,
  body: string
): Promise<TwilioSendResult> {
  const cfg = twilioConfig();
  if (!cfg) {
    return { sent: false, error: "twilio_not_configured" };
  }

  const to = toE164(toPhone);
  if (to.length < 11) {
    return { sent: false, error: "phone_invalid" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: cfg.from,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      return {
        sent: false,
        error: data.message ?? `twilio_http_${res.status}`,
      };
    }

    return { sent: true, sid: data.sid };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "twilio_send_failed",
    };
  }
}