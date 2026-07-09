import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

export function corpWalletSignerConfigured(): boolean {
  return Boolean(process.env.NEOBANX_CORP_WALLET_SECRET_KEY?.trim());
}

export function loadCorpKeypair(): Keypair {
  const secret = process.env.NEOBANX_CORP_WALLET_SECRET_KEY?.trim();
  if (!secret) throw new Error("corp_signer_not_configured");
  return Keypair.fromSecretKey(bs58.decode(secret));
}

export function getSolanaConnection(): Connection {
  const rpc = process.env.SOLANA_RPC_URL?.trim() || DEFAULT_RPC;
  return new Connection(rpc, "confirmed");
}

export function assertCorpSignerMatchesWallet(): void {
  const keypair = loadCorpKeypair();
  const wallet = NEOBANX_CORP_WALLET;
  if (keypair.publicKey.toBase58() !== wallet) {
    throw new Error("corp_signer_wallet_mismatch");
  }
}