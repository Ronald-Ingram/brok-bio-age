/** Genius Wallet hybrid custody — user-facing copy */

export const CUSTODY_RESERVED_HEADLINE = "Reserved in Genius Wallet";
export const CUSTODY_SELF_HEADLINE = "Self-Custodial on Solana";

export const CUSTODY_RESERVED_EXPLAINER =
  "Buy with card or receive gifts without a Solana wallet. We hold your $POCK in the Genius Wallet ledger until you choose to connect a wallet and claim on-chain custody.";

export const CUSTODY_MONEY_FLOW_EXPLAINER =
  "Your USD payment settles in Stripe (Neobanx). The $POCK quantity locked at checkout is credited to your Genius Wallet reserve immediately when Stripe confirms card payment — usually within seconds. ACH credits when the bank transfer clears. Spendable in BROK now; on-chain only after you connect a Solana wallet and request release.";

export const CUSTODY_VOLATILITY_NOTE =
  "Card top-ups use a delayed market quote locked at checkout — not live on-chain price. In volatile markets, buy on Solana for immediate market settlement.";

export const CUSTODY_CONNECT_CTA = "Connect Solana wallet";
export const CUSTODY_CREATE_WALLET_CTA = "Create wallet for me (coming soon)";
export const CUSTODY_RELEASE_CTA = "Move reserved $POCK on-chain";
export const CUSTODY_RELEASE_AMOUNT_CTA = (amount: number) =>
  `Move ${amount.toLocaleString()} $POCK on-chain`;
export const CUSTODY_ONCHAIN_DEX_NOTE =
  "After settlement, $POCK appears in your linked Solana wallet and on DexScreener/Jupiter — same token, live market price.";
export const CUSTODY_SOLANA_TO_GENIUS_NOTE =
  "Moving on-chain $POCK back into Genius reserved balance is not automated yet. Trade or hold in Phantom; use reserved balance for in-app BROK spend.";

export const CUSTODY_RELEASE_PENDING_NOTE =
  "Sending $POCK to your Solana wallet from the Neobanx treasury — usually confirms within a minute.";

export const CUSTODY_RELEASE_SENT_NOTE =
  "Settled on-chain. Open your Solana wallet (Phantom, Solflare) to see the tokens — they may take a few seconds to appear.";

export const CUSTODY_RELEASE_FAILED_NOTE =
  "Transfer could not complete — your $POCK was restored to your reserved Genius Wallet balance. Try again or contact info@neobanx.com.";

export const CUSTODY_LINK_ONLY_NOTE =
  "Connecting a wallet only saves your address. Tap Move reserved $POCK on-chain to send tokens.";