// Phase 7 C2: 主役 wallet (0x7A91...C4E8) の完全データ.
// 数値は docs/vision/09_protagonist_wallet.md の値をそのまま転記.

import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import type { SdkExtras, SdkForceNetwork } from "./types";
import { PROTAGONIST_ADDRESS, T0 } from "./shared";

// USD * 1_000_000 = atomic (USDC 6 decimals 仮定). UI は USD 表示で扱うが,
// CustomerProfileDto.metrics.spendAtomic 互換のため atomic 形式も持つ.
const USDC_DECIMALS = 1_000_000;
const usdToAtomic = (usd: number) => Math.round(usd * USDC_DECIMALS).toString();

// docs/vision/09_protagonist_wallet.md の Activity Timeline 12 行.
type ProtagonistTimelineRow = {
  hour: number;
  minuteOffset: number;
  providerId: string;
  apiPath: string;
  amountUsd: number;
};

const ROWS: ProtagonistTimelineRow[] = [
  // Cycle 1 (09:00 台)
  {
    hour: 0,
    minuteOffset: 0,
    providerId: "northwind-price",
    apiPath: "/v1/price/history?pair=ETH-USD&window=1h",
    amountUsd: 0.018,
  },
  {
    hour: 0,
    minuteOffset: 1,
    providerId: "vectormind",
    apiPath: "/v1/responses",
    amountUsd: 0.031,
  },
  {
    hour: 0,
    minuteOffset: 3,
    providerId: "routezero",
    apiPath: "/quote-and-swap",
    amountUsd: 0.142,
  },
  {
    hour: 0,
    minuteOffset: 4,
    providerId: "signalport",
    apiPath: "/api/messages",
    amountUsd: 0.004,
  },
  // Cycle 2 (10:00 台)
  {
    hour: 1,
    minuteOffset: 0,
    providerId: "northwind-price",
    apiPath: "/v1/price/snapshot?pairs=ETH,ARB,SOL",
    amountUsd: 0.022,
  },
  {
    hour: 1,
    minuteOffset: 1,
    providerId: "vectormind",
    apiPath: "/v1/responses",
    amountUsd: 0.036,
  },
  {
    hour: 1,
    minuteOffset: 2,
    providerId: "routezero",
    apiPath: "/quote-and-swap",
    amountUsd: 0.158,
  },
  {
    hour: 1,
    minuteOffset: 3,
    providerId: "signalport",
    apiPath: "/api/messages",
    amountUsd: 0.004,
  },
  // Cycle 3 (11:00 台)
  {
    hour: 2,
    minuteOffset: 0,
    providerId: "northwind-price",
    apiPath: "/v1/market/ohlcv?pair=SOL-USD&interval=1h",
    amountUsd: 0.028,
  },
  {
    hour: 2,
    minuteOffset: 1,
    providerId: "vectormind",
    apiPath: "/v1/responses",
    amountUsd: 0.042,
  },
  {
    hour: 2,
    minuteOffset: 2,
    providerId: "routezero",
    apiPath: "/quote-and-swap",
    amountUsd: 0.211,
  },
  {
    hour: 2,
    minuteOffset: 3,
    providerId: "signalport",
    apiPath: "/api/messages",
    amountUsd: 0.004,
  },
];

const PROTAGONIST_TX_HASHES = ROWS.map((_, i) => `0xv${String(i + 1).padStart(4, "0")}`);

function rowTimestamp(row: ProtagonistTimelineRow): number {
  return T0 + row.hour * 3600 + row.minuteOffset * 60;
}

function isoFromUnix(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

const PROVIDER_LABEL: Record<string, string> = {
  "northwind-price": "Northwind Price API",
  vectormind: "VectorMind AI",
  routezero: "RouteZero DEX",
  signalport: "SignalPort",
};

export const PROTAGONIST_LIST_ITEM: CustomerListItemDto = {
  address: PROTAGONIST_ADDRESS,
  label: null,
  observationCount: 12,
  spendAtomic: usdToAtomic(3840),
  providerCount: 4,
  lastSeenAt: T0 + 2 * 3600 + 3 * 60,
  activityGrowth: 1.84,
  upsellOpportunity: "high",
  provenance: "future_sdk_field",
  provenanceByField: {
    address: "onchain_fact",
    observationCount: "future_sdk_field",
    spendAtomic: "future_sdk_field",
    providerCount: "future_sdk_field",
    activityGrowth: "future_sdk_field",
    upsellOpportunity: "derived_insight",
  },
  reasons: [
    {
      provenance: "future_sdk_field",
      label: "SDK connected fixture",
      description: "Synthetic data shown when the dashboard is in sdkConnected mode.",
    },
  ],
};

export const PROTAGONIST_PROFILE: CustomerProfileDto = {
  customer: {
    address: PROTAGONIST_ADDRESS,
    label: null,
    role: "payer_wallet",
    identityBasis: "wallet_address",
    caveat: "Wallet-address based and do not claim verified human identity",
  },
  metrics: {
    spendAtomic: usdToAtomic(3840),
    activityGrowth: 1.84,
    freeTierProgress: 0.92,
    entryPointRatio: 0.87,
    upsellOpportunity: "high",
  },
  providers: [
    {
      providerId: "northwind-price",
      name: "Northwind Price API",
      payToWallet: "0xprovider...price",
      spendAtomic: usdToAtomic(0.068),
      transactionCount: 3,
      firstSeenAt: T0,
      lastSeenAt: T0 + 2 * 3600,
    },
    {
      providerId: "vectormind",
      name: "VectorMind AI",
      payToWallet: "0xprovider...vector",
      spendAtomic: usdToAtomic(0.109),
      transactionCount: 3,
      firstSeenAt: T0 + 60,
      lastSeenAt: T0 + 2 * 3600 + 60,
    },
    {
      providerId: "routezero",
      name: "RouteZero DEX",
      payToWallet: "0xprovider...route",
      spendAtomic: usdToAtomic(0.511),
      transactionCount: 3,
      firstSeenAt: T0 + 180,
      lastSeenAt: T0 + 2 * 3600 + 120,
    },
    {
      providerId: "signalport",
      name: "SignalPort",
      payToWallet: "0xprovider...signal",
      spendAtomic: usdToAtomic(0.012),
      transactionCount: 3,
      firstSeenAt: T0 + 240,
      lastSeenAt: T0 + 2 * 3600 + 180,
    },
  ],
  timeline: ROWS.map((row, i) => {
    const ts = rowTimestamp(row);
    const label = PROVIDER_LABEL[row.providerId] ?? row.providerId;
    return {
      date: isoFromUnix(ts),
      timestamp: ts,
      type: "payment" as const,
      title: label,
      description: `${label} · ${row.apiPath}`,
      amountAtomic: usdToAtomic(row.amountUsd),
      providerId: row.providerId,
      txHash: PROTAGONIST_TX_HASHES[i],
    };
  }),
  insights: [
    {
      severity: "opportunity",
      title: "Hourly trading loop detected",
      description: "This wallet uses your API as the first step in an hourly trading loop.",
    },
    {
      severity: "info",
      title: "7d volume accelerated 184%",
      description: "Workflow regularity remained stable while volume grew.",
    },
    {
      severity: "warning",
      title: "Free tier usage at 92%",
      description: "Strong candidate for a trading-grade plan.",
    },
  ],
};

export const PROTAGONIST_EXTRAS: SdkExtras = {
  address: PROTAGONIST_ADDRESS,
  agentType: "Self-hosted DeFi Trading Bot",
  totalSpendUsd: 3840,
  growth7d: 1.84,
  freeTierProgress: 0.92,
  monthlyReqGrowth: 3.1,
  entryPointPctText: "step 1 in 87% of observed loops",
  timelineExtras: ROWS.map((row, i) => ({
    txHash: PROTAGONIST_TX_HASHES[i],
    apiPath: row.apiPath,
    amountUsd: row.amountUsd,
    cycleId: row.hour + 1, // 1, 2, 3
    isSelfProvider: row.providerId === "northwind-price",
  })),
  upsell: {
    planName: "Pro Trading 250M",
    projectedMrrUsd: 890,
    whyNow: [
      "Free-tier usage at 92% will exhaust within 6 days at current pace",
      "7d volume accelerated 184% with stable hourly cadence",
      "Wallet is the entry point in 87% of its observed workflows",
    ],
  },
  sparkline7d: [
    { day: "2026-04-22", observationCount: 12, amountUsd: 85 },
    { day: "2026-04-23", observationCount: 14, amountUsd: 98 },
    { day: "2026-04-24", observationCount: 18, amountUsd: 130 },
    { day: "2026-04-25", observationCount: 22, amountUsd: 165 },
    { day: "2026-04-26", observationCount: 28, amountUsd: 215 },
    { day: "2026-04-27", observationCount: 34, amountUsd: 280 },
    { day: "2026-04-28", observationCount: 36, amountUsd: 312 },
  ],
  usedEndpointsTopK: ["/v1/price/history", "/v1/price/snapshot", "/v1/market/ohlcv"],
};

// Force-directed network: 主役を中心に 6 社を放射状配置. 静的な座標.
// 16:9 SVG viewBox 800x500 を想定.
export const PROTAGONIST_NETWORK: SdkForceNetwork = {
  nodes: [
    { id: "self", label: "0x7A91...C4E8", x: 400, y: 250, role: "center" },
    { id: "vectormind", label: "VectorMind AI", x: 400, y: 60, role: "satellite" },
    { id: "routezero", label: "RouteZero DEX", x: 670, y: 140, role: "satellite" },
    { id: "signalport", label: "SignalPort", x: 700, y: 360, role: "satellite" },
    { id: "vaultlayer", label: "VaultLayer", x: 400, y: 440, role: "satellite" },
    { id: "streamdelta", label: "StreamDelta", x: 130, y: 360, role: "satellite" },
    { id: "ledgerlake", label: "LedgerLake", x: 100, y: 140, role: "satellite" },
  ],
  edges: [
    { from: "self", to: "vectormind", weight: 3 },
    { from: "self", to: "routezero", weight: 3 },
    { from: "self", to: "signalport", weight: 3 },
    { from: "self", to: "vaultlayer", weight: 1 },
    { from: "self", to: "streamdelta", weight: 1 },
    { from: "self", to: "ledgerlake", weight: 1 },
  ],
};

export { PROTAGONIST_TX_HASHES };
