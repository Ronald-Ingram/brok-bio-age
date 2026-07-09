/** Hybrid custody — reserved (Neobanx-held) vs self-custodial (Solana-linked) */

export type CustodyStatus = "reserved" | "self_custodial";
export type CustodyLedgerState = "reserved" | "on_chain";

export const CUSTODY_LABELS: Record<CustodyStatus, string> = {
  reserved: "Reserved in Genius Wallet",
  self_custodial: "Self-Custodial",
};

export const CUSTODY_DESCRIPTIONS: Record<CustodyStatus, string> = {
  reserved:
    "Your $POCK is held securely in the Genius Wallet ledger. No Solana wallet required to buy, receive gifts, or spend inside BROK.",
  self_custodial:
    "Your Solana wallet is linked. You can request an on-chain release of reserved $POCK to your wallet.",
};

/** Rough Solana base58 address validation */
export function isValidSolanaAddress(address: string): boolean {
  const a = address.trim();
  if (a.length < 32 || a.length > 64) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(a);
}

export function shortSolanaAddress(address: string | null | undefined): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isReservedCustody(status: CustodyStatus | null | undefined): boolean {
  return !status || status === "reserved";
}