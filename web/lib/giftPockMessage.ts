import { absoluteUrl } from "./siteConfig";
import { DIGITAL_ASSET_DISCLAIMER } from "./digitalAssetDisclaimer";

export const GIFT_SEND_CTA =
  "It takes just a few seconds to send a gift with $POCK. Give it a try!";

export const GIFT_SEND_CTA_URL = absoluteUrl("/genius-wallet#gift-pock");

export interface GiftShareInput {
  recipientName: string;
  amount: number;
  usdEquivalent?: number | null;
  /** dexscreener | retail_anchor — matches Genius ticker */
  quoteSource?: "dexscreener" | "retail_anchor" | null;
  giftUrl: string;
  senderName?: string;
  personalMessage?: string;
}

function giftUsdSuffix(
  usdEquivalent?: number | null,
  quoteSource?: GiftShareInput["quoteSource"]
): string {
  if (usdEquivalent == null) return "";
  const kind = quoteSource === "dexscreener" ? "market" : "reference";
  return ` (≈$${usdEquivalent.toFixed(2)} USD, ${kind} quote)`;
}

function giftCtaBlock(): string[] {
  return [
    ``,
    `Want to pay it forward?`,
    GIFT_SEND_CTA,
    GIFT_SEND_CTA_URL,
  ];
}

export function formatGiftShareMessage(input: GiftShareInput): string {
  const sender = input.senderName?.trim() || "Ronald Ingram";
  const usd = giftUsdSuffix(input.usdEquivalent, input.quoteSource);
  const note = input.personalMessage?.trim()
    ? `\n\nPersonal note from ${sender}:\n"${input.personalMessage.trim()}"`
    : "";

  return [
    `Hi ${input.recipientName}!`,
    ``,
    `${sender} sent you ${input.amount} $POCK${usd} through the BROK Genius Wallet - your human wallet for the Genius Token ecosystem.`,
    `Open the link below to create your free wallet and claim instantly - no password, no KYC.`,
    note,
    ``,
    `Claim your gift: ${input.giftUrl}`,
    ...giftCtaBlock(),
    ``,
    DIGITAL_ASSET_DISCLAIMER,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

/** Shorter plain-text body for sms: links (Messages decodes %20, not +). */
export function formatGiftSmsMessage(input: GiftShareInput): string {
  const sender = input.senderName?.trim() || "Ronald Ingram";
  const usd = giftUsdSuffix(input.usdEquivalent, input.quoteSource);
  const note = input.personalMessage?.trim()
    ? `\n\n"${input.personalMessage.trim()}"\n- ${sender}`
    : "";

  return [
    `Hi ${input.recipientName}!`,
    ``,
    `${sender} sent you ${input.amount} $POCK${usd} via BROK Genius Wallet.`,
    ``,
    `Tap to claim (free wallet, no password):`,
    input.giftUrl,
    note,
    ``,
    GIFT_SEND_CTA,
    GIFT_SEND_CTA_URL,
    ``,
    `$POCK is a digital asset, not a money transfer.`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export function giftClaimRegisterUrl(token: string): string {
  return absoluteUrl(`/genius-wallet?claim=${encodeURIComponent(token)}`);
}