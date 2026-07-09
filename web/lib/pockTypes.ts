import type { CustodyLedgerState, CustodyStatus } from "./custody";
import type { SubscriptionTierId } from "./subscriptionConfig";

export type LedgerKind =
  | "trial_credit"
  | "calc_debit"
  | "subscription_debit"
  | "premium_spend"
  | "transfer_out"
  | "transfer_in"
  | "withdrawal"
  | "gift_sent"
  | "gift_received"
  | "impact_donation"
  | "admin_adjust"
  | "stripe_credit"
  | "included_debit"
  | "subscription_credit"
  | "meter_debit"
  | "reserve_credit"
  | "custody_connect"
  | "custody_release";

export interface PockLedgerEntry {
  id: string;
  amount: number;
  balance_after: number;
  kind: LedgerKind;
  note: string;
  custody_state?: CustodyLedgerState;
  solana_tx_signature?: string | null;
  created_at: string;
}

export interface BrokUser {
  id: string;
  display_name: string | null;
  pock_balance: number;
  trial_credited: boolean;
  subscription_active: boolean;
  subscription_recurring: boolean;
  subscription_tier: SubscriptionTierId | "bio_age" | "pock_og" | null;
  pock_og_wallet: string | null;
  pock_og_verified_at: string | null;
  pock_og_source: "wallet" | "vip_code" | null;
  subscription_started_at: string | null;
  subscription_renews_at: string | null;
  included_pock_remaining: number;
  included_pock_allowance: number;
  calc_count: number;
  custody_status: CustodyStatus;
  solana_wallet_address: string | null;
  solana_wallet_connected_at: string | null;
  on_chain_pock_balance: number;
  created_at: string;
  updated_at: string;
}

export interface DebitResult {
  debited: boolean;
  balance: number;
  subscribed: boolean;
  from_included?: number;
  from_balance?: number;
  included_remaining?: number;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  recurring?: boolean;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: "deeper_analysis",
    name: "Deeper Analysis",
    description: "Extended biomarker sensitivity & pace breakdown",
    cost: 5,
    icon: "🔬",
  },
  {
    id: "family_sharing",
    name: "Family Sharing",
    description: "Link up to 4 family members on one balance",
    cost: 15,
    icon: "👨‍👩‍👧‍👦",
  },
  {
    id: "priority_pdf",
    name: "Priority PDF Reports",
    description: "Branded single-page exports with chart snapshots",
    cost: 3,
    icon: "📄",
  },
  {
    id: "extended_sensitivity",
    name: "Extended Sensitivity Modeling",
    description: "What-if scenarios across 12 biomarkers",
    cost: 4,
    icon: "🎯",
  },
];

export const IMPACT_OPTIONS = [
  { id: "research", name: "Longevity Research Fund", icon: "🧬" },
  { id: "open_data", name: "Open Biomarker Data", icon: "📊" },
  { id: "education", name: "Health Literacy Grants", icon: "📚" },
] as const;