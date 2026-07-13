import type { BrokUserFacts } from "./brokUserFacts";
import { mergeUserFacts } from "./brokUserFacts";
import { getServiceSupabase } from "./supabase/server";

export type AccountMergeResult = {
  merged: boolean;
  pockTransferred: number;
  secondaryUserId?: string;
};

/**
 * Move balance, ledger, stripe rows, chat threads, and facts from a secondary
 * brok_users row into the primary account (e.g. orphan device session).
 */
export async function mergeSecondaryIntoPrimary(
  primaryId: string,
  secondaryId: string
): Promise<AccountMergeResult> {
  if (!secondaryId || secondaryId === primaryId) {
    return { merged: false, pockTransferred: 0 };
  }

  const supabase = getServiceSupabase();

  const { data: primary, error: pErr } = await supabase
    .from("brok_users")
    .select("*")
    .eq("id", primaryId)
    .single();
  if (pErr || !primary) {
    throw new Error("primary_not_found");
  }

  const { data: secondary, error: sErr } = await supabase
    .from("brok_users")
    .select("*")
    .eq("id", secondaryId)
    .single();
  if (sErr || !secondary) {
    return { merged: false, pockTransferred: 0, secondaryUserId: secondaryId };
  }

  const transfer = Number(secondary.pock_balance ?? 0);
  let newPrimaryBalance = Number(primary.pock_balance ?? 0);

  if (transfer >= 1) {
    newPrimaryBalance += transfer;
    await supabase.from("pock_ledger").insert({
      user_id: primaryId,
      amount: transfer,
      balance_after: newPrimaryBalance,
      kind: "transfer_in",
      note: `Device link merge from ${secondaryId.slice(0, 8)}…`,
      custody_state:
        primary.custody_status === "self_custodial" ? "reserved" : "reserved",
    });
    await supabase.from("pock_ledger").insert({
      user_id: secondaryId,
      amount: -transfer,
      balance_after: 0,
      kind: "transfer_out",
      note: `Merged into ${primaryId.slice(0, 8)}…`,
    });
    await supabase
      .from("brok_users")
      .update({
        pock_balance: newPrimaryBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", primaryId);
    await supabase
      .from("brok_users")
      .update({
        pock_balance: 0,
        display_name: `merged→${primaryId.slice(0, 8)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", secondaryId);
  }

  if (secondary.solana_wallet_address && !primary.solana_wallet_address) {
    await supabase
      .from("brok_users")
      .update({
        solana_wallet_address: secondary.solana_wallet_address,
        custody_status: secondary.custody_status,
        solana_wallet_connected_at: secondary.solana_wallet_connected_at,
      })
      .eq("id", primaryId);
  }

  await supabase.from("pock_ledger").update({ user_id: primaryId }).eq("user_id", secondaryId);
  await supabase.from("stripe_payments").update({ user_id: primaryId }).eq("user_id", secondaryId);

  await supabase
    .from("brok_chat_threads")
    .update({ user_id: primaryId })
    .eq("user_id", secondaryId);

  const { data: secFacts } = await supabase
    .from("brok_user_facts")
    .select("facts")
    .eq("user_id", secondaryId)
    .maybeSingle();
  if (secFacts?.facts && typeof secFacts.facts === "object") {
    const { data: priFacts } = await supabase
      .from("brok_user_facts")
      .select("facts")
      .eq("user_id", primaryId)
      .maybeSingle();
    const mergedFacts = mergeUserFacts(
      (priFacts?.facts as BrokUserFacts) ?? {},
      secFacts.facts as BrokUserFacts
    );
    await supabase.from("brok_user_facts").upsert(
      {
        user_id: primaryId,
        facts: mergedFacts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    await supabase.from("brok_user_facts").delete().eq("user_id", secondaryId);
  }

  return {
    merged: true,
    pockTransferred: transfer,
    secondaryUserId: secondaryId,
  };
}