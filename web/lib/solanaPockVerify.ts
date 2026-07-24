/**
 * On-chain $POCK balance check via Solana JSON-RPC.
 * Uses POCK_SPL_MINT (env or default mint) + SOLANA_RPC_URL.
 */

import { POCK_OG_MIN_HELD } from "./ogEntitlementsConfig";
import { POCK_SPL_MINT } from "./pockPrice";

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

export interface PockWalletProof {
  wallet: string;
  balanceRaw: number;
  /** Full UI amount (may include fractional SPL units). */
  balanceUiExact: number;
  /** Floor of UI amount — used for OG entitlement thresholds. */
  balanceUi: number;
  meetsMinimum: boolean;
}

export async function getPockSplBalance(
  walletAddress: string
): Promise<PockWalletProof> {
  const mint = POCK_SPL_MINT;
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

  const balanceUiExact = totalUi || totalRaw / 1e6;
  const balanceUi = Math.floor(balanceUiExact);

  return {
    wallet: walletAddress,
    balanceRaw: totalRaw,
    balanceUiExact,
    balanceUi,
    meetsMinimum: balanceUi >= POCK_OG_MIN_HELD,
  };
}

export function normalizeSolanaAddress(addr: string): string | null {
  const t = addr.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return null;
  return t;
}