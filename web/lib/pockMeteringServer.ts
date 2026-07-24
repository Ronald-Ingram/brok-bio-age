import { meterBlockCost, METER_RATES } from "./subscriptionConfig";
import { getServiceSupabase } from "./supabase/server";

export class PockMeterError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 402) {
    super(message);
    this.name = "PockMeterError";
    this.code = code;
    this.status = status;
  }
}

export type MeterDebitResult = {
  meter_cost: number;
  balance: number;
  included_remaining: number;
  from_included?: number;
  from_balance?: number;
};

export async function debitMeteredTurnForUser(
  userId: string,
  opts: { voiceBlocks?: number; avatarBlocks?: number; grok?: boolean }
): Promise<MeterDebitResult> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("debit_metered_turn_for_user", {
    p_user_id: userId,
    p_voice_blocks: opts.voiceBlocks ?? 0,
    p_avatar_blocks: opts.avatarBlocks ?? 0,
    p_grok: opts.grok ?? false,
  });

  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new PockMeterError(
        "insufficient_pock",
        `Not enough $POCK — need at least ${meterBlockCost(opts)} $POCK. Top up in Genius Wallet or subscribe.`,
        402
      );
    }
    if (error.message?.includes("user not found")) {
      throw new PockMeterError(
        "user_not_found",
        "Open Genius Wallet once to create your account, then retry.",
        402
      );
    }
    throw new PockMeterError("meter_debit_failed", error.message, 500);
  }

  const row = data as Record<string, unknown>;
  return {
    meter_cost: Number(row.meter_cost ?? meterBlockCost(opts)),
    balance: Number(row.balance ?? 0),
    included_remaining: Number(row.included_remaining ?? 0),
    from_included: row.from_included != null ? Number(row.from_included) : undefined,
    from_balance: row.from_balance != null ? Number(row.from_balance) : undefined,
  };
}

async function debitPockAmount(
  userId: string,
  amount: number,
  note: string
): Promise<MeterDebitResult> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("debit_pock_for_user", {
    p_user_id: userId,
    p_amount: amount,
    p_kind: "meter_debit",
    p_note: note,
  });

  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new PockMeterError(
        "insufficient_pock",
        `Not enough $POCK — need ${amount} $POCK. Top up in Genius Wallet.`,
        402
      );
    }
    throw new PockMeterError("meter_debit_failed", error.message, 500);
  }

  const row = data as Record<string, unknown>;
  return {
    meter_cost: amount,
    balance: Number(row.balance ?? 0),
    included_remaining: Number(row.included_remaining ?? 0),
    from_included: row.from_included != null ? Number(row.from_included) : undefined,
    from_balance: row.from_balance != null ? Number(row.from_balance) : undefined,
  };
}

/** Text chat — base turn (voice/avatar charged separately on those routes). */
export async function debitChatTurn(userId: string): Promise<MeterDebitResult> {
  return debitPockAmount(userId, METER_RATES.baseTurnPock, "BROK chat turn");
}

export async function debitVoiceBlock(userId: string): Promise<MeterDebitResult> {
  return debitPockAmount(userId, METER_RATES.voiceBlockPock, "Voice block");
}

export async function debitAvatarBlock(userId: string): Promise<MeterDebitResult> {
  return debitPockAmount(userId, METER_RATES.avatarBlockPock, "Avatar block");
}

/** IEM formal report — premium Groq usage. */
export async function debitIemReport(userId: string): Promise<MeterDebitResult> {
  const cost = METER_RATES.baseTurnPock * 4;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("debit_pock_for_user", {
    p_user_id: userId,
    p_amount: cost,
    p_kind: "meter_debit",
    p_note: "IEM report generation",
  });

  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new PockMeterError(
        "insufficient_pock",
        `IEM reports cost ${cost} $POCK. Top up in Genius Wallet.`,
        402
      );
    }
    throw new PockMeterError("meter_debit_failed", error.message, 500);
  }

  const row = data as Record<string, unknown>;
  return {
    meter_cost: cost,
    balance: Number(row.balance ?? 0),
    included_remaining: Number(row.included_remaining ?? 0),
  };
}

/** Internally prepared financial statements + Excel — premium Groq usage. */
export async function debitFinancialsReport(
  userId: string
): Promise<MeterDebitResult> {
  const cost = METER_RATES.baseTurnPock * 4;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("debit_pock_for_user", {
    p_user_id: userId,
    p_amount: cost,
    p_kind: "meter_debit",
    p_note: "Financial statements package",
  });

  if (error) {
    if (error.message?.includes("insufficient_pock")) {
      throw new PockMeterError(
        "insufficient_pock",
        `Financials packages cost ${cost} $POCK. Top up in Genius Wallet.`,
        402
      );
    }
    throw new PockMeterError("meter_debit_failed", error.message, 500);
  }

  const row = data as Record<string, unknown>;
  return {
    meter_cost: cost,
    balance: Number(row.balance ?? 0),
    included_remaining: Number(row.included_remaining ?? 0),
  };
}

export async function assertChatRateLimit(userId: string): Promise<void> {
  const maxPerHour = Number(process.env.BROK_CHAT_MAX_PER_HOUR ?? "90");
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("brok_chat_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) return;
  if ((count ?? 0) >= maxPerHour) {
    throw new PockMeterError(
      "rate_limit",
      `Chat limit reached (${maxPerHour}/hour). Try again shortly.`,
      429
    );
  }
}