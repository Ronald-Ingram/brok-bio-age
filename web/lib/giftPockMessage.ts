import { absoluteUrl } from "./siteConfig";
import { DIGITAL_ASSET_DISCLAIMER } from "./digitalAssetDisclaimer";

export interface GiftShareInput {
  recipientName: string;
  amount: number;
  usdEquivalent?: number | null;
  claimUrl: string;
  claimPassword: string;
  registerUrl: string;
  senderName?: string;
  personalMessage?: string;
}

export function formatGiftShareMessage(input: GiftShareInput): string {
  const sender = input.senderName?.trim() || "Ronald Ingram";
  const usd =
    input.usdEquivalent != null
      ? ` (~$${input.usdEquivalent.toFixed(2)} USD)`
      : "";
  const note = input.personalMessage?.trim()
    ? `\n\nPersonal note from ${sender}:\n"${input.personalMessage.trim()}"`
    : "";

  return [
    `Hi ${input.recipientName}!`,
    ``,
    `${sender} sent you ${input.amount} $POCK${usd} through the BROK Genius Wallet — your human wallet for the Genius Token ecosystem.`,
    `No bank account or KYC required to claim. Create a free BROK ID in under a minute, then credit instantly.`,
    note,
    ``,
    `Claim: ${input.claimUrl}`,
    `Password: ${input.claimPassword}`,
    `New here? Register free: ${input.registerUrl}`,
    ``,
    DIGITAL_ASSET_DISCLAIMER,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export function giftClaimRegisterUrl(token: string): string {
  return absoluteUrl(`/genius-wallet?claim=${encodeURIComponent(token)}`);
}