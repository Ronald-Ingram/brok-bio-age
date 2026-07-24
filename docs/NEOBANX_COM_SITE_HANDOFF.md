# neobanx.com corporate site — handoff (retained for future)

**Live:** https://neobanx.com  
**Product (separate):** https://brok.neobanx.com  

## Source of truth

| Item | Value |
|------|--------|
| GitHub (private) | https://github.com/Ronald-Ingram/neobanx-website |
| Owner | Ronald-Ingram |
| Default branch | `main` |
| GitHub homepage field | https://v0-neobanx-website-code.vercel.app |
| Stack | Next.js App Router, `pnpm`, components/ + app/ + public/ |
| Hosting | Vercel (production domain neobanx.com) |
| Vercel team | `neobanx-zpe` |
| Vercel project | **`v0-neobanx-website-code`** → https://neobanx.com |
| Local clone on this Mac (as of 2026-07-20) | **Not found** — clone before editing |

```bash
cd ~
git clone https://github.com/Ronald-Ingram/neobanx-website.git
cd neobanx-website
pnpm install
```

## Litepaper assets (on disk)

| File | Path |
|------|------|
| v1.2 PDF (publish candidate) | `/Users/kiki/Downloads/POCK_Litepaper_v1.2_DRAFT_Jul2026.pdf` |
| v1.2 also | `/Users/kiki/Desktop/Kiron Canon/POCK_Litepaper_v1.2_DRAFT_Jul2026.pdf` |
| v1.2 MD sources | `/Users/kiki/Desktop/Kiron Canon/POCK_Litepaper_v1.2_*.md` |
| v1.1 branded PDF | `/Users/kiki/Downloads/POCK_Litepaper_v1.1_Branded.pdf` |
| Live site currently serves | https://neobanx.com/POCK_Litepaper_v1.1_Branded.pdf |
| Preferred public path after update | `/POCK_Litepaper_v1.2.pdf` (drop DRAFT in public name if approved) |

## Brand assets on disk

| Asset | Path |
|-------|------|
| Logo wide | `/Users/kiki/Downloads/neobanx_logo_wide.png` |
| Live logo URL | https://neobanx.com/images/neobanx_logo_wide.png |

## Events (press / launch)

| Field | Value |
|-------|--------|
| Tickets | https://luma.com/cjv8lnyp |
| Title | BROK GENIUS $POCK OFFICIAL AI LAUNCH EVENT |
| When | 2026-07-24, 1:30–3:30 PM PT (doors 1:30) |
| Where | International Innovation Center / StartUpNV, 300 S 4th St #180, Las Vegas, NV 89101 |

## Press-update goals (summary)

1. BROK as gateway → Talk to BROK CTA → https://brok.neobanx.com/chat  
2. Events nav → Luma URL (new tab, noopener)  
3. Litepaper v1.2 static asset + replace v1.1 links  
4. Remove dead “wallet coming soon” / prefer Genius Wallet live  
5. **Replace primary Get Started → pump.fun** with product CTAs (critical for press)  
6. No securities/return claims; utility / prepaid framing  

## Rollback before deploy

```bash
cd ~/neobanx-website
git fetch origin && git checkout main && git pull
git tag -a pre-press-$(date +%Y%m%d) -m "Snapshot before press site update"
git push origin pre-press-YYYYMMDD
```

Also: Vercel → Deployments → previous Ready → Promote to Production.

## Related product repo (do not confuse)

| Item | Value |
|------|--------|
| Product | https://github.com/Ronald-Ingram/brok-bio-age |
| Local | `/Users/kiki/bio-age-tool` |
| Deploy | Vercel project `web` → brok.neobanx.com / brok.kiron.ai |

## Note

GitHub `pushed_at` for neobanx-website was **2026-05-31** when last checked; live site may have later Vercel-only deploys. Always `git pull` and confirm Vercel production commit before editing.

