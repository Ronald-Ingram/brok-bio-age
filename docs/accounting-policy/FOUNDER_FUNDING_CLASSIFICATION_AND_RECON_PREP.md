---
doc_type: policy
tags:
  - recon
  - accounting
  - founder
  - due-to-founder
  - convert-note
  - capital-contribution
  - reimbursement
  - grant
  - vesting-unlock
  - bank-stock
  - personal-capital-loss
  - two-track
  - checklist
  - cpa
  - multi-entity
entities:
  - neobanx
  - personal
rails:
  - bank
  - brokerage
  - on-chain
  - stripe
status: living
updated: 2026-07-23
---

# Founder funding classification options + recon prep

**Entity focus:** Neobanx Software, Inc. (“Neobanx” / enterprise)  
**Related rails:** $POCK / BROK product, corp Solana treasury (`GDbcx…`), Genius reserved ledger, grants  
**Audience:** Founder ops + CPA / counsel when reconciling multi-entity accounts (next few weeks)  
**Status:** Working memo — **not** tax, legal, or securities advice. Confirm with CPA/counsel before books lock or note docs.

**Funding intent (stated 2026-07):**  
- Enterprise capital path: **convertible notes only** (no equity sale planned).  
- Historical funding: **grants** + **founder personal cash** (largely from **bank stock sales**).  
- Preference under recon: book founder cash/token support as **amounts owing to founder** (convertible debt or due-to / advances that convert), not silent equity.

**Related:**  
- **Master map (all recon files):** `../RECON_MASTER_INDEX.md`  
- `STREAMFLOW_VESTING_CLAIM_MEMO_2026-07-23.md`  
- `POST_LAUNCH_CRYPTO_ACCOUNTING_SYSTEM.md` (founder advances rule)  
- `TONY_POCK_TRANSACTION_MEMO_2026-07-20.md` (memo format)

---

## 1. What must stay separate (always)

| Bucket | Lives where | Do **not** mix with |
|--------|-------------|---------------------|
| **Personal** bank / brokerage (bank stock sales, personal capital gains/losses) | You as individual | Neobanx P&L “revenue” or “expense” |
| **Grant cash** into Neobanx | Corp bank / Stripe / books | Founder loan unless grant contract says otherwise |
| **Founder cash → Neobanx** | Corp cash / USDC / paid bills | Customer prepaid / Stripe top-ups |
| **On-chain $POCK treasury** | `GDbcx…` | Genius **reserved** ledger (Supabase) |
| **Streamflow vesting unlock** | Escrow → corp wallet | Fresh capital **unless** stream was personal property |
| **Customer Stripe $POCK** | Reserved liability + cash | Treasury unlocks / founder loans |

**Tax intuition (personal stock sales):**  
Losses on **bank stock you sold personally** are generally **personal capital losses** (offset personal capital gains; limited annual offset to ordinary income under US individual rules). They do **not** automatically reduce Neobanx taxable income or “net against” cash the company received. Recon should track **two tracks**: (A) personal brokerage gain/loss schedule, (B) Neobanx funding register (what the company received and on what terms).

---

## 2. Classification options for **founder → Neobanx** support

Use these for cash, USDC, SOL, paid vendors from personal cards, and (only when substance fits) personal $POCK moved into corp.

### Option A — **Due to founder / founder advances (open liability)**

**What it is:** Company owes you; informal or board-minuted advances until formalized into notes.

| Pros | Cons |
|------|------|
| Simple; matches “I funded ops personally” | Vague maturity/interest invites IRS / audit friction |
| Easy default while recon is incomplete | Harder for investors if balance is large and undocumented |
| Flexible: later reclass to convert notes or equity | Unlimited “payable to shareholder” can look like disguised equity |
| Aligns with dual-rail recon before note docs exist | State usury / related-party disclosure still matter |

**When to use:** Catch-up recon of historical personal spends **until** convert note package is signed.

**Books (simplified):**  
`DR Cash / Expense / Digital asset` · `CR Due to founder`

---

### Option B — **Convertible note / SAFE-like instrument (your stated preference)**

**What it is:** Documented debt (or convert instrument) from founder to Neobanx; converts on qualified financing / maturity / trigger — **not** an equity sale today.

| Pros | Cons |
|------|------|
| Matches “notes only, no equity sale” narrative | Needs real docs: principal, cap/discount, interest, maturity, convert mechanics |
| Cleaner cap table story for enterprise diligence | OID / interest / 1099 issues if mishandled |
| Can roll prior **Due to founder** into one or more notes | Counsel cost; amendments when you keep advancing |
| Repayment path exists if cash later allows | Over-stating convert principal without paper is worse than open due-to |
| Separates personal funding from grants | Convert terms must not accidentally be “equity in disguise” under securities review |

**When to use:** After recon totals are known — **paper the sum** (or tranches) as founder convert notes rather than leaving infinite due-to.

**Books (simplified):**  
`DR Due to founder` (clear advances) · `CR Convertible notes payable — founder`  
or direct: `DR Cash` · `CR Convertible notes payable`

**Ops preference (stated):** After recon, **classify catch-up contributions as convertible debt owing to founder.** Good target end-state **if** counsel drafts notes that match economic reality.

---

### Option C — **Capital contribution / APIC (equity in, no note)**

**What it is:** Permanent equity increase; no repayment obligation.

| Pros | Cons |
|------|------|
| Simplest for “money I never expect back” | Conflicts with **notes-only / no equity sale** posture if overused |
| No interest accrual complexity | Dilution / ownership math still exists economically even without a priced round |
| Clean if truly gifted to corp | Harder to repay founder later without dividend / distribution issues |
| Common for tiny bootstraps | Less flexible if you later want debt seniority vs future note investors |

**When to use:** Only for amounts you explicitly intend as non-repayable equity — **not** the default if convert notes are the plan.

---

### Option D — **Expense reimbursement only (no open balance)**

**What it is:** Corp reimburses specific receipts; zero residual due-to.

| Pros | Cons |
|------|------|
| Clean; receipt-backed | Requires company **cash** to reimburse |
| Low related-party debt | Doesn’t capture “I funded the whole runway” |
| Easy payroll/card policy later | Personal stock-sale proceeds used as runway still need Option A/B if not reimbursed |

**When to use:** Spot vendor bills after Neobanx has bank cash; not for full historical funding.

---

### Option E — **Grant income / grant liability (not founder)**

**What it is:** Third-party grantor funds Neobanx under grant terms (restricted or unrestricted).

| Pros | Cons |
|------|------|
| Not founder debt; true non-dilutive capital | Compliance, reporting, restricted use |
| Often preferred economically | Mislabeling founder cash as “grant” is a red flag |
| Clear P&L or deferred revenue-like grant accounting | Stack with founder funding carefully (separate registers) |

**When to use:** Only when a **grant agreement** exists. Track separately from founder convert register.

---

### Option F — **Streamflow / vesting unlock (treasury reclass, usually not funding)**

**What it is:** Tokens move escrow → liquid corp wallet under an existing schedule (e.g. +9,000,500 $POCK on 2026-07-23).

| Pros | Cons |
|------|------|
| Matches chain facts; no fake cash in | Easy to mis-book as “I contributed $38k” |
| Keeps Stripe/reserved rails clean | Need beneficiary identity (entity vs personal stream) |
| Optional restricted→liquid reclass is clean | FMV footnotes ≠ revenue |

**Sub-cases:**

| Beneficiary truth | Classification |
|-------------------|----------------|
| **Company / treasury plan** is beneficiary | **Unlock / restricted → liquid** — **not** capital injection, **not** convert principal |
| **Founder personal** stream, then tokens sent to corp | **Contribution** (Option C) or **Due to / convert** (A/B) at policy FMV or units-only memo |

**Do not** default Streamflow corp claims into convert principal unless counsel says the stream was personal property contributed to the company.

---

## 3. Pros/cons snapshot (founder cash & tokens)

| Option | Best for | Avoid if |
|--------|----------|----------|
| **A Due to founder** | Messy historical catch-up | You need investor-ready debt schedule tomorrow |
| **B Convertible note** | Stated enterprise path; formalize after recon | No willingness to sign note docs |
| **C Capital contribution** | True gifts; tiny one-offs | You want repayment / note seniority |
| **D Reimbursement** | Receipt-level ops after cash exists | Whole runway funded personally |
| **E Grant** | Real grants only | Founder bank-stock proceeds |
| **F Vesting unlock** | Streamflow → `GDbcx…` | Treating unlock as cash raise |

**Recommended stack for your stated plan:**

1. **Grants** → Option E (own register).  
2. **Historical personal funding** → park as **Option A**, then **roll into Option B** convert notes after recon totals.  
3. **Streamflow corp unlock** → **Option F** (unless stream is personal).  
4. **Avoid Option C** as the default while “notes only” is the enterprise story.  
5. **Never** mix personal bank-stock **capital losses** into Neobanx expense to “net” against cash the company holds.

---

## 4. Personal bank stock sales → company funding (two-track recon)

### Track P — Personal (brokerage / Form 1099-B)

Record for **each** sale lot (or annual 1099-B detail):

| Field | Example |
|-------|---------|
| Symbol / CUSIP | Bank stock |
| Date acquired / sold | … |
| Proceeds | $… |
| Cost basis | $… |
| **Gain / (loss)** | $(…) |
| Where cash went next | Personal checking → Neobanx / USDC / cards / living |

**US individual tax (high level, confirm with CPA):**  
- Capital losses offset capital gains.  
- Net capital loss: limited annual deduction against ordinary income (commonly discussed **$3,000** limit for individuals; unused carries forward).  
- This is **your personal return**, not Neobanx’s corporate return.  
- **You generally cannot** “deduct bank stock losses from cash received by Neobanx” as a single corporate netting entry.

**“Hopefully deduct losses from cash received” — clarify:**  
- **Personal:** losses may reduce **your** taxable income within capital-loss rules (and offset other personal gains).  
- **Corporate:** cash Neobanx received is funded as **loan/convert/grant/contribution** — basis and deductibility follow **that** instrument, not the bank-stock loss.  
- Selling stock at a loss and contributing remaining cash does **not** create a corporate capital-loss deduction equal to the stock loss.

### Track N — Neobanx funding register (what the company got)

| Date | Gross $ or units | Form | Counterparty | Classification (A–F) | Evidence | Note / grant ID |
|------|-----------------:|------|--------------|----------------------|----------|-----------------|
| … | … | ACH / wire / USDC / card | Founder | A → later B | bank stmt | |
| … | … | Grant disbursement | Grantor | E | grant agreement | |
| 2026-07-23 | 9,000,500 $POCK | Streamflow withdraw | Stream escrow | F | Solscan tx | See vesting memo |

Link Track P → Track N only as a **narrative of source of funds** (“personal liquidity from bank stock sales funded advances”), not as a merged tax lot.

---

## 5. Recon workplan (next few weeks)

### Phase 0 — Freeze definitions
- [ ] Entity map: **Personal** · **Neobanx Software** · other corps · `GDbcx…` · Genius codes you control  
- [ ] Policy default: founder support = **Due to founder** until convert notes papered  
- [ ] Confirm Streamflow **legal beneficiary** (entity vs personal)

### Phase 1 — Personal side
- [ ] Export brokerage: bank stock sales (proceeds, basis, dates) for all funding years in scope  
- [ ] Personal 1099-B / gain-loss worksheet (CPA package)  
- [ ] Personal bank: outflows tagged “to Neobanx / to Solana / to vendors for Neobanx”

### Phase 2 — Neobanx cash & cards
- [ ] Corp bank + Stripe balance/payouts  
- [ ] Personal card charges that are really Neobanx ops → Due to founder (or reimburse)  
- [ ] Grant ledger separate

### Phase 3 — Crypto rails
- [ ] On-chain `GDbcx…`: SOL, USDC, $POCK timeline (buybacks, custody releases, Streamflow claims)  
- [ ] Genius reserved vs on-chain (do not double count)  
- [ ] Attach Streamflow claim memo (2026-07-23)

### Phase 4 — Formalize debt
- [ ] Sum **Due to founder** by currency (USD, USDC, optional token memo)  
- [ ] Counsel: one or more **founder convertible notes** matching sum (and future advances schedule)  
- [ ] Board consent / note register  
- [ ] Interest / convert terms consistent with any outside note investors later

### Phase 5 — Period pack
- [ ] Trial balance: cash, Stripe, due-to, grants, digital assets, prepaid liabilities  
- [ ] Do **not** cancel QuickBooks until 2+ clean periods (see post-launch accounting system doc)

---

## 6. Suggested default labels (quick reference)

| Fact pattern | Label |
|--------------|--------|
| I paid Neobanx bill from personal checking | **Due to founder** (A) → later **Convert note** (B) |
| I sent USDC/SOL to `GDbcx…` from personal | **Due to founder** (A) or **Convert** (B) |
| Grant hit corp bank | **Grant** (E) |
| Customer Stripe top-up | **Prepaid liability** + cash (not founder) |
| Streamflow unlock to corp wallet (company stream) | **Vesting unlock** (F) |
| I never want it back, no note | **Capital contribution** (C) — use sparingly |
| Personal bank stock sold at loss | **Personal capital loss** (Track P only) |

---

## 7. Open questions for CPA / counsel

1. Beneficiary on Streamflow contracts — entity or founder?  
2. Accrue interest on founder due-to before notes are signed?  
3. Single master convert vs annual tranches?  
4. Token advances: book units only, FMV at transfer, or both (books vs tax)?  
5. Multi-entity: any advances that should sit in a different corp than Neobanx Software?  
6. Personal capital-loss harvesting / wash-sale around bank stock — personal return only.

---

## 8. Change log

| Date | Note |
|------|------|
| 2026-07-23 | Initial memo: classification options A–F; convert-note preference; bank-stock two-track recon; Streamflow not default capital |

---

*Working recon prep. Update classifications only after CPA/counsel review; keep evidence (stmts, Solscan, grant PDFs, note docs) with each register row.*
