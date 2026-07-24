/**
 * Free live market quotes for BROK chat.
 *
 * Crypto: CoinGecko free Demo API (no key required; rate-limited).
 *   https://www.coingecko.com/en/api
 * Stocks/ETFs: Yahoo Finance public quote endpoint (no key; delayed quotes).
 *
 * Attribution: CoinGecko free tier expects attribution in product UI/docs.
 */

export type MarketQuote = {
  kind: "crypto" | "stock" | "unknown";
  query: string;
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change24hPct?: number | null;
  marketCap?: number | null;
  asOf: string;
  source: string;
  sourceUrl?: string;
  note?: string;
};

/** Explicit finance intent → capture symbol after cue (not bare English). */
const EXPLICIT_TICKER_RE =
  /(?:\$|ticker[:\s]+|price\s+of\s+|quote\s+(?:for\s+)?|stock\s+price\s+(?:of\s+)?|share\s+price\s+(?:of\s+)?|how\s+much\s+is\s+)\s*([A-Za-z]{1,6})\b/gi;
const CRYPTO_NAME_RE =
  /\b(bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge|ripple|xrp|cardano|ada|avalanche|avax|chainlink|link|polygon|matic|pol|litecoin|ltc|pepe|bonk|wif|jup|jupiter|pock|\$pock)\b/gi;
const STOCK_NAME_RE =
  /\b(apple|microsoft|google|alphabet|amazon|nvidia|tesla|meta|facebook|netflix|amd|intel|coinbase|microstrategy|berkshire|jpmorgan|goldman|sp500|s&p\s*500|nasdaq|dow)\b/gi;

/** Message is essentially a single symbol: "AAPL", "$NVDA", "tsla?" */
const SOLO_TICKER_RE = /^\$?([A-Za-z]{1,5})\??$/;

/** Map common names/tickers → CoinGecko ids */
const CRYPTO_IDS: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  xrp: "ripple",
  ripple: "ripple",
  ada: "cardano",
  cardano: "cardano",
  avax: "avalanche-2",
  avalanche: "avalanche-2",
  link: "chainlink",
  chainlink: "chainlink",
  matic: "matic-network",
  polygon: "matic-network",
  pol: "polygon-ecosystem-token",
  ltc: "litecoin",
  litecoin: "litecoin",
  pepe: "pepe",
  bonk: "bonk",
  wif: "dogwifcoin",
  jup: "jupiter-exchange-solana",
  jupiter: "jupiter-exchange-solana",
  // $POCK is a Solana pump.fun style token — try search; no stable CG id guaranteed
  pock: "pock",
};

const STOCK_SYMBOLS: Record<string, string> = {
  apple: "AAPL",
  aapl: "AAPL",
  microsoft: "MSFT",
  msft: "MSFT",
  google: "GOOGL",
  alphabet: "GOOGL",
  googl: "GOOGL",
  goog: "GOOG",
  amazon: "AMZN",
  amzn: "AMZN",
  nvidia: "NVDA",
  nvda: "NVDA",
  tesla: "TSLA",
  tsla: "TSLA",
  meta: "META",
  facebook: "META",
  netflix: "NFLX",
  nflx: "NFLX",
  amd: "AMD",
  intel: "INTC",
  intc: "INTC",
  coinbase: "COIN",
  coin: "COIN",
  microstrategy: "MSTR",
  mstr: "MSTR",
  berkshire: "BRK-B",
  jpmorgan: "JPM",
  jpm: "JPM",
  goldman: "GS",
  sp500: "^GSPC",
  nasdaq: "^IXIC",
  dow: "^DJI",
};

/**
 * Common English / chat words that are also (or look like) ticker symbols.
 * NEVER promote these to stocks unless the user used $TICKER or "ticker X".
 * Fixes Dave report: LIVE, YOU, GIVE, UP, JUST → garbage Yahoo quotes.
 */
const ENGLISH_STOP_TICKERS = new Set(
  [
    "a","i","the","and","or","for","of","to","on","in","is","it","my","me","us","we",
    "at","by","as","be","so","if","do","an","no","yes","not","all","any","can","may",
    "our","out","own","too","very","just","like","also","than","then","that","this",
    "with","from","into","over","under","about","after","before","what","how","why",
    "when","where","who","which","will","would","could","should","have","has","had",
    "are","was","were","been","being","get","got","make","made","take","give","gave",
    "live","life","love","look","long","last","late","less","more","most","much",
    "many","some","such","only","other","into","over","such","same","tell","told",
    "want","need","help","know","think","feel","come","came","go","goes","went",
    "see","saw","say","said","put","set","let","try","use","used","keep","kept",
    "call","back","good","best","better","great","full","free","open","next","new",
    "old","big","small","high","low","real","true","false","yes","ok","okay","hey",
    "hi","hello","thanks","thank","please","sorry","sure","well","now","here","there",
    "today","once","again","still","even","ever","never","always","maybe","really",
    "actually","basically","literally","you","your","yours","he","she","they","them",
    "their","his","her","its","our","ours","up","down","off","out","away","here",
    "form","long","tell","about","latest","price","stock","stocks","crypto","token",
    "tokens","share","shares","market","markets","trade","trades","trading","invest",
    "quote","quotes","worth","value","cap","spot","buy","sell","hold","cash","fund",
    "brok","brock","pock","spock","kiron","neobanx","chat","voice","avatar","send",
    "type","text","mic","speak","talk","read","show","list","info","data","news",
    "update","post","posts","link","page","app","user","users","team","plan","goal",
    "idea","work","works","working","start","stop","end","done","next","step","steps",
    "one","two","three","four","five","first","last","part","parts","item","items",
    "time","times","day","days","week","year","years","now","soon","later","early",
    "right","left","side","way","ways","kind","type","sort","bit","lot","lots",
    "guy","guys","man","men","woman","women","people","person","world","life",
    "give","gave","given","take","took","taken","bring","brought","find","found",
    "keep","kept","leave","left","turn","turned","run","ran","move","moved",
    "play","played","win","won","lose","lost","pay","paid","cost","costs",
    "grow","grew","rise","fell","fall","drop","jump","gain","loss","risk",
    "safe","hard","easy","fast","slow","near","far","top","bottom","mid",
    "main","core","base","key","note","notes","fact","facts","rule","rules",
    "code","file","files","line","lines","word","words","name","names",
    "home","away","city","state","country","area","zone","level","mode",
    "on","off","in","out","up","down","yes","no","ok","id","am","pm",
    "usd","eur","gbp","jpy","cny","btc","eth","sol", // crypto handled separately
  ].map((w) => w.toLowerCase())
);

function isBlockedEnglishTicker(sym: string): boolean {
  return ENGLISH_STOP_TICKERS.has(sym.toLowerCase());
}

function addStockCandidate(
  stocks: Set<string>,
  raw: string,
  opts: { allowEnglish?: boolean } = {}
): void {
  const sym = raw.toUpperCase().replace(/[^A-Z.\-]/g, "");
  if (!sym || sym.length > 5) return;
  const low = sym.toLowerCase();
  if (low === "pock" || low === "brok") return;
  if (CRYPTO_IDS[low]) return; // crypto path
  if (!opts.allowEnglish && isBlockedEnglishTicker(sym)) return;
  if (STOCK_SYMBOLS[low]) {
    stocks.add(STOCK_SYMBOLS[low]);
    return;
  }
  // Unknown symbols: only if not common English (or allowEnglish via $TICKER)
  if (isBlockedEnglishTicker(sym) && !opts.allowEnglish) return;
  if (sym.length >= 1 && sym.length <= 5) stocks.add(sym);
}

/**
 * Extract market queries from the *current user message only*.
 * Strict: no bare English words as tickers (Dave bug: LIVE/YOU/GIVE/UP/JUST).
 */
export function extractMarketQueries(message: string): {
  cryptos: string[];
  stocks: string[];
} {
  const cryptos = new Set<string>();
  const stocks = new Set<string>();
  const m = message.toLowerCase();
  const trimmed = message.trim();

  // 1) Named cryptos / stocks
  for (const match of message.matchAll(CRYPTO_NAME_RE)) {
    const k = match[1]!.toLowerCase().replace("$", "");
    if (k) cryptos.add(k);
  }
  for (const match of message.matchAll(STOCK_NAME_RE)) {
    const k = match[1]!.toLowerCase().replace(/\s+/g, "");
    const sym = STOCK_SYMBOLS[k];
    if (sym) stocks.add(sym);
  }

  // 2) Explicit cues: $AAPL, ticker NVDA, price of TSLA, quote for …
  let t: RegExpExecArray | null;
  const re = new RegExp(EXPLICIT_TICKER_RE.source, "gi");
  while ((t = re.exec(message)) !== null) {
    const raw = t[1]!;
    const low = raw.toLowerCase();
    if (CRYPTO_IDS[low] || low === "pock") {
      cryptos.add(low === "pock" ? "pock" : low);
      continue;
    }
    // Block common English even after "price of" / "$" (e.g. "price of love", "$LIVE")
    if (isBlockedEnglishTicker(raw)) continue;
    addStockCandidate(stocks, raw);
  }

  // 3) Solo symbol message: "AAPL" / "$NVDA?"
  const solo = trimmed.match(SOLO_TICKER_RE);
  if (solo) {
    const raw = solo[1]!;
    const low = raw.toLowerCase();
    if (CRYPTO_IDS[low] || low === "pock") {
      cryptos.add(low === "pock" ? "pock" : low);
    } else if (!isBlockedEnglishTicker(raw) || STOCK_SYMBOLS[low]) {
      addStockCandidate(stocks, raw);
    }
  }

  // 4) ALL-CAPS tokens (2–5) only with clear finance intent
  //    e.g. "What's NVDA doing?" — not "PLEASE GIVE ME LIVE UPDATES"
  const financeIntent =
    /\b(price|quote|ticker|stock|stocks|shares?|equity|equities|etf|nasdaq|nyse|s&p|dow|portfolio|earnings|dividend|ipo|market\s*cap|share\s*price|spot\s*price|trading\s+at|how\s+much\s+is|worth\s+now)\b/i.test(
      m
    ) || /\$[A-Za-z]{1,5}\b/.test(message);
  if (financeIntent) {
    for (const match of message.matchAll(/\b([A-Z]{2,5})\b/g)) {
      const raw = match[1]!;
      if (isBlockedEnglishTicker(raw)) continue;
      const low = raw.toLowerCase();
      if (CRYPTO_IDS[low]) {
        cryptos.add(low);
        continue;
      }
      addStockCandidate(stocks, raw);
    }
    // Known lowercase tickers when finance intent: "aapl price"
    for (const match of message.matchAll(/\b([a-z]{2,5})\b/g)) {
      const low = match[1]!;
      if (STOCK_SYMBOLS[low]) stocks.add(STOCK_SYMBOLS[low]);
      if (CRYPTO_IDS[low]) cryptos.add(low);
    }
  }

  // $POCK with price/market/conversion language
  if (
    /\b\$?pock\b/i.test(message) &&
    /\b(price|worth|market|trade|jupiter|quote|convert|conversion|in\s*usd|to\s*usd|usd\s*(?:value|amount)|dollars?|how\s+much|equals?|equivalent)\b/i.test(
      m
    )
  ) {
    cryptos.add("pock");
  }
  // Pure conversion phrasing without other coins
  if (
    /\b(convert|conversion|exchange)\b/i.test(m) &&
    /\b\$?pock\b/i.test(message) &&
    /\b(usd|dollar|\$)\b/i.test(m)
  ) {
    cryptos.add("pock");
  }

  return {
    cryptos: [...cryptos].slice(0, 6),
    stocks: [...stocks].filter((s) => !isBlockedEnglishTicker(s)).slice(0, 6),
  };
}

export function wantsMarketPrices(message: string): boolean {
  const { cryptos, stocks } = extractMarketQueries(message);
  if (cryptos.length || stocks.length) return true;
  // Intent alone is not enough — prevents "market" in prose from forcing empty/noise fetches
  return false;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return res.json();
}

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/plain,text/html,*/*",
      "User-Agent": BROWSER_UA,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return res.text();
}

/** Parse plausible USD equity prices from scraped markdown/HTML. */
function parseUsdPricesFromText(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([\d,]+\.\d{2})\b/g)) {
    const n = Number(m[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0.5 && n < 500_000) out.push(n);
  }
  return out;
}

function pickEquityPrice(candidates: number[]): number | null {
  if (!candidates.length) return null;
  // Prefer typical large-cap range; avoid tiny UI prices ($1, $10) when better options exist.
  const mid = candidates.filter((p) => p >= 5 && p <= 50_000);
  if (mid.length) return mid[0]!;
  return candidates[0]!;
}

async function quoteCrypto(query: string): Promise<MarketQuote> {
  const key = query.toLowerCase().replace("$", "");
  let id = CRYPTO_IDS[key];

  // $POCK / unknown: search CoinGecko
  if (!id || id === "pock") {
    try {
      const search = (await fetchJson(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
      )) as {
        coins?: { id: string; symbol: string; name: string }[];
      };
      const coins = search.coins ?? [];
      // Prefer Solana / pump-style or exact symbol pock
      const hit =
        coins.find((c) => c.symbol.toLowerCase() === "pock") ||
        coins.find((c) => c.symbol.toLowerCase() === key) ||
        coins[0];
      if (hit) id = hit.id;
    } catch {
      /* fall through */
    }
  }

  if (!id || id === "pock") {
    return {
      kind: "crypto",
      query,
      symbol: key.toUpperCase(),
      name: query,
      price: null,
      currency: "USD",
      asOf: new Date().toISOString(),
      source: "CoinGecko",
      sourceUrl: "https://www.coingecko.com",
      note:
        key === "pock"
          ? "No stable CoinGecko listing id for $POCK yet — check Jupiter / DexScreener and founder X for mint 76r29NpnRW8PAxpnSnVBFcZPUcukgvno1Kkiysg8pump"
          : "Coin not found on CoinGecko free search",
    };
  }

  try {
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
    )) as Record<
      string,
      { usd?: number; usd_24h_change?: number; usd_market_cap?: number }
    >;
    const row = data[id];
    return {
      kind: "crypto",
      query,
      symbol: key.toUpperCase(),
      name: id,
      price: row?.usd ?? null,
      currency: "USD",
      change24hPct: row?.usd_24h_change ?? null,
      marketCap: row?.usd_market_cap ?? null,
      asOf: new Date().toISOString(),
      source: "CoinGecko (free)",
      sourceUrl: `https://www.coingecko.com/en/coins/${id}`,
    };
  } catch (e) {
    return {
      kind: "crypto",
      query,
      symbol: key.toUpperCase(),
      name: id,
      price: null,
      currency: "USD",
      asOf: new Date().toISOString(),
      source: "CoinGecko",
      note: e instanceof Error ? e.message : "fetch_failed",
    };
  }
}

async function quoteStockYahoo(sym: string): Promise<MarketQuote | null> {
  try {
    // Try query1 then query2; Vercel often gets 429 — fail soft.
    for (const host of ["query1", "query2"] as const) {
      try {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
        const data = (await fetchJson(url, 8_000)) as {
          chart?: {
            result?: {
              meta?: {
                regularMarketPrice?: number;
                chartPreviousClose?: number;
                previousClose?: number;
                currency?: string;
                shortName?: string;
                longName?: string;
                symbol?: string;
              };
            }[];
          };
        };
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        const prev = meta.chartPreviousClose ?? meta.previousClose;
        const price = meta.regularMarketPrice;
        const change24hPct =
          prev && prev > 0 ? ((price - prev) / prev) * 100 : null;
        return {
          kind: "stock",
          query: sym,
          symbol: meta.symbol ?? sym,
          name: meta.shortName || meta.longName || sym,
          price,
          currency: meta.currency || "USD",
          change24hPct,
          asOf: new Date().toISOString(),
          source: "yahoo",
        };
      } catch {
        continue;
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Free scrape fallback when Yahoo rate-limits serverless IPs. */
async function quoteStockScrape(sym: string): Promise<MarketQuote | null> {
  const urls = [
    `https://r.jina.ai/https://www.google.com/finance/quote/${encodeURIComponent(sym)}:NASDAQ`,
    `https://r.jina.ai/https://www.google.com/finance/quote/${encodeURIComponent(sym)}:NYSE`,
    `https://r.jina.ai/https://www.marketwatch.com/investing/stock/${encodeURIComponent(sym.toLowerCase())}`,
  ];
  for (const url of urls) {
    try {
      const text = await fetchText(url, 18_000);
      const prices = parseUsdPricesFromText(text);
      const price = pickEquityPrice(prices);
      if (price == null) continue;
      // Optional day change: look for +1.23% or -0.45% near start of page
      let change24hPct: number | null = null;
      const ch = text.match(/([+\-][\d]+\.[\d]+)\s*%/);
      if (ch) change24hPct = Number(ch[1]);
      return {
        kind: "stock",
        query: sym,
        symbol: sym,
        name: sym,
        price,
        currency: "USD",
        change24hPct,
        asOf: new Date().toISOString(),
        source: "market_scrape",
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function quoteStock(symbol: string): Promise<MarketQuote> {
  const sym = symbol.toUpperCase();
  const yahoo = await quoteStockYahoo(sym);
  if (yahoo?.price != null) return yahoo;
  const scraped = await quoteStockScrape(sym);
  if (scraped?.price != null) return scraped;
  return {
    kind: "stock",
    query: sym,
    symbol: sym,
    name: sym,
    price: null,
    currency: "USD",
    asOf: new Date().toISOString(),
    source: "unavailable",
    note: "Quote temporarily unavailable",
  };
}

export async function fetchMarketQuotes(message: string): Promise<MarketQuote[]> {
  const { cryptos, stocks } = extractMarketQueries(message);
  const out: MarketQuote[] = [];

  await Promise.all([
    ...cryptos.map(async (c) => {
      out.push(await quoteCrypto(c));
    }),
    ...stocks.map(async (s) => {
      out.push(await quoteStock(s));
    }),
  ]);

  return out;
}

export function formatMarketQuotesBlock(quotes: MarketQuote[]): string {
  const usable = quotes.filter((q) => q.price != null);
  if (!usable.length) return "";
  const lines = usable.map((q) => {
    const px =
      q.price != null
        ? `${q.currency} ${q.price.toLocaleString(undefined, {
            maximumFractionDigits: q.price < 1 ? 8 : 2,
          })}`
        : "unavailable";
    const ch =
      q.change24hPct != null
        ? ` (${q.change24hPct >= 0 ? "+" : ""}${q.change24hPct.toFixed(2)}%)`
        : "";
    const mc =
      q.marketCap != null
        ? ` · market cap ~$${Math.round(q.marketCap).toLocaleString()}`
        : "";
    // No source names or URLs in the block — user-facing answers must not cite vendors/links for prices.
    return `• ${q.kind === "crypto" ? "Crypto" : "Stock"} ${q.symbol}: ${px}${ch}${mc}`;
  });

  return `LIVE MARKET QUOTES (fetched just now — use these numbers; do not invent prices):
${lines.join("\n")}

RESPONSE RULES FOR PRICES:
- State the price and optional % change only.
- Do NOT name data vendors, APIs, or paste any source links for stock/crypto prices.
- Not financial advice / DYOR is fine.
- For $POCK if price unavailable: say so briefly; founder feed may still help for narrative.`;
}

export async function buildMarketPricesKnowledgeBlock(
  message: string
): Promise<string | null> {
  // Only when we extracted real symbols — never on vague "market" prose alone.
  if (!wantsMarketPrices(message)) return null;
  try {
    const quotes = await fetchMarketQuotes(message);
    // Drop failed/unknown placeholders so the model is not fed junk tickers.
    const usable = quotes.filter(
      (q) =>
        q.price != null &&
        q.source !== "unavailable" &&
        !isBlockedEnglishTicker(q.symbol)
    );
    if (!usable.length) return null;
    return formatMarketQuotesBlock(usable);
  } catch {
    return null;
  }
}
