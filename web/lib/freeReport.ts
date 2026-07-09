import type { BrokUser } from "./pockTypes";

const FREE_REPORT_KEY = "brok_free_report_used_v1";

export const FREE_TIER_COPY = {
  freeReports: 1,
  saved: false,
  label: "1 free bio-age report (not saved to history)",
} as const;

export function hasUsedFreeReport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FREE_REPORT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFreeReportUsed(): void {
  try {
    localStorage.setItem(FREE_REPORT_KEY, "1");
  } catch {
    // private browsing
  }
}

/** First calculation for non-subscribers: no $POCK debit, not saved to history. */
export function canUseFreeReport(user: BrokUser | null): boolean {
  if (!user) return false;
  if (user.subscription_active || user.subscription_tier === "pock_og") {
    return false;
  }
  return !hasUsedFreeReport();
}