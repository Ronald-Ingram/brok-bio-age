import { METER_RATES } from "./subscriptionConfig";
import { POCK_BALANCE_ALERT_COPY } from "./brokFaqCanon";

/** Minimum $POCK we recommend users keep on hand */
export const POCK_RECOMMENDED_BUFFER = 10;

/** Below this, show a prominent low-balance warning */
export const POCK_LOW_BALANCE_THRESHOLD = 5;

export function estimateMinPockForOneCalc(): number {
  return METER_RATES.calcPock;
}

export function isLowPockBalance(balance: number | null | undefined): boolean {
  return (balance ?? 0) < POCK_LOW_BALANCE_THRESHOLD;
}

export function lowBalanceMessage(balance: number): string {
  return `Low balance: ${balance} $POCK remaining. ${POCK_BALANCE_ALERT_COPY}`;
}

export const POCK_BALANCE_BANNER_HEADLINE = "Keep a $POCK buffer";
export const POCK_BALANCE_BANNER_BODY = POCK_BALANCE_ALERT_COPY;