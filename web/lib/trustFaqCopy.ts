/** Security, compliance & sovereignty — /trust FAQ copy */

import { BROK_FAQ_ITEMS, POCK_BALANCE_ALERT_COPY, POCK_RESERVED_USD_COPY } from "./brokFaqCanon";

export const TRUST_PAGE_TITLE = "Trust · Security & Compliance";
export const TRUST_PAGE_SUBTITLE =
  "How Genius Wallet works today, where BROK is headed, and how we think about risk, privacy, and self-sovereignty.";

export const TRUST_SECTIONS = [
  {
    id: "vision",
    title: "BROK in every pocket",
    body: `Neobanx is building BROK in every pocket — for individuals, freelancers, creators, traders, and all economic entities, from a solo operator to the largest institutions. Our north star is a global agentic banking layer: self-sovereignty first, assets privately owned, with strong cryptographic and contractual protections — not a century of government overreach dressed up as "compliance for your own good."`,
  },
  {
    id: "today",
    title: "Today — Genius Wallet (test & top-ups)",
    body: `You're buying prepaid service credit ($POCK) to use BROK — bio-age, voice, avatar, intelligence tools. Card payments run through Stripe (issuer + network fraud checks). Balances sit in a reserved ledger you control; family sub-wallets are named pockets you fund and reclaim — not separate anonymous bank accounts. This MVP is intentionally low-friction so real people can test real flows.`,
  },
  {
    id: "tomorrow",
    title: "Tomorrow — the full vision",
    body: `Bitcoin and on-chain settlement, numbered accounts in the Swiss tradition (privacy by design, not secrecy for crime), and rule frameworks we're advocating in special jurisdictions — including the Vegas Banking Zone (VBZ), maritime law, and space law — that restore lawful financial privacy and roll back BIS-style banking globalization. Larger entities and larger flows will carry more security — multisig, limits, audit, dispute resolution — while we still fight to keep KYC minimal for law-abiding self-sovereign holders.`,
  },
  {
    id: "wary",
    title: "If you're wary",
    body: `Good. Banks trained us to equate safety with paperwork. We equate safety with ownership, transparency, and enforceable rules — and we're honest that today's test wallet is not tomorrow's sovereign treasury. Start small, verify the ledger, ask hard questions. That's how we build something worthy of every pocket.`,
  },
  {
    id: "digital-asset",
    title: "$POCK as a digital asset",
    body: `$POCK is a digital asset under guidance published by the SEC and CFTC — including the March 17, 2026 digital-asset framework and the April 28, 2026 staff memo. Genius Wallet top-ups and transfers are structured as digital-asset / prepaid-service-credit flows, not bank deposits or money-transmitter remittances. Values can fluctuate; quotes may be delayed. This is not investment advice.`,
  },
  {
    id: "pock-stars",
    title: "$POCK Stars — maximum self-custody",
    body: `For the highest level of security, $POCK Stars are advised to use an air-gapped hardware wallet and store seed phrases in a safe place — offline, redundant, and known only to you. Properly held private keys can outperform traditional custody in crises: natural disasters, political upheaval, and systemic banking stress. Reserved Genius Wallet balances are convenient; cold self-custody is sovereignty.`,
  },
  {
    id: "pock-balance",
    title: "Keep enough $POCK for your uses",
    body: POCK_BALANCE_ALERT_COPY,
  },
  {
    id: "reserved-usd",
    title: "Reserved $POCK · USD display",
    body: POCK_RESERVED_USD_COPY,
  },
  {
    id: "link-device",
    title: "One wallet, every device",
    body: `Account code (BROK-…) + Device PIN (4–8 digits) = your Genius Wallet on phone and Mac.

• One browser shows one wallet at a time → Switch account to open another.
• PIN is per account, not per device (change once, use everywhere).
• Not your Apple password / Face ID — digits only.
• New browsers may open a temporary trial; open your real account to merge.

Family sub-wallets are allowances under the parent, not separate logins.`,
  },
  {
    id: "device-pin",
    title: "Device PIN (simple)",
    body: `Set PIN under your account code on the wallet with your real balance. Use the same PIN with Switch account on every other device. Digits only — not Keychain, not biometrics.`,
  },
] as const;

/** Expandable Q&A — also ingested to Kiron Canon for BROK chat */
export const TRUST_FAQ_ITEMS = BROK_FAQ_ITEMS;

export const TRUST_FOOTNOTE =
  "This page is product and policy transparency — not legal, tax, or investment advice. Neobanx Software, Inc. · Nevada.";