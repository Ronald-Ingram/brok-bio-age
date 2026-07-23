/**
 * Genius Wallet external-flow reserve (anti-farm + user safety).
 *
 * Always leave at least MIN_GENIUS_RESERVE_POCK in reserved balance when:
 *  - sending / gifting to other users
 *  - withdrawing / custody-releasing on-chain
 *
 * Product metering (chat, calc) may still spend into the reserve.
 * Trial-only 100 $POCK wallets therefore cannot siphon via P2P/custody.
 */

export const MIN_GENIUS_RESERVE_POCK = 100;

/** $POCK that may leave Genius Wallet via send / gift / on-chain withdraw. */
export function externalTransferablePock(pockBalance: number): number {
  const bal = Math.max(0, Math.floor(Number(pockBalance) || 0));
  return Math.max(0, bal - MIN_GENIUS_RESERVE_POCK);
}

export function wouldBreachReserve(
  pockBalance: number,
  amount: number
): boolean {
  const bal = Math.max(0, Math.floor(Number(pockBalance) || 0));
  const amt = Math.floor(Number(amount) || 0);
  if (amt < 1) return true;
  return bal - amt < MIN_GENIUS_RESERVE_POCK;
}

export function reserveCopy(): string {
  return `Genius Wallet always keeps at least ${MIN_GENIUS_RESERVE_POCK} $POCK reserved (trial / activation buffer — pure Welcome trial cannot be sent, gifted, or withdrawn). New Welcome grants: use within 30 days or unused free trial returns to Neobanx treasury. Enter the amount to send or withdraw — there is no “Max empty” control.`;
}
