/**
 * Emergency farm kill (2026-07-22).
 *
 * Reopened for legit signups after min-reserve (100 $POCK) + sink freeze.
 * Master kill is OFF unless explicitly set:
 *   BROK_EMERGENCY_KILL=1
 *
 * Individual overrides (optional):
 *   BROK_KILL_TRIAL_MINT=0|1
 *   BROK_KILL_P2P_TRANSFERS=0|1
 *   BROK_KILL_NEW_DEVICE_AUTH=0|1
 *   BROK_FROZEN_USER_IDS=uuid,uuid
 *
 * Permanent protections (always on, separate from kill):
 *   - MIN_GENIUS_RESERVE_POCK = 100 (send/gift/withdraw)
 *   - HARD_FROZEN_USER_IDS sink freeze
 */

/** Known siphon from trial farm — always frozen at app layer. */
export const HARD_FROZEN_USER_IDS = [
  "1cdaee38-4f20-4688-be70-0cc250c3cf88",
] as const;

function envFlag(name: string, defaultWhenMasterOn: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  if (raw === "1" || raw === "true" || raw === "on") return true;
  return defaultWhenMasterOn;
}

/** Master switch: OFF unless explicitly set to 1/true (reopened 2026-07-22). */
export function isEmergencyKillActive(): boolean {
  const raw = process.env.BROK_EMERGENCY_KILL?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on") return true;
  return false;
}

export function isTrialMintKilled(): boolean {
  return envFlag("BROK_KILL_TRIAL_MINT", isEmergencyKillActive());
}

export function isP2pTransfersKilled(): boolean {
  return envFlag("BROK_KILL_P2P_TRANSFERS", isEmergencyKillActive());
}

export function isNewDeviceAuthKilled(): boolean {
  return envFlag("BROK_KILL_NEW_DEVICE_AUTH", isEmergencyKillActive());
}

export function frozenUserIdSet(): Set<string> {
  const set = new Set<string>(HARD_FROZEN_USER_IDS);
  const extra = process.env.BROK_FROZEN_USER_IDS?.trim();
  if (extra) {
    for (const part of extra.split(/[\s,]+/)) {
      const id = part.trim().toLowerCase();
      if (id.length >= 32) set.add(id);
    }
  }
  return set;
}

export function isUserFrozen(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return frozenUserIdSet().has(userId.trim().toLowerCase());
}

export function killStatusPublic() {
  return {
    emergencyKill: isEmergencyKillActive(),
    trialMintKilled: isTrialMintKilled(),
    p2pTransfersKilled: isP2pTransfersKilled(),
    newDeviceAuthKilled: isNewDeviceAuthKilled(),
    hardFrozenCount: HARD_FROZEN_USER_IDS.length,
  };
}
