import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import { extractBrandKey } from "@/lib/pay-sh/brand";
import { STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID } from "@/lib/providers/static-capabilities";
import { QUICKNODE_CUSTOMER_STATS } from "./quicknode-customer-stats";
import type { Sdk7dVolumePoint, SdkExtras } from "./types";
import { chainKindFromNetwork, syntheticAddress } from "./wallets";

export const QUICKNODE_SERVICE_ID = "quicknode/rpc";

const AGENT_TYPES = ["RPC proxy", "Indexer", "Trading bot", "Research agent", "Keepalive"] as const;

const ENDPOINT_BY_CHAIN: Record<string, string> = {
  solana: "/solana-mainnet",
  base: "/base-mainnet",
  "base-sepolia": "/base-mainnet",
  polygon: "/polygon-mainnet",
  "polygon-amoy": "/polygon-amoy",
  "x-layer": "/x-layer",
  other: "/rpc",
};

const toUnix = (iso: string): number => Math.floor(Date.parse(iso) / 1000);

const dayUtc = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(0, 10);

function sparklineFor(stat: (typeof QUICKNODE_CUSTOMER_STATS)[number]): Sdk7dVolumePoint[] {
  const last = toUnix(stat.lastSeenAt);
  const spendUsd = Number(stat.spendAtomic) / 1_000_000;
  const dailyObs = Array.from({ length: 7 }, (_, i) => {
    const weight = i === 6 ? 2 : 1;
    return Math.max(0, Math.round((stat.observationCount * weight) / 8));
  });
  const obsSum = dailyObs.reduce((acc, n) => acc + n, 0) || 1;
  return dailyObs.map((observationCount, i) => ({
    day: dayUtc(last - (6 - i) * 86400),
    observationCount,
    amountUsd: Math.round(((spendUsd * observationCount) / obsSum) * 100) / 100,
  }));
}

function addressFor(index: number, chain: string): string {
  return syntheticAddress(`quicknode:payer:${index}`, chainKindFromNetwork(chain));
}

function listItem(
  index: number,
  stat: (typeof QUICKNODE_CUSTOMER_STATS)[number],
): CustomerListItemDto {
  const address = addressFor(index, stat.chain);
  return {
    address,
    label: null,
    observationCount: stat.observationCount,
    spendAtomic: stat.spendAtomic,
    providerCount: stat.providerCount,
    lastSeenAt: toUnix(stat.lastSeenAt),
    activityGrowth: stat.activityGrowth,
    upsellOpportunity: stat.upsellOpportunity,
    chains: [stat.chain],
    assets: ["USDC"],
    provenance: "demo_label",
    provenanceByField: {
      address: "demo_label",
      observationCount: "onchain_fact",
      spendAtomic: "onchain_fact",
      providerCount: "derived_insight",
      activityGrowth: "derived_insight",
      upsellOpportunity: "derived_insight",
    },
    reasons: [
      {
        provenance: "demo_label",
        label: "quicknode analytics snapshot",
        description:
          "Synthetic payer identity. Spend, call count, recency, and chain follow the QuickNode analytics snapshot.",
      },
    ],
  };
}

function extrasFor(index: number, stat: (typeof QUICKNODE_CUSTOMER_STATS)[number]): SdkExtras {
  const address = addressFor(index, stat.chain);
  const spendUsd = Number(stat.spendAtomic) / 1_000_000;
  return {
    address,
    agentType: AGENT_TYPES[index % AGENT_TYPES.length] ?? "RPC proxy",
    totalSpendUsd: spendUsd,
    growth7d: stat.activityGrowth,
    freeTierProgress: Math.min(0.95, spendUsd / 80),
    monthlyReqGrowth: stat.activityGrowth,
    entryPointPctText: null,
    timelineExtras: [],
    upsell: null,
    sparkline7d: sparklineFor(stat),
    usedEndpointsTopK: [ENDPOINT_BY_CHAIN[stat.chain] ?? "/rpc"],
  };
}

function profileFor(
  index: number,
  stat: (typeof QUICKNODE_CUSTOMER_STATS)[number],
): CustomerProfileDto {
  const address = addressFor(index, stat.chain);
  const firstSeen = toUnix(stat.firstSeenAt);
  const lastSeen = toUnix(stat.lastSeenAt);
  const endpoint = ENDPOINT_BY_CHAIN[stat.chain] ?? "/rpc";
  return {
    customer: {
      address,
      label: null,
      role: "payer_wallet",
      identityBasis: "wallet_address",
      caveat: "Wallet-address based and do not claim verified human identity",
    },
    metrics: {
      spendAtomic: stat.spendAtomic,
      activityGrowth: stat.activityGrowth,
      freeTierProgress: Math.min(0.95, Number(stat.spendAtomic) / 80_000_000),
      entryPointRatio: 0.6,
      upsellOpportunity: stat.upsellOpportunity,
    },
    providers: [
      {
        providerId: "quicknode",
        name: "QuickNode",
        payToWallet:
          STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(QUICKNODE_SERVICE_ID)?.payTo ?? "",
        spendAtomic: stat.spendAtomic,
        transactionCount: stat.observationCount,
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen,
      },
    ],
    timeline: [
      {
        date: new Date(lastSeen * 1000).toISOString(),
        timestamp: lastSeen,
        type: "payment",
        title: "QuickNode",
        description: endpoint,
        amountAtomic: stat.spendAtomic,
        providerId: "quicknode",
        txHash: syntheticAddress(`quicknode:tx:${index}`, "evm"),
      },
    ],
    insights: [
      {
        severity: "info",
        title: `${stat.chain} RPC demand`,
        description: "Payer activity reconstructed from the QuickNode analytics snapshot.",
      },
    ],
  };
}

const CUSTOMERS = QUICKNODE_CUSTOMER_STATS.map((stat, index) => listItem(index, stat));
const EXTRAS = new Map(
  QUICKNODE_CUSTOMER_STATS.map((stat, index) => [
    addressFor(index, stat.chain),
    extrasFor(index, stat),
  ]),
);
const PROFILES = new Map(
  QUICKNODE_CUSTOMER_STATS.map((stat, index) => [
    addressFor(index, stat.chain),
    profileFor(index, stat),
  ]),
);

export function isQuicknodeCustomerFilter(filter?: {
  serviceId?: string;
  payTo?: string;
}): boolean {
  if (filter?.serviceId) {
    if (filter.serviceId === QUICKNODE_SERVICE_ID) return true;
    if (extractBrandKey(filter.serviceId) === "quicknode") return true;
  }
  const payTo = filter?.payTo?.toLowerCase();
  if (!payTo) return false;
  const catalogPayTo = STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(QUICKNODE_SERVICE_ID)?.payTo;
  return Boolean(catalogPayTo && catalogPayTo.toLowerCase() === payTo);
}

export function getQuicknodeCustomers(): CustomerListItemDto[] {
  return CUSTOMERS;
}

export function getQuicknodeExtras(address: string): SdkExtras | null {
  return EXTRAS.get(address) ?? null;
}

export function getQuicknodeExtrasMap(): Map<string, SdkExtras> {
  return EXTRAS;
}

export function getQuicknodeCustomerProfile(address: string): CustomerProfileDto | null {
  return PROFILES.get(address) ?? null;
}

export const QUICKNODE_FIXTURE_SUMMARY = {
  customerCount: CUSTOMERS.length,
  observationCount: CUSTOMERS.reduce((acc, customer) => acc + customer.observationCount, 0),
  totalVolumeAtomic: CUSTOMERS.reduce(
    (acc, customer) => acc + BigInt(customer.spendAtomic),
    0n,
  ).toString(),
} as const;
