/**
 * On-chain $POCK balance check via Solana JSON-RPC.
 * Set POCK_SPL_MINT + SOLANA_RPC_URL in env for wallet OG claims.
 */

import { POCK_OG_MIN_HELD } from "./ogEntitlementsConfig";

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

export interface PockWalletProof {
  wallet: string;
  balanceRaw: number;
  balanceUi: number;
  meetsMinimum: boolean;
}

export async function getPockSplBalance(
  walletAddress: string
): Promise<PockWalletProof> {
  const mint = process.env.POCK_SPL_MINT?.trim();
  const rpc = process.env.SOLANA_RPC_URL?.trim() || DEFAULT_RPC;

  if (!mint) {
    throw new Error("pock_mint_not_configured");
  }

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      walletAddress,
      { mint },
      { encoding: "jsonParsed" },
    ],
  };

  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("solana_rpc_error");
  }

  const json = (await res.json()) as {
    result?: {
      value?: Array<{
        account?: {
          data?: {
            parsed?: {
              info?: {
                tokenAmount?: { amount?: string; uiAmount?: number };
              };
            };
          };
        };
      }>;
    };
    error?: { message?: string };
  };

  if (json.error) {
    throw new Error(json.error.message ?? "solana_rpc_error");
  }

  let totalRaw = 0;
  let totalUi = 0;

  for (const item of json.result?.value ?? []) {
    const amt = item.account?.data?.parsed?.info?.tokenAmount;
    if (!amt) continue;
    totalRaw += Number(amt.amount ?? "0");
    totalUi += Number(amt.uiAmount ?? 0);
  }

  const balanceUi = Math.floor(totalUi || totalRaw);

  return {
    wallet: walletAddress,
    balanceRaw: totalRaw,
    balanceUi,
    meetsMinimum: balanceUi >= POCK_OG_MIN_HELD,
  };
}

export function normalizeSolanaAddress(addr: string): string | null {
  const t = addr.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return null;
  return t;
}