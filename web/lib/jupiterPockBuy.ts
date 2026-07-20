import { POCK_SPL_MINT } from "@/lib/pockPrice";
import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import {
  getSolanaConnection,
  loadCorpKeypair,
} from "@/lib/solanaCorpWallet";
import type { BuybackInputAsset } from "@/lib/treasuryBuybackConfig";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

/** Keep ~0.05 SOL for fees + ATA rent even when buy input is USDC. */
export const MIN_CORP_SOL_FOR_SWAP = 0.05;
const MIN_CORP_LAMPORTS = BigInt(Math.floor(MIN_CORP_SOL_FOR_SWAP * 1e9));

/**
 * Jupiter Swap API v1 (quote-api.jup.ag/v6 is retired — DNS fails → "fetch failed").
 * Prefer lite-api; fall back to api.jup.ag.
 * @see https://dev.jup.ag/docs/swap/get-quote
 */
const JUPITER_SWAP_BASES = [
  "https://lite-api.jup.ag/swap/v1",
  "https://api.jup.ag/swap/v1",
] as const;

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

const INPUT_DECIMALS: Record<BuybackInputAsset, number> = {
  usdc: 6,
  sol: 9,
};

export interface JupiterBuyResult {
  txSignature: string;
  inputAsset: BuybackInputAsset;
  inputAmountRaw: bigint;
  pockReceivedUi: number;
  quoteOutAmount: string;
}

function inputMintFor(asset: BuybackInputAsset): string {
  return asset === "usdc" ? USDC_MINT : SOL_MINT;
}

function usdCentsToInputRaw(
  usdCents: number,
  asset: BuybackInputAsset,
  solUsdPrice?: number
): bigint {
  const usd = usdCents / 100;
  if (asset === "usdc") {
    return BigInt(Math.floor(usd * 10 ** INPUT_DECIMALS.usdc));
  }
  const solPrice = solUsdPrice && solUsdPrice > 0 ? solUsdPrice : 150;
  const solAmount = usd / solPrice;
  return BigInt(Math.floor(solAmount * 10 ** INPUT_DECIMALS.sol));
}

async function fetchSolUsdPrice(): Promise<number | undefined> {
  try {
    const res = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112",
      { cache: "no-store" }
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      data?: Record<string, { price?: number }>;
    };
    return data.data?.[SOL_MINT]?.price;
  } catch {
    return undefined;
  }
}

async function jupiterFetch(
  pathAndQuery: string,
  init?: RequestInit
): Promise<Response> {
  let lastErr: Error | null = null;
  for (const base of JUPITER_SWAP_BASES) {
    try {
      const res = await fetch(`${base}${pathAndQuery}`, {
        ...init,
        cache: "no-store",
      });
      // Prefer first host that answers (even 4xx — caller handles body)
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`jupiter_http_${res.status}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("jupiter_unreachable");
}

function humanizeSwapError(err: unknown, inputAsset: BuybackInputAsset): Error {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  // Jupiter routes with USDC still need native SOL for fees + token-account rent.
  if (
    lower.includes("insufficient lamports") ||
    lower.includes("attempt to debit an account but found no record of a prior credit") ||
    /need \d+/.test(lower)
  ) {
    const match = raw.match(/insufficient lamports (\d+), need (\d+)/i);
    const have = match ? (Number(match[1]) / 1e9).toFixed(4) : "?";
    const need = match ? (Number(match[2]) / 1e9).toFixed(4) : "?";
    return new Error(
      `Buyback input is ${inputAsset.toUpperCase()} (not SOL for the swap), but the corp wallet needs native SOL for network fees and token-account rent. ` +
        `Balance ~${have} SOL, need at least ~${need} SOL for this step — keep ≥${MIN_CORP_SOL_FOR_SWAP} SOL for headroom. ` +
        `Top up SOL only (leave USDC for the $POCK purchase).`
    );
  }

  if (lower.includes("0x1788") || lower.includes("custom program error: 0x1788")) {
    return new Error(
      `Jupiter route failed (slippage or stale route). Retry; if it persists, raise slippage slightly or retry when liquidity is deeper. Input asset remains ${inputAsset.toUpperCase()}.`
    );
  }

  return err instanceof Error ? err : new Error(raw);
}

export async function executeJupiterPockBuy(opts: {
  usdCents: number;
  inputAsset: BuybackInputAsset;
  slippageBps: number;
  walletAddress?: string;
}): Promise<JupiterBuyResult> {
  const wallet = opts.walletAddress ?? NEOBANX_CORP_WALLET;
  const inputMint = inputMintFor(opts.inputAsset);
  const connection = getSolanaConnection();

  // Preflight: USDC buybacks still burn SOL for fees / ATA creation.
  try {
    const lamports = await connection.getBalance(new PublicKey(wallet));
    if (BigInt(lamports) < MIN_CORP_LAMPORTS) {
      throw new Error(
        `Corp wallet has ${(lamports / 1e9).toFixed(4)} SOL; need ≥${MIN_CORP_SOL_FOR_SWAP} SOL for fees/rent. ` +
          `Buyback spends ${opts.inputAsset.toUpperCase()} for $POCK — SOL is only for gas. Top up SOL on ${wallet}.`
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("need ≥")) throw e;
    // RPC blip — continue; send will fail with clearer logs if needed
  }

  const solUsd = opts.inputAsset === "sol" ? await fetchSolUsdPrice() : undefined;
  const amount = usdCentsToInputRaw(opts.usdCents, opts.inputAsset, solUsd);

  if (amount < BigInt(1)) {
    throw new Error("buy_amount_too_small");
  }

  const quoteQs = new URLSearchParams({
    inputMint,
    outputMint: POCK_SPL_MINT,
    amount: amount.toString(),
    slippageBps: String(opts.slippageBps),
    swapMode: "ExactIn",
  });

  try {
    const quoteRes = await jupiterFetch(`/quote?${quoteQs}`);
    if (!quoteRes.ok) {
      const text = await quoteRes.text().catch(() => "");
      throw new Error(
        `jupiter_quote_failed:${quoteRes.status}:${text.slice(0, 200)}`
      );
    }

    const quote = await quoteRes.json();
    if (!quote?.outAmount) {
      throw new Error("jupiter_quote_invalid");
    }

    const swapRes = await jupiterFetch(`/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    if (!swapRes.ok) {
      const text = await swapRes.text().catch(() => "");
      throw new Error(
        `jupiter_swap_failed:${swapRes.status}:${text.slice(0, 200)}`
      );
    }

    const swapPayload = (await swapRes.json()) as { swapTransaction?: string };
    if (!swapPayload.swapTransaction) {
      throw new Error("jupiter_swap_missing_tx");
    }

    const keypair = loadCorpKeypair();
    if (keypair.publicKey.toBase58() !== wallet) {
      throw new Error("corp_signer_wallet_mismatch");
    }

    const txBuf = Buffer.from(swapPayload.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([keypair]);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    await connection.confirmTransaction(sig, "confirmed");

    const outRaw = BigInt(quote.outAmount as string);
    const pockReceivedUi = Number(outRaw) / 1_000_000;

    return {
      txSignature: sig,
      inputAsset: opts.inputAsset,
      inputAmountRaw: amount,
      pockReceivedUi,
      quoteOutAmount: String(quote.outAmount),
    };
  } catch (e) {
    throw humanizeSwapError(e, opts.inputAsset);
  }
}