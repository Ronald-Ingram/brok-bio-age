import { normalizePhone } from "@/lib/pockInvite";

function phoneForSmsUri(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return "";
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/**
 * Opens the device Messages app with pre-filled body (sender's carrier, no API).
 * Uses encodeURIComponent (%20 spaces) — URLSearchParams (+) breaks on iOS/macOS Messages.
 */
export function buildNativeSmsHref(phone: string | undefined, body: string): string {
  const to = phone ? phoneForSmsUri(phone) : "";
  const encodedBody = encodeURIComponent(body);
  return to ? `sms:${to}?body=${encodedBody}` : `sms:?body=${encodedBody}`;
}

export function buildGiftMailtoHref(
  email: string,
  recipientName: string,
  body: string
): string {
  const subject = `Your $POCK gift for ${recipientName.trim() || "you"}`;
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareGiftNative(opts: {
  title: string;
  text: string;
  url?: string;
}): Promise<"shared" | "aborted" | "unavailable"> {
  if (!canUseNativeShare()) return "unavailable";
  try {
    await navigator.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
    });
    return "shared";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "aborted";
    return "unavailable";
  }
}