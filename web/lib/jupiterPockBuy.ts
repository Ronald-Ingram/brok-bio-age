import { POCK_SPL_MINT } from "@/lib/pockPrice";
import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import {
  getSolanaConnection,
  loadCorpKeypair,
} from "@/lib/solanaCorpWallet";
import type { BuybackInputAsset } from "@/lib/treasuryBuybackConfig";
import { VersionedTransaction } from "@solana/web3.js";

const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

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

export async function executeJupiterPockBuy(opts: {
  usdCents: number;
  inputAsset: BuybackInputAsset;
  slippageBps: number;
  walletAddress?: string;
}): Promise<JupiterBuyResult> {
  const wallet = opts.walletAddress ?? NEOBANX_CORP_WALLET;
  const inputMint = inputMintFor(opts.inputAsset);
  const solUsd = opts.inputAsset === "sol" ? await fetchSolUsdPrice() : undefined;
  const amount = usdCentsToInputRaw(opts.usdCents, opts.inputAsset, solUsd);

  if (amount < BigInt(1)) {
    throw new Error("buy_amount_too_small");
  }

  const quoteUrl = new URL(`${JUPITER_QUOTE_API}/quote`);
  quoteUrl.searchParams.set("inputMint", inputMint);
  quoteUrl.searchParams.set("outputMint", POCK_SPL_MINT);
  quoteUrl.searchParams.set("amount", amount.toString());
  quoteUrl.searchParams.set("slippageBps", String(opts.slippageBps));
  quoteUrl.searchParams.set("swapMode", "ExactIn");

  const quoteRes = await fetch(quoteUrl.toString(), { cache: "no-store" });
  if (!quoteRes.ok) {
    const text = await quoteRes.text().catch(() => "");
    throw new Error(`jupiter_quote_failed:${quoteRes.status}:${text.slice(0, 200)}`);
  }

  const quote = await quoteRes.json();
  if (!quote?.outAmount) {
    throw new Error("jupiter_quote_invalid");
  }

  const swapRes = await fetch(`${JUPITER_QUOTE_API}/swap`, {
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
    throw new Error(`jupiter_swap_failed:${swapRes.status}:${text.slice(0, 200)}`);
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

  const connection = getSolanaConnection();
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
}