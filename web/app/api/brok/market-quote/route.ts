import { buildMarketPricesKnowledgeBlock, fetchMarketQuotes } from "@/lib/marketPrices";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Public diagnostic / optional client: GET ?q=bitcoin+AAPL */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "bitcoin";
  try {
    const quotes = await fetchMarketQuotes(q);
    const block = await buildMarketPricesKnowledgeBlock(q);
    return NextResponse.json({
      ok: true,
      query: q,
      quotes,
      block,
      sources: {
        crypto: "CoinGecko free API (no key)",
        stocks: "Yahoo Finance public chart quotes (no key, may be delayed)",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "quote_failed" },
      { status: 502 }
    );
  }
}
