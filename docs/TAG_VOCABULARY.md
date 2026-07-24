---
doc_type: index
tags:
  - recon
  - tags
  - vocabulary
  - indexing
  - multi-entity
entities:
  - neobanx
  - personal
  - brok
  - pock
rails: []
status: living
updated: 2026-07-23
---

# Tag vocabulary (recon & accounting docs)

**Why:** Keywords in file frontmatter so humans and agents can `grep` / search without memorizing paths.  
**Master map:** `RECON_MASTER_INDEX.md`  
**Search recipe:**

```bash
# Find all recon-tagged docs
rg -l '^tags:' docs --glob '*.md' | xargs rg -l 'recon'

# Or any keyword in frontmatter
rg -n --type md -e '^- convert-note' -e 'convert-note' docs/
rg -n 'tags:' -A 15 docs --glob '*.md'
```

---

## Convention (every recon-related `.md`)

Put **YAML frontmatter** at the top of the file:

```yaml
---
doc_type: memo          # index | policy | memo | recon-sample | incident | backlog | design
tags:
  - recon               # always include if used in multi-entity recon
  - founder
  # … controlled terms from lists below
entities:
  - neobanx             # neobanx | personal | brok | pock | kiron | grantor | vendor
rails:
  - on-chain            # on-chain | stripe | reserved | corp-float | bank | brokerage | qb
status: living          # living | frozen | draft | parked
updated: YYYY-MM-DD
---
```

**Folders:** optional `TAGS.txt` or `README.md` frontmatter in the folder (same `tags:` list) — prefer tagging **files**, not only folders.

**When adding a new memo:**  
1. Add frontmatter tags  
2. Add a row to `RECON_MASTER_INDEX.md`  
3. If you invent a **new** keyword, add it to this vocabulary (don’t silently invent synonyms)

---

## Controlled tags (prefer these spellings)

### Always / process
| Tag | Meaning |
|-----|---------|
| `recon` | Multi-entity reconciliation material |
| `accounting` | Books / GL / classification |
| `cpa` | Hand to CPA |
| `counsel` | Legal / securities sensitive |
| `period-pack` | Period close export |
| `checklist` | Action list |
| `index` | Map / TOC |

### Classification (founder funding A–F)
| Tag | Meaning |
|-----|---------|
| `due-to-founder` | Option A |
| `convert-note` | Option B |
| `capital-contribution` | Option C |
| `reimbursement` | Option D |
| `grant` | Option E |
| `vesting-unlock` | Option F |
| `founder` | Founder-related funding |
| `bank-stock` | Personal brokerage source of funds |
| `personal-capital-loss` | Track P only |
| `two-track` | Personal vs corporate tracks |

### Product / rails
| Tag | Meaning |
|-----|---------|
| `stripe` | Card / Checkout / payouts |
| `reserved-ledger` | Genius Supabase balance |
| `on-chain` | Solana treasury / SPL |
| `corp-wallet` | `GDbcx…` |
| `corp-float` | Trial float row |
| `buyback` | 20% treasury buyback |
| `streamflow` | Vesting streams |
| `genius-wallet` | Product wallet UX |
| `pock` | $POCK token / utility |
| `brok` | BROK agent / product |
| `prepaid` | Customer prepaid liability |
| `vendor` | Vendor / contractor pay |
| `tony` | Tony package memos |
| `scholarship` | Sub-wallet scholarships |
| `trial` | Trial credits / farm |
| `custody-release` | Reserved → on-chain out |

### Entities
| Tag | Meaning |
|-----|---------|
| `neobanx` | Neobanx Software, Inc. |
| `personal` | Founder personal books |
| `kiron` | Kiron Canon / related |
| `multi-entity` | Cross-entity |

### Doc types (also in `doc_type:`)
`index` · `policy` · `memo` · `recon-sample` · `incident` · `backlog` · `design` · `handoff`

---

## Anti-patterns

- Don’t use free-text blobs instead of the list above (`"money I put in"` → `due-to-founder` + `founder`)  
- Don’t tag chat-only notes — **write a file** first  
- Don’t duplicate 20 synonyms (`loan`, `advance`, `iou`) — use `due-to-founder`  
- Sensitive legal PDFs: tag `counsel` + keep path in master index; consider gitignore for `docs/recon/legal/`

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-23 | Initial vocabulary + frontmatter convention |
