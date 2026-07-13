#!/usr/bin/env python3
"""Seed global BROK medium-term memory rows (idempotent by title)."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_LOCAL = ROOT / "web" / ".env.local"

ENTRIES = [
    {
        "title": "Crypto Arbitrage, Pairs Trading & BTC/Stable Opportunities",
        "tags": [
            "market_intel",
            "agentic_trading",
            "arbitrage",
            "pairs_trading",
            "stat_arb",
            "funding",
            "defi",
        ],
        "question_patterns": (
            "arbitrage pairs trading stat arb funding basis cointegration "
            "mean reversion btc eth sol stablecoin peg triangular"
        ),
        "source": "admin_seed_jul2026",
        "content": """Crypto markets remain inefficient enough for opportunities, but pure spatial/cross-exchange arb on liquid pairs (BTC/USDT, ETH/USDT) has tightened dramatically due to bots, aggregators, and high-frequency players—opportunities often last seconds and require capital, multi-exchange accounts, and ultra-low latency infra. Triangular arb (e.g., BTC → ETH → USDT → BTC on one venue) and stablecoin peg deviations (USDT vs USDC/USDe in stress/liquidity crunches) are more accessible but fee/slippage-sensitive.

Statistical/pairs trading (mean-reversion on cointegrated pairs) shows stronger credible evidence of edge. Studies and theses demonstrate profitability using cointegration, copulas, or VAR models on pairs like BTC-ETH, ETH-SOL, or BTC vs correlated alts—often yielding positive excess returns (some backtests >10-47% annualized in select periods with proper risk sizing). On X and quant discussions, traders highlight pairing longs on "strong" alts vs shorts on weak ones (or vs BTC), funding rate arb in perps, and DeFi-specific plays (e.g., on-chain wrapped/tokenized assets discounted vs CEX/OTC hedges).

Lesser/illiquid pairs or niche (e.g., specific alt-stable or cross-chain) offer more alpha but higher slippage, manipulation risk, and execution challenges—profitable systems exist for those with models + automation, per quant Reddit/X threads, but not "set-and-forget."

Attention level: Moderate-high in quant/pro circles and X/Reddit (ongoing discussions on infra edges), but lower retail hype than directional memes—many view pure arb as "diminishing" yet stat arb and hybrid carry as enduring.

Tradfi applicability: Highly relevant and widely adapted. Cointegration/pairs from equities/futures, basis trading (futures vs spot/index, like CME BTC futures basis or "BTIC"), spread trading, carry (funding rates analogous to roll yields), and mean-reversion in FX/commodities all map directly to crypto perps/spot (e.g., BTC perp funding + stable yields, or SOL ecosystem vs ETH). Papers explicitly test and confirm adaptations succeed in volatile crypto regimes.

Promising ideas: (a) BTC perp basis/funding arb vs spot or stables (low-risk carry with hedges); (b) Stat arb on BTC-ETH or ETH-SOL divergences using rolling z-scores/cointegration tests + on-chain volume filters; (c) Stablecoin peg + yield hybrids in DeFi; (d) For lesser pairs: monitor illiquid alt-stable spreads or DEX-CEX with agents for alerts.

Caveats: Material risk (slippage, liquidation, manipulation, regulatory). No strategy is consistently profitable without rigorous backtesting, risk management (position sizing, kill switches), and execution edge. Start paper trading or small sizes.""",
    },
    {
        "title": "Pump.fun Graduation, Meme Listings & CEX Progression",
        "tags": [
            "market_intel",
            "solana",
            "pump_fun",
            "memecoins",
            "cex_listing",
            "graduation",
        ],
        "question_patterns": (
            "pump.fun graduation meme altcoin listing coinbase binance kraken "
            "raydium dex cex sell the news popcat goat pnut"
        ),
        "source": "admin_seed_jul2026",
        "content": """Pump.fun (Solana-dominant) has an extremely low graduation rate: ~0.63% of tokens reach the bonding-curve threshold to migrate to a real DEX AMM (e.g., Raydium/PumpSwap, requiring ~$50-70k MC equivalent). Most fail quickly; bot activity and dumps reduce odds. Pre-graduation: heavy sell pressure from creators/early holders (92%+ of active tokens show dumps; selling before full graduation often more profitable due to liquidity discontinuity post-migration). Post-graduation/DEX: volatility spikes, many crash, but survivors gain persistent liquidity/volume.

Patterns around listings (DEX → CEX): Typical "hype pump" pre/during major listing (volume/price surge on announcement), followed by sell-the-news volatility or drawdowns—though some sustain if community/utility holds. Examples: POPCAT (Binance.US), GOAT (Binance futures), PNUT (Gate/OKX), and others that built hype on Solana before tiered CEX steps. Direct pump.fun → Coinbase is rare/selective (Coinbase is compliance-heavy; most grads hit tier-2 like Gate/OKX/MEXC first, then majors). PUMP (platform token) saw pumps post-Binance.US listings. Broader altcoins: community/volume milestones → smaller CEX → majors, with pre-listing accumulation and post-listing distribution common.

Platforms most similar to Coinbase (scale + stability): Coinbase emphasizes regulation, fiat on/off-ramps, and listing prestige. Closest: Kraken (strong security, regulatory focus, pro tools); Gemini (compliance-heavy US); Binance (unmatched volume/liquidity but different risk/jurisdictional profile); OKX/Bybit (derivs depth, global scale); Robinhood (retail-friendly, expanding agentic/crypto). Binance/OKX lead raw scale/trading features; Kraken/Gemini match stability/compliance vibe best.

Trading angle: Screen strong Pump.fun/Solana grads for volume/community signals; enter early with tight stops/exits pre/post major CEX; use agents for monitoring pre-grad dumps.""",
    },
    {
        "title": "L1/L2 Chain Correlations, Rotations & Synthesized Trading Ideas",
        "tags": [
            "market_intel",
            "l1",
            "l2",
            "ethereum",
            "solana",
            "base",
            "correlations",
            "chain_rotation",
        ],
        "question_patterns": (
            "l1 l2 layer ethereum solana base arbitrum correlation rotation "
            "eth sol btc dominance tvl meme defi chain beta"
        ),
        "source": "admin_seed_jul2026",
        "content": """L1 (Layer 1) = base blockchain with independent consensus, security, native gas/staking token. L2 (Layer 2) = scaling solution on top of L1; executes off-L1, settles on L1 for security. L1s are independent foundations; L2s are high-speed extensions borrowing L1 security (usually Ethereum).

Major liquid L1s (Jul 2026): Bitcoin (BTC) — store of value; Ethereum (ETH) — DeFi + institutional settlement + L2 hub; Solana (SOL) — throughput, memecoins, retail; BNB Chain; Avalanche; Sui; Aptos; Cardano; Polkadot; Cosmos; plus Near, Tron, TON, Kaspa, Sei, Monad, Berachain. Popular L2s on Ethereum: Base (Coinbase, high activity), Arbitrum, Optimism, zkSync, Polygon zkEVM, Scroll, Blast. L1 tokens trade ecosystem beta; L2 tokens (ARB, OP) trade more as infrastructure/governance.

Correlations remain high overall (~0.78-0.9 BTC-ETH-SOL in macro regimes), driven by Bitcoin dominance and risk-on flows, but meaningful rotations occur. Solana dominates retail/speculation/memes and often outperforms in hype cycles; Ethereum (and L2s like Base/Arbitrum) leads DeFi/TVL/institutional settlement—Base frequently tops L2 revenue/transactions. Arbitrum excels in sustainable DeFi; Solana in raw volume/speed for memes. Activity migrates to L2s/alt-L1s while ETH retains settlement moat. Recent re-coupling (ETH-SOL ~0.88) alongside Base's ETH-tied performance. Trends favor consolidation around ETH (institutional) and SOL (retail), with L2s capturing execution.

Most promising synthesized ideas:
- Stat arb / pairs on divergences: long/short cointegrated pairs (ETH vs SOL, BTC vs alts) using z-scores + on-chain filters (volume/TVL).
- Funding/basis + stable carry: perp funding vs spot or stable yields; combine with chain rotations (SOL ecosystem retail flows, Base/ETH DeFi when TVL grows).
- Listing momentum plays: Pump.fun/Solana grads → tiered CEX progression.
- Chain relative value / sector rotation: long SOL memes vs ETH/Base institutional plays during correlation breaks; track Base dominance or SOL outperformance as signals.
- Hybrid agentic edge: explainable agents for divergences, funding arb, listing alerts—sovereign stacks, on-chain data, Solana/$POCK focus.

Overall caveats: slippage, liquidation, manipulation, regulatory risk. Edges persist in hybrids but require ongoing adaptation. Paper trade first.""",
    },
]


def load_database_url() -> str | None:
    url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if url:
        return url
    if ENV_LOCAL.exists():
        for line in ENV_LOCAL.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() in ("DATABASE_URL", "SUPABASE_DB_URL") and val.strip():
                return val.strip().strip('"').strip("'")
    return None


def main() -> int:
    db_url = load_database_url()
    if not db_url:
        print("ERROR: Set DATABASE_URL in env or web/.env.local", file=sys.stderr)
        return 1

    try:
        import psycopg2
    except ImportError:
        os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
        import psycopg2

    expires = datetime.now(timezone.utc) + timedelta(days=30)

    conn = psycopg2.connect(db_url, connect_timeout=15)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                "select to_regclass('public.brok_medium_term_memory') is not null"
            )
            if not cur.fetchone()[0]:
                print(
                    "ERROR: brok_medium_term_memory missing — run apply_pock_migration.py --only 020 first",
                    file=sys.stderr,
                )
                return 1

            inserted = 0
            updated = 0
            for entry in ENTRIES:
                cur.execute(
                    "select id from public.brok_medium_term_memory where title = %s limit 1",
                    (entry["title"],),
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        """
                        update public.brok_medium_term_memory
                        set content = %s,
                            tags = %s,
                            question_patterns = %s,
                            source = %s,
                            expires_at = %s
                        where id = %s
                        """,
                        (
                            entry["content"],
                            entry["tags"],
                            entry["question_patterns"],
                            entry["source"],
                            expires,
                            row[0],
                        ),
                    )
                    updated += 1
                    print(f"  ↻ updated: {entry['title']}")
                else:
                    cur.execute(
                        """
                        insert into public.brok_medium_term_memory
                          (user_id, title, content, tags, question_patterns, source, expires_at)
                        values (null, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            entry["title"],
                            entry["content"],
                            entry["tags"],
                            entry["question_patterns"],
                            entry["source"],
                            expires,
                        ),
                    )
                    inserted += 1
                    print(f"  ✓ inserted: {entry['title']}")

        print(f"Done — {inserted} inserted, {updated} updated")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())