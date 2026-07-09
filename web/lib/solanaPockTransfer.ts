import { POCK_SPL_MINT } from "@/lib/pockPrice";
import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import {
  assertCorpSignerMatchesWallet,
  getSolanaConnection,
  loadCorpKeypair,
} from "@/lib/solanaCorpWallet";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/** POCK SPL mint uses 6 decimals; ledger stores whole UI units. */
export const POCK_SPL_DECIMALS = 6;

export function pockUiToRaw(amountPock: number): bigint {
  if (!Number.isFinite(amountPock) || amountPock < 1) {
    throw new Error("transfer_amount_invalid");
  }
  return BigInt(amountPock) * BigInt(10 ** POCK_SPL_DECIMALS);
}

export interface PockSplTransferResult {
  txSignature: string;
  destWallet: string;
  amountPock: number;
  amountRaw: string;
}

export async function transferPockFromCorpWallet(opts: {
  destWallet: string;
  amountPock: number;
}): Promise<PockSplTransferResult> {
  assertCorpSignerMatchesWallet();
  const payer = loadCorpKeypair();
  const connection = getSolanaConnection();
  const mint = new PublicKey(POCK_SPL_MINT);
  const destOwner = new PublicKey(opts.destWallet.trim());
  const amountRaw = pockUiToRaw(opts.amountPock);

  const tokenProgram = TOKEN_2022_PROGRAM_ID;
  const sourceAta = await getAssociatedTokenAddress(
    mint,
    payer.publicKey,
    false,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const destAta = await getAssociatedTokenAddress(
    mint,
    destOwner,
    false,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const sourceInfo = await connection.getTokenAccountBalance(sourceAta).catch(() => null);
  const sourceRaw = sourceInfo ? BigInt(sourceInfo.value.amount) : BigInt(0);
  if (sourceRaw < amountRaw) {
    throw new Error(
      `corp_pock_insufficient: need ${amountRaw} raw, have ${sourceRaw}`
    );
  }

  const tx = new Transaction();

  const destAccount = await connection.getAccountInfo(destAta);
  if (!destAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        destOwner,
        mint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  tx.add(
    createTransferInstruction(
      sourceAta,
      destAta,
      payer.publicKey,
      amountRaw,
      [],
      tokenProgram
    )
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;

  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  const confirmed = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  if (confirmed.value.err) {
    throw new Error(`transfer_not_confirmed: ${JSON.stringify(confirmed.value.err)}`);
  }

  return {
    txSignature: sig,
    destWallet: destOwner.toBase58(),
    amountPock: opts.amountPock,
    amountRaw: amountRaw.toString(),
  };
}

export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

export function solscanWalletUrl(address: string): string {
  return `https://solscan.io/account/${address}`;
}

export function corpWalletAddress(): string {
  return NEOBANX_CORP_WALLET;
}