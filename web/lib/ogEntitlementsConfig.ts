/** POCK OG grandfather — internal; not marketed publicly */

export const POCK_OG_MIN_HELD = 5550;

/** Monthly basic calc pool (text-only Bio-Age) */
export const POCK_OG_MONTHLY_CALCS = 10;

/** Trend history cap for OG (paid subs = unlimited) */
export const MAX_OG_HISTORY = 5;

/**
 * Wallet claims allowed through end of Jul 24, 2026 (America/Los_Angeles).
 * Launch-day buys on Jul 4, 2026 before noon PT also qualify.
 */
export const POCK_OG_WALLET_DEADLINE_ISO = "2026-07-25T06:59:59.999Z"; // Jul 24 23:59:59 PT ≈ Jul 25 06:59 UTC

export const POCK_OG_LAUNCH_DAY_START_ISO = "2026-07-04T07:00:00.000Z"; // Jul 4 00:00 PT
export const POCK_OG_LAUNCH_DAY_NOON_ISO = "2026-07-04T19:00:00.000Z"; // Jul 4 12:00 PT

export function isWalletOgClaimWindowOpen(now = new Date()): boolean {
  return now.getTime() <= new Date(POCK_OG_WALLET_DEADLINE_ISO).getTime();
}

export function isLaunchDayMorningPurchase(now = new Date()): boolean {
  const t = now.getTime();
  return (
    t >= new Date(POCK_OG_LAUNCH_DAY_START_ISO).getTime() &&
    t < new Date(POCK_OG_LAUNCH_DAY_NOON_ISO).getTime()
  );
}