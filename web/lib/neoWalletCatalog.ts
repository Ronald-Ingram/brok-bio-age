import { METER_RATES } from "./subscriptionConfig";

export type ServiceStatus = "active" | "included" | "off" | "coming_soon";

export interface NeoWalletService {
  id: string;
  name: string;
  description: string;
  category: "core" | "subscription" | "metered" | "premium" | "commerce";
  priceLabel: string;
  status: ServiceStatus;
  toggleable: boolean;
}

export const NEO_WALLET_TITLE = "BROK Neo-Wallet";

export const NEO_WALLET_SUBTITLE =
  "Financial dashboard · payments · services · transaction history";

export function buildServiceCatalog(options: {
  subscriptionActive: boolean;
  subscriptionTier: string | null;
  hasBalance: boolean;
  servicePrefs: Record<string, boolean>;
}): NeoWalletService[] {
  const tier = options.subscriptionTier;
  const isPremium = tier === "premium" || tier === "pock_og";
  const isEssential =
    tier === "essential" || options.subscriptionActive || isPremium;

  const pref = (id: string, defaultOn: boolean) =>
    options.servicePrefs[id] ?? defaultOn;

  return [
    {
      id: "bio_age_calc",
      name: "Bio-Age Calculator",
      description: "Levine PhenoAge + BROK-adjusted model · 1 $POCK per run (free tier: 1 report)",
      category: "core",
      priceLabel: "1 $POCK / calc",
      status: pref("bio_age_calc", true) ? "active" : "off",
      toggleable: true,
    },
    {
      id: "cloud_history",
      name: "Cloud History & Trends",
      description: "Saved biomarker history, trend charts, unlimited sync when subscribed",
      category: "core",
      priceLabel: isEssential ? "Included" : "Subscribe",
      status: isEssential
        ? "included"
        : pref("cloud_history", false)
          ? "off"
          : "off",
      toggleable: !isEssential,
    },
    {
      id: "voice_meter",
      name: "Voice Blocks (metered)",
      description: "Billed per speaking block while agent is active",
      category: "metered",
      priceLabel: `${METER_RATES.voiceBlockPock} $POCK / block`,
      status: isEssential && pref("voice_meter", true) ? "active" : "off",
      toggleable: isEssential,
    },
    {
      id: "avatar_meter",
      name: "Avatar Blocks (metered)",
      description: "Visual avatar rendering while speaking",
      category: "metered",
      priceLabel: `${METER_RATES.avatarBlockPock} $POCK / block`,
      status: isEssential && pref("avatar_meter", false) ? "active" : "off",
      toggleable: isEssential,
    },
    {
      id: "neoscore",
      name: "Neoscore Identity",
      description: "Patented human + agent trust verification",
      category: "premium",
      priceLabel: "Pro tier",
      status: isPremium ? "included" : "coming_soon",
      toggleable: false,
    },
    {
      id: "iem",
      name: "Ingram Evaluation Matrix",
      description: "Explainable high-stakes AI decisions at scale",
      category: "premium",
      priceLabel: "Pro tier",
      status: isPremium ? "included" : "coming_soon",
      toggleable: false,
    },
    {
      id: "x402_commerce",
      name: "x402 Agent Commerce",
      description: "Machine-to-machine $POCK / USDC micropayments",
      category: "commerce",
      priceLabel: "Coming soon",
      status: "coming_soon",
      toggleable: false,
    },
  ];
}

export const SERVICE_PREFS_KEY = "brok_neo_wallet_service_prefs";

export function loadServicePrefs(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SERVICE_PREFS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveServicePrefs(prefs: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVICE_PREFS_KEY, JSON.stringify(prefs));
}