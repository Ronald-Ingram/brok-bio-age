# Gemini Build X Prize — BROK registration reference (Jul 6, 2026)

## GitHub account — use this one

| Account | Role | Notes |
|---------|------|-------|
| **Ronald-Ingram** | **X Prize repo + commits** | https://github.com/Ronald-Ingram — user you linked |
| ringram08-7713 | Vercel deploys | neobanx.com, bio-age.kiron.ai — may be same person, different login |

**Answer: Yes — `https://github.com/Ronald-Ingram/neobanx-website` is the correct GitHub identity for the contest**, aligned with Ronald Ingram / Neobanx brand.

**Caveat (checked Jul 6, 2026):** API shows `Ronald-Ingram` has **0 public repos**. `neobanx-website` returns 404 to anonymous viewers → repo is **private, empty, or not pushed yet**. Judges need a **public** repo URL with code — make the repo public or add `brok-bio-age` as a second public repo today.

Account created: **2026-05-02** (GitHub account age ≠ project start date).

---

## May 19, 2026 rule — how to frame BROK

Contest: work must start **no earlier than May 19, 2026**. Older Neobanx/$POCK work is fine as **foundation**, not the submitted project.

**Recommended narrative:**

- **$POCK / Neobanx** — prior ecosystem, token, patents, marketing (traction base).
- **BROK** — new **general agentic AI private banker** product; first **revenue** via live Stripe on bio-age.kiron.ai (Essential $5 / Premium $149 + $POCK top-ups).
- **Start date for BROK:** development and public deploy **on/after May 19, 2026**; production deploy **Jul 6, 2026** (registration day).
- **Launch marketing:** graphic shows **July 24, 2026** — fine as GTM; X Prize cares about build period + live demo.

Do **not** claim the entire Neobanx corp history started after May 19. Claim **this BROK agentic banker submission** did.

---

## BROK positioning (from `assets/BROK-Use-Cases.png`)

**Tagline:** Your Asset Protector & Builder of Self-Sovereign Empires and Domains.

**Core idea:** Solo operators building at **team scale** via **Zero Person Enterprises (ZPEs)** — productivity measured in **FTEP** (full-time-equivalent person output).

**Eight personas (use cases):**

1. **Veteran** — BROK console: financial genius, instant banking & ops, 100 FTEP capability.
2. **Artist** — gallery, sales, royalties, investments, merch — 100-person output.
3. **Struggling small business owner** — 24/7 CFO, cash-flow, compliance, scalable engine.
4. **Trader** — explainable moves, risk, portfolio logic — 100-person hedge desk.
5. **Investor** — deal flow, diligence, allocation — 100-person family office clarity.
6. **Freelancer** — productized skills, automated billing, 100× leverage.
7. **Young entrepreneur / recent grad** — full startup team brain: finance, ops, taxes, scaling.
8. **Content creator** — multi-channel empire: sponsorships, launches, investments, structure.

**Footer:** ZPEs that actually work. **Neoscore** = patented alternative credit scoring for **humans AND AI agents** (legacy credit scoring fix).

---

## Live demo links (Try it out)

| URL | What |
|-----|------|
| https://bio-age.kiron.ai | BROK Bio-Age + $POCK wallet (live) |
| https://bio-age.kiron.ai/buy-pock | Stripe live checkout |
| https://bio-age.kiron.ai/subscribe | Essential $5 / Premium $149 |
| https://neobanx.com | Neobanx ecosystem |
| https://github.com/Ronald-Ingram/neobanx-website | GitHub (make public + push today) |

---

## Repo map — what exists locally (not yet on GitHub)

### A. `bio-age-tool/` — **first revenue product** (push ASAP)

```
bio-age-tool/
├── web/                    # Next.js → Vercel (bio-age.kiron.ai)
│   ├── app/                # pages + API routes (Stripe, POCK, proxy)
│   ├── components/         # WalletPanel, PdfUpload, Subscribe, etc.
│   └── lib/                # purchaseConfig, pockService, twilioSms
├── api/                    # FastAPI — PDF parse + PhenoAge calculate
├── brok_bioage/            # Levine + BROK math engine
├── supabase/migrations/    # $POCK wallet, Stripe, subscriptions
├── fly.toml, render.yaml   # API deploy configs
└── docs/xprize/            # this file + BROK-Use-Cases.png
```

### B. `neobanx-brok-mvp/` — full BROK agent stack (avatar, voice, telegram)

```
neobanx-brok-mvp/
├── api/                    # BROK chat, XTTS proxy, uploads
├── brok/                   # agent, memory, telegram, hermes
├── web/                    # MuseTalk avatar demo UI
├── xtts_service/           # voice clone service
├── frameworks/iem-sitvs/   # IEM explainability
├── supabase/migrations/
└── data/kiron_index/       # canon memory
```

### C. `neobanx-website` (GitHub) — likely **v0 Neobanx marketing site**

- Powers **neobanx.com** via Vercel project `v0-neobanx-website-code`
- **Not cloned on this Mac** — lives in GitHub / Vercel only
- For X Prize: either push **bio-age-tool** into this repo or add submodule `brok-bio-age`

---

## Built with (paste into form)

Next.js 15, React 19, TypeScript, Tailwind, FastAPI, Python 3.12, Supabase, Stripe (live), Twilio, Vercel, Docker, Levine PhenoAge, Neoscore (patent), IEM, $POCK, x402 agentic commerce vision, Gemini/Grok LLM integrations.

---

## Media for project page

- **Image:** `docs/xprize/assets/BROK-Use-Cases.png` (copied from Downloads)
- **Video:** FTEP countdown / BROK demo on Desktop (`brok_ftep_countdown_*.mp4`) when ready

---

## Urgent checklist (registration today)

1. `gh auth login` as **Ronald-Ingram**
2. Make `neobanx-website` **public** OR create `Ronald-Ingram/brok-bio-age` public
3. Push `bio-age-tool` (revenue + live URLs) — minimum viable for judges
4. Commit message dated **2026-07-06** — deploy day
5. Paste project story emphasizing BROK (not legacy Neobanx-only)
6. Upload **BROK Use Cases** image to project gallery