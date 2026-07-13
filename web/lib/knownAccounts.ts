import { formatBrokAccountNumber } from "./pockAccount";

export type KnownAccount = {
  /** BROK-XXXXXXXX */
  code: string;
  userId?: string;
  lastBalance?: number;
  label?: string;
  lastSeen: number;
};

const KEY = "brok_known_accounts_v1";
const MAX = 12;

function readAll(): KnownAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a.code === "string" && a.code.startsWith("BROK-"))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function writeAll(list: KnownAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota / private mode */
  }
}

/** Accounts this browser has successfully opened (for switcher dropdown). */
export function listKnownAccounts(): KnownAccount[] {
  return readAll().sort((a, b) => b.lastSeen - a.lastSeen);
}

export function rememberKnownAccount(opts: {
  userId: string;
  balance?: number;
  label?: string;
}): KnownAccount {
  const code = formatBrokAccountNumber(opts.userId);
  const prev = readAll().filter(
    (a) => a.code !== code && a.userId !== opts.userId
  );
  const entry: KnownAccount = {
    code,
    userId: opts.userId,
    lastBalance: opts.balance,
    label: opts.label?.trim() || undefined,
    lastSeen: Date.now(),
  };
  writeAll([entry, ...prev]);
  return entry;
}

export function forgetKnownAccount(code: string): void {
  writeAll(readAll().filter((a) => a.code !== code));
}

export function labelForKnownAccount(a: KnownAccount): string {
  if (a.label) return a.label;
  if (typeof a.lastBalance === "number") {
    return `${a.code} · ${a.lastBalance.toLocaleString()} $POCK`;
  }
  return a.code;
}
