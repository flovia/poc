// Phase 7 C3: 主役以外 4 件の薄い fixture.
// design.md §3.2 (L5): 現行 seed と同じアドレスに紐付けて, 一覧クリック時に redirect が
// 起きないようにする. SdkExtras は agentType / sparkline7d / usedEndpointsTopK だけ持つ.

import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import type { Sdk7dVolumePoint, SdkExtras } from "./types";
import { T0 } from "./shared";

const USDC_DECIMALS = 1_000_000;
const usdToAtomic = (usd: number) => Math.round(usd * USDC_DECIMALS).toString();

// 薄い 7 日 sparkline. 主役のように急成長はせず横ばい〜微増.
function flatSparkline(base: number, daysAhead = 0): Sdk7dVolumePoint[] {
  return [
    "2026-04-22",
    "2026-04-23",
    "2026-04-24",
    "2026-04-25",
    "2026-04-26",
    "2026-04-27",
    "2026-04-28",
  ].map((day, i) => ({
    day,
    observationCount: Math.max(1, base + Math.round(i / 2) + daysAhead),
    amountUsd: Math.max(1, base * 1.2 + i),
  }));
}

type Secondary = {
  address: string;
  agentType: string;
  spendUsd: number;
  observationCount: number;
  providerCount: number;
  activityGrowth: number;
  upsell: "low" | "medium" | "high";
  endpoint: string;
  sparkline: Sdk7dVolumePoint[];
};

export const SECONDARIES: Secondary[] = [
  {
    address: "0xpayer...claude",
    agentType: "Claude Code",
    spendUsd: 980,
    observationCount: 6,
    providerCount: 2,
    activityGrowth: 0.32,
    upsell: "medium",
    endpoint: "/v1/price/snapshot",
    sparkline: flatSparkline(8),
  },
  {
    address: "0xpayer...cursor",
    agentType: "Cursor",
    spendUsd: 320,
    observationCount: 4,
    providerCount: 1,
    activityGrowth: 0.08,
    upsell: "low",
    endpoint: "/v1/price/history",
    sparkline: flatSparkline(5),
  },
  {
    address: "0xpayer...n8nflow",
    agentType: "n8n / workflow",
    spendUsd: 540,
    observationCount: 5,
    providerCount: 2,
    activityGrowth: -0.18,
    upsell: "low",
    endpoint: "/api/messages",
    sparkline: flatSparkline(4, -1),
  },
  {
    address: "0xpayer...curl1",
    agentType: "curl / unknown",
    spendUsd: 60,
    observationCount: 2,
    providerCount: 1,
    activityGrowth: 0,
    upsell: "low",
    endpoint: "/quote-and-swap",
    sparkline: flatSparkline(2),
  },
];

export const SECONDARY_LIST_ITEMS: CustomerListItemDto[] = SECONDARIES.map((s) => ({
  address: s.address,
  label: null,
  observationCount: s.observationCount,
  spendAtomic: usdToAtomic(s.spendUsd),
  providerCount: s.providerCount,
  lastSeenAt: T0 - 3 * 86400,
  activityGrowth: s.activityGrowth,
  upsellOpportunity: s.upsell,
}));

export function getSecondaryProfile(address: string): CustomerProfileDto | null {
  const s = SECONDARIES.find((x) => x.address === address);
  if (!s) return null;
  return {
    customer: {
      address: s.address,
      label: null,
      role: "payer_wallet",
      identityBasis: "wallet_address",
      caveat: "Wallet-address based and do not claim verified human identity",
    },
    metrics: {
      spendAtomic: usdToAtomic(s.spendUsd),
      activityGrowth: s.activityGrowth,
      freeTierProgress: Math.min(0.6, s.spendUsd / 1500),
      entryPointRatio: 0.4,
      upsellOpportunity: s.upsell,
    },
    providers: [
      {
        providerId: "acme-price",
        name: "Acme Price API",
        payToWallet: "0xprovider...price",
        spendAtomic: usdToAtomic(s.spendUsd * 0.6),
        transactionCount: Math.max(1, Math.floor(s.observationCount * 0.6)),
        firstSeenAt: T0 - 6 * 86400,
        lastSeenAt: T0 - 3 * 86400,
      },
    ],
    timeline: [
      {
        date: new Date((T0 - 3 * 86400) * 1000).toISOString(),
        timestamp: T0 - 3 * 86400,
        type: "payment",
        title: "Acme Price API",
        description: `Acme Price API · ${s.endpoint}`,
        amountAtomic: usdToAtomic(s.spendUsd * 0.3),
        providerId: "acme-price",
        txHash: `0xs${address.slice(-4)}`,
      },
      {
        date: new Date((T0 - 4 * 86400) * 1000).toISOString(),
        timestamp: T0 - 4 * 86400,
        type: "provider_usage",
        title: `${s.agentType} cadence`,
        description: "Steady cadence over the last week.",
      },
    ],
    insights: [
      {
        severity: "info",
        title: `${s.agentType} usage`,
        description: "Background payer wallet for the SDK preview demo.",
      },
    ],
  };
}

export function getSecondaryExtras(address: string): SdkExtras | null {
  const s = SECONDARIES.find((x) => x.address === address);
  if (!s) return null;
  return {
    address: s.address,
    agentType: s.agentType,
    totalSpendUsd: s.spendUsd,
    growth7d: s.activityGrowth,
    freeTierProgress: 0,
    monthlyReqGrowth: 0,
    entryPointPctText: null,
    timelineExtras: [],
    upsell: null,
    sparkline7d: s.sparkline,
    usedEndpointsTopK: [s.endpoint],
  };
}
