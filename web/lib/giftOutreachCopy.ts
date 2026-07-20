import { absoluteUrl } from "@/lib/siteConfig";
import { BROK_INBOX_EMAIL } from "@/lib/brokEmail";

const CHAT = absoluteUrl("/chat");
const INNEAGRAM = absoluteUrl("/inneagram");
const WALLET = absoluteUrl("/genius-wallet");
const SUBSCRIBE = absoluteUrl("/subscribe");
const AVATAR = absoluteUrl("/avatar");

export function day0ActivationEmail(opts: {
  recipientName?: string | null;
  amount?: number | null;
}): { subject: string; body: string } {
  const name = opts.recipientName?.trim() || "there";
  const amountLine =
    opts.amount && opts.amount > 0
      ? `${opts.amount.toLocaleString()} $POCK is now in your Genius Wallet.`
      : "Your BROK credits are now in your Genius Wallet.";

  return {
    subject: "You're activated on BROK — credits are ready",
    body: `Hi ${name},

Good news: opening your BROK gift link activated your account. ${amountLine}

It can feel almost too easy compared with typical sign-ups — that's intentional. You're in.

If your phone showed a pop-up
• Allow notifications only if you want reminders (optional).
• If Safari/Chrome asked to add BROK to your Home Screen, that's optional too.
• Microphone permission is only needed if you use voice or the Mic button in chat.
• You can always use text-only chat with Voice and Avatar off (saves credits).

What to try next
1) Chat with BROK: ${CHAT}
2) Inneagram test (great starting point to find your type): ${INNEAGRAM}
3) Wallet & balance: ${WALLET}

Subscription is NOT required. Free/trial use works. Subscribing is optional — it helps BROK remember you for as long as you stay subscribed and tailor assistance more precisely: ${SUBSCRIBE}

We improve BROK from real feedback. Reply to this email, write info@neobanx.com, or just tell BROK in chat:
• Any questions?
• Any suggestions?
• How smooth was onboarding from 1 (hard) to 10 (easy)?

Thanks for being early with us.

— BROK / Neobanx
${BROK_INBOX_EMAIL}
Live avatar (optional): ${AVATAR}
`,
  };
}

export function day0ActivationSms(opts: {
  amount?: number | null;
}): string {
  const amt =
    opts.amount && opts.amount > 0
      ? `${opts.amount} $POCK credited. `
      : "";
  return (
    `BROK: You're activated. ${amt}` +
    `Chat ${CHAT} · Inneagram ${INNEAGRAM}. ` +
    `Reply or email ${BROK_INBOX_EMAIL} with feedback (onboard ease 1-10). Sub optional.`
  ).slice(0, 320);
}

export function day5CircleBackEmail(opts: {
  recipientName?: string | null;
  amount?: number | null;
}): { subject: string; body: string } {
  const name = opts.recipientName?.trim() || "there";
  return {
    subject: "BROK is still here — quick check-in",
    body: `Hi ${name},

A few days ago your BROK gift activated your wallet${
      opts.amount ? ` (${opts.amount.toLocaleString()} $POCK)` : ""
    }. We noticed you haven't had a chance to chat with BROK yet — no pressure.

BROK is waiting when you're ready: ${CHAT}

If something got in the way, we'd genuinely like to know:
• Why not yet? (busy, confusing, technical issue, not interested, other)
• Any questions or suggestions?
• Onboarding ease 1 (hard) → 10 (easy)?

Reply to this email, email ${BROK_INBOX_EMAIL}, or tell BROK in chat.

Suggested easy first step: the Inneagram assessment — ${INNEAGRAM}

Subscribe only if you want longer memory & tighter personalization — not required: ${SUBSCRIBE}

— BROK / Neobanx
`,
  };
}

export function day5CircleBackSms(): string {
  return (
    `BROK check-in: your credits are ready. Chat ${CHAT} when you can. ` +
    `If not, reply why (or email ${BROK_INBOX_EMAIL}). Inneagram: ${INNEAGRAM}`
  ).slice(0, 320);
}

export function dailyOpsReportEmail(reportText: string): {
  subject: string;
  body: string;
} {
  const day = new Date().toISOString().slice(0, 10);
  return {
    subject: `BROK daily feedback & usage — ${day}`,
    body: reportText,
  };
}
