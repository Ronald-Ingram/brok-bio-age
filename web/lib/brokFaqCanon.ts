/**
 * BROK / Genius Wallet FAQ — surfaced on /trust and ingested into Kiron Canon.
 * Tag prefix for core_knowledge: Kiron Canon|tier:highest|faq
 */

export interface BrokFaqItem {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
}

export const POCK_BALANCE_ALERT_COPY =
  "Keep enough $POCK in Genius Wallet to cover your next uses — bio-age calculations (~1 $POCK each), voice/avatar metering, and any overage beyond your subscription pool. If your balance hits zero, paid features pause until you top up.";

export const POCK_RESERVED_USD_COPY =
  "Genius Wallet balances are fully reserved in $POCK on-chain — your token count is fixed in the ledger. The USD value shown can rise or fall with the $POCK market, in sync with balances held in other Solana wallets. You hold $POCK, not a dollar deposit.";

export const BROK_FAQ_ITEMS: BrokFaqItem[] = [
  {
    id: "faq_balance_minimum",
    question: "How much $POCK should I keep in Genius Wallet?",
    answer: `${POCK_BALANCE_ALERT_COPY} Subscribers get a monthly included pool (Essential ~30, Pro ~120); anything beyond that debits your wallet. We recommend keeping a buffer — e.g. 10–20 $POCK for casual testing, more if you use voice, avatar, or frequent calcs.`,
    tags: ["balance", "metering"],
  },
  {
    id: "faq_reserved_usd_fluctuation",
    question: "Why does my USD value change when my $POCK balance stays the same?",
    answer: POCK_RESERVED_USD_COPY,
    tags: ["reserved", "volatility", "custody"],
  },
  {
    id: "faq_reserved_vs_onchain",
    question: "What does “reserved” mean — is my $POCK real?",
    answer:
      "Yes. Reserved means Neobanx holds your $POCK allocation in the Genius Wallet ledger backed by on-chain treasury reserves — you see a fixed $POCK balance immediately after Stripe confirms payment. It is prepaid service credit / digital asset custody, not a bank deposit. Connect a Solana wallet on Genius Wallet, then tap Move reserved $POCK on-chain to receive SPL tokens in Phantom or Solflare. Tokens then trade on Jupiter/DexScreener like any wallet-held $POCK.",
    tags: ["custody", "reserved"],
  },
  {
    id: "faq_transaction_history",
    question: "Where is my transaction history and card top-up?",
    answer:
      "Genius Wallet shows full transaction history (trial credit, Stripe top-ups, custody moves) synced from Supabase on every page load. After a card purchase, your balance and a stripe_credit ledger row appear when Stripe marks the session paid — usually seconds for cards. If history looks empty, tap Refresh on the history panel; the app reconciles Stripe payments against your ledger automatically.",
    tags: ["ledger", "stripe"],
  },
  {
    id: "faq_solana_release",
    question: "How do I move $POCK between Genius Wallet and my Solana wallet?",
    answer:
      "Genius Wallet → Solana: connect your wallet, enter an amount (or Max), then Move $POCK on-chain — partial transfers supported. Send to any Solana address via Withdraw or the optional different-wallet field in Custody. Neobanx treasury sends SPL $POCK; check Phantom and DexScreener. Send to User / Gift = reserved ledger inside BROK (SMS claim). Solana → Genius reserved is not automated yet.",
    tags: ["custody", "solana", "dex"],
  },
  {
    id: "faq_not_a_bank",
    question: "Is Genius Wallet a bank account?",
    answer:
      "No. Card payments run through Stripe; you receive prepaid $POCK service credits under SEC/CFTC digital-asset guidance (March 17 & April 28, 2026 frameworks). There is no FDIC insurance, no demand deposit, and no money-transmitter remittance framing — it is utility credit for BROK services.",
    tags: ["compliance", "trust"],
  },
  {
    id: "faq_card_vs_solana",
    question: "Should I buy $POCK with a card or on Solana?",
    answer:
      "Card top-ups lock a delayed market quote at checkout (~15 min feed) and credit reserved $POCK instantly when Stripe confirms — convenient, no wallet needed. On-chain (Phantom, Solflare, Jupiter) gives live market price and immediate self-custody. In volatile markets, on-chain may track price more closely; card is simpler for family testing and gifts.",
    tags: ["buy", "volatility"],
  },
  {
    id: "faq_family_subwallets",
    question: "Can I give family members their own wallets?",
    answer:
      "Yes — create named family sub-wallets under your Genius Wallet. You fund and reclaim $POCK; they spend within the balance you allocate. Sub-wallets are controlled pockets, not separate anonymous accounts. For gifts to adults, use Gift $POCK (one private link).",
    tags: ["family", "sub-wallets"],
  },
  {
    id: "faq_run_out_mid_calc",
    question: "What happens if I run out of $POCK during a calculation?",
    answer:
      "The calc will not complete — you need at least 1 $POCK (or an active subscription pool) before starting. Top up at /topup or /genius-wallet#buy-pock. Subscribers debit included monthly $POCK first, then wallet balance.",
    tags: ["balance", "bio-age"],
  },
  {
    id: "faq_trust_start_small",
    question: "I'm skeptical — how should I test safely?",
    answer:
      "Good instinct. Start with a small top-up, verify your ledger balance and transaction history, read /trust, and ask BROK hard questions. Today's Genius Wallet is an MVP for real flows — not tomorrow's sovereign treasury. Ownership, transparency, and enforceable rules are the design goal.",
    tags: ["trust"],
  },
  {
    id: "faq_pock_stars_cold",
    question: "What are $POCK Stars and cold storage?",
    answer:
      "For maximum self-custody, hold $POCK on an air-gapped hardware wallet with seed phrases stored offline and redundantly. Reserved Genius Wallet balances are convenient; cold self-custody is sovereignty — especially under political or banking stress.",
    tags: ["security", "self-custody"],
  },
  {
    id: "faq_device_pin",
    question: "What is a Device PIN?",
    answer:
      "A Device PIN is 4–8 digits that protect one Genius Wallet account. It is not your Apple password, Face ID, or iCloud Keychain login.\n\n• One PIN per account (not per phone).\n• Change it once on any device → every device uses the new PIN.\n• Use it only with Switch account to open that wallet.\n• Set or change PIN under the account code (Set PIN / Change PIN). Digits only — no biometrics required.",
    tags: ["account", "pin", "security", "device"],
  },
  {
    id: "faq_link_device",
    question: "How do I use the same wallet on phone and Mac?",
    answer:
      "Simple model: one account code (BROK-XXXXXXXX) + one Device PIN + every device.\n\n1) On the wallet with your real balance: Copy the account code → Set PIN (4–8 digits).\n2) On other devices: Genius Wallet → Switch account → paste that code + PIN → Open.\n\nEach browser shows one wallet at a time. Opening the right account binds this device and can merge leftover trial $POCK into it. Family sub-wallets are allowances inside that parent account, not separate logins.",
    tags: ["account", "device", "mobile", "link", "sync", "switch", "pin"],
  },
  {
    id: "faq_multiple_device_accounts",
    question: "Why does Mac show a different balance than my phone?",
    answer:
      "Each new browser can open a temporary trial wallet. Your purchases stay on the account where you paid — money is not deleted.\n\nFix: Switch account → enter the full-balance BROK- code + that account’s Device PIN. Leftover trial balance may merge in (e.g. two wallets combine into one total). After that, phone and Mac should match.",
    tags: ["account", "device", "custody", "balance", "merge"],
  },
  {
    id: "faq_link_device_troubleshoot",
    question: "Account switch troubleshooting",
    answer:
      "• Account not found — use BROK- code only (Copy button), no spaces, not a Stripe receipt.\n• Wrong PIN — use the PIN for the account you are opening; one account → one PIN on all devices.\n• Only one wallet on screen — by design; use Switch account to open another.\n• Apple Password popup — Device PIN is digits only, not your Apple password; hard-refresh if an old form still appears.\n• Forgot PIN — email info@neobanx.com with your BROK- code for recovery.\n• Family pockets — under Genius family sub-wallets on the parent account.",
    tags: ["account", "device", "mobile", "support", "pin"],
  },
  {
    id: "faq_balance_after_merge",
    question: "Why did my balance jump after Switch account?",
    answer:
      "When you open your main account from a temporary trial wallet, leftover $POCK on that trial can merge into the main balance. The new total should match main + what was on the temporary wallet (ledger shows a merge / transfer). Transaction history follows the main account. Extra trial merges during beta are fine to keep as a tester reward.",
    tags: ["account", "balance", "merge", "ledger"],
  },
  {
    id: "faq_iphone_new_wallet",
    question: "My iPhone opened a new empty wallet but Mac is fine — what happened?",
    answer:
      "Not a system-wide wipe. Genius Wallet remembers which account this browser is on using site storage (and a cookie). iPhone Safari can clear that after security/privacy changes, “Clear History and Website Data,” Lockdown Mode, or some iOS updates — so the phone looks like a brand-new visitor and gets a temporary +100 $POCK trial. Mac still has its storage, so it stays on the real account.\n\nFix: Switch account → your BROK- code + Device PIN. Leftover trial $POCK merges into main. Re-enable Face ID / biometrics for phone security if you want — that does not cause the reset; clearing website data does. This only hits browsers that lost site data for brok.neobanx.com — not every iPhone automatically.",
    tags: ["account", "iphone", "ios", "safari", "device", "trial"],
  },
  {
    id: "faq_contact_brok",
    question: "How do I reach BROK or Neobanx support?",
    answer:
      "Email info@neobanx.com (BROK inbox when configured). In-app: ask BROK on /chat or /avatar — answers draw from Kiron Canon and corrected FAQs. For on-chain wallet setup, send your Solana public key only — never share seed phrases.",
    tags: ["contact"],
  },
  {
    id: "faq_refresh_browser",
    question: "How do I get the latest BROK version on my phone or browser?",
    answer:
      "BROK ships continuously — your browser may cache an older build. Hard refresh: iPhone Safari → pull down to refresh, or Settings → Safari → Clear History (last hour) if stuck; Android Chrome → ⋮ menu → Refresh, or pull down; Desktop → Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac). For Genius Wallet history, tap Refresh on the transaction panel after updating. Always use https://brok.neobanx.com as the canonical URL.",
    tags: ["browser", "mobile", "updates"],
  },
  {
    id: "faq_mobile_pdf_reports",
    question: "Can I save a PDF of my Bio-Age, Inneagram, or IEM report on my phone?",
    answer:
      "Yes. After results appear, tap Download Report (HTML file) or Print / Save PDF. Download saves to your phone's Downloads/Files folder — on iPhone, open Files → Downloads; on Android, Files or Downloads app. Print / Save PDF opens the system print sheet: choose Save as PDF (Android), Share → Save to Files (iPhone), or AirPrint. We generate print-ready HTML locally in your browser — no server copy of your health data. Bio-Age, Ingram Inneagram, and IEM reports all support these buttons.",
    tags: ["mobile", "pdf", "reports", "privacy"],
  },
  {
    id: "faq_startupnv",
    question: "What is StartUpNV and the Nevada Seed programs?",
    answer:
      "StartUpNV is Nevada’s statewide startup accelerator and incubator — a 501(c)(3) nonprofit that helps entrepreneurs go from idea through beta to a revenue-producing, capitalized company. Hubs in Las Vegas and Reno, plus rural reach via SBDC partners, make it a genuine statewide engine. Seed and early-stage paths deserve praise: SeedVegas, FundNV (pre-seed checks for accelerator companies), AngelNV founder training with angel investment opportunities, and the broader Nevada capital stack (affiliated funds/syndicates including 1864.Fund) give founders mentorship, community, and capital — not just free pizza. BROK is proud to support Nevada founders and workshop days hosted with this ecosystem. Details evolve; prefer startupnv.org for current programs.",
    tags: ["startupnv", "nevada", "seed", "seedvegas", "fundnv", "angelnv", "ecosystem", "workshop"],
  },
  {
    id: "faq_maggie_saling",
    question: "Who is Maggie Saling at StartUpNV?",
    answer:
      "Maggie Saling is Chief of Operations / senior operations leadership at StartUpNV — a driving force behind day-to-day program delivery, communications, founder education, and statewide support. Public listings often pair her with Jeff Saling (frequently cited as Executive Director). In workshop settings she is widely known as a warm, practical connector for Nevada’s founder community. Confirm current titles on startupnv.org.",
    tags: ["maggie", "saling", "startupnv", "nevada", "leadership"],
  },
  {
    id: "faq_cara_ohare",
    question: "Who is Cara O’Hare at StartUpNV?",
    answer:
      "Cara O’Hare is Vice President of Operations at StartUpNV. A certified PMP with deep program leadership experience, she builds and runs the programs that connect entrepreneurs to funding, mentorship, and resources — including federal-funding education, Seed/accelerator delivery, and ecosystem events across Nevada. Confirm current titles on startupnv.org.",
    tags: ["cara", "ohare", "o’hare", "startupnv", "nevada", "leadership", "seed"],
  },
  {
    id: "faq_business_canvas",
    question: "How do I make a Business Model Canvas with BROK?",
    answer:
      "On /chat or /avatar, tap Business Canvas. Answer ~15 short workshop questions (customer, problem, value, channels, revenue, costs, partners, metrics). When finished, Download HTML or Print → Save as PDF (landscape, backgrounds on). No voice/avatar $POCK burn for the canvas itself. Great for StartUpNV / Nevada founder workshop demos.",
    tags: ["canvas", "bmc", "business", "workshop", "pdf", "startupnv"],
  },
];

export function formatFaqForCanon(item: BrokFaqItem): string {
  return `FAQ [${item.id}]\nQ: ${item.question}\nA: ${item.answer}`;
}

export function formatAllFaqForPrompt(maxItems = 12): string {
  const items = BROK_FAQ_ITEMS.slice(0, maxItems);
  return items
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
}

/** Keyword-matched FAQ subset — avoids dumping all FAQs into every Groq call. */
export function formatMatchedFaqForPrompt(
  question: string,
  maxItems = 3
): string | undefined {
  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const scored = BROK_FAQ_ITEMS.map((item) => {
    const hay = `${item.question} ${item.answer} ${(item.tags ?? []).join(" ")}`.toLowerCase();
    const hits = keywords.filter((k) => hay.includes(k)).length;
    return { item, hits };
  })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, maxItems);

  if (!scored.length) return undefined;
  return scored.map((r) => `Q: ${r.item.question}\nA: ${r.item.answer}`).join("\n\n");
}

export function canonTagsForFaq(item: BrokFaqItem): string {
  const extra = (item.tags ?? []).join("|");
  return `Kiron Canon|tier:highest|faq|truth_id:${item.id}${extra ? `|${extra}` : ""}`;
}