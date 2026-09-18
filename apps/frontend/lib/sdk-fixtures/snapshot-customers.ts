import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import snapshotStats from "@/data/snapshot-customer-stats.json";
import { extractBrandKey } from "@/lib/pay-sh/brand";
import { STATIC_PROVIDER_CAPABILITIES } from "@/lib/providers/static-capabilities";
import type { Sdk7dVolumePoint, SdkExtras } from "./types";
import { chainKindFromNetwork, syntheticAddress } from "./wallets";

export type SnapshotCustomerStat = {
  serviceId: string;
  name: string;
  spendAtomic: string;
  observationCount: number;
  providerCount: number;
  lastSeenAt: string;
  firstSeenAt: string;
  activityGrowth: number;
  upsellOpportunity: "low" | "medium" | "high";
  chain: string;
};

export type SnapshotCustomerFilter = { payTo?: string; serviceId?: string };

export type SnapshotProviderSummary = {
  serviceId: string;
  name: string;
  customerCount: number;
  observationCount: number;
  totalVolumeAtomic: string;
};

const STATS = snapshotStats as SnapshotCustomerStat[];
const AGENT_TYPES = ["RPC proxy", "Indexer", "Trading bot", "Research agent", "Keepalive"] as const;

const toUnix = (iso: string): number => Math.floor(Date.parse(iso) / 1000);
const dayUtc = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(0, 10);

const endpointFor = (serviceId: string): string => {
  const tail = serviceId.split("/").filter(Boolean).pop() ?? "api";
  return `/${tail}`;
};

function sparklineFor(stat: SnapshotCustomerStat): Sdk7dVolumePoint[] {
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

function addressFor(serviceId: string, index: number, chain: string): string {
  return syntheticAddress(`snapshot:${serviceId}:payer:${index}`, chainKindFromNetwork(chain));
}

function listItem(stat: SnapshotCustomerStat, address: string): CustomerListItemDto {
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
        label: "analytics snapshot",
        description:
          "Synthetic payer identity. Spend, call count, recency, and chain follow the analytics snapshot.",
      },
    ],
  };
}

function extrasFor(stat: SnapshotCustomerStat, address: string, index: number): SdkExtras {
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
    usedEndpointsTopK: [endpointFor(stat.serviceId)],
  };
}

function profileFor(
  stat: SnapshotCustomerStat,
  address: string,
  index: number,
): CustomerProfileDto {
  const firstSeen = toUnix(stat.firstSeenAt);
  const lastSeen = toUnix(stat.lastSeenAt);
  const endpoint = endpointFor(stat.serviceId);
  const payTo =
    STATIC_PROVIDER_CAPABILITIES.find((provider) => provider.serviceId === stat.serviceId)?.payTo ??
    "";
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
        providerId: stat.serviceId,
        name: stat.name,
        payToWallet: payTo,
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
        title: stat.name,
        description: endpoint,
        amountAtomic: stat.spendAtomic,
        providerId: stat.serviceId,
        txHash: syntheticAddress(`snapshot:${stat.serviceId}:tx:${index}`, "evm"),
      },
    ],
    insights: [
      {
        severity: "info",
        title: `${stat.chain} demand`,
        description: `Payer activity reconstructed from the ${stat.name} analytics snapshot.`,
      },
    ],
  };
}

const customersByServiceId = new Map<string, CustomerListItemDto[]>();
const extrasByAddress = new Map<string, SdkExtras>();
const profilesByAddress = new Map<string, CustomerProfileDto>();
const summariesByServiceId = new Map<string, SnapshotProviderSummary>();
const serviceIdsByBrand = new Map<string, string[]>();
const serviceIdByPayTo = new Map<string, string>();

for (const capability of STATIC_PROVIDER_CAPABILITIES) {
  serviceIdByPayTo.set(capability.payTo.toLowerCase(), capability.serviceId);
}

const statsByService = new Map<string, SnapshotCustomerStat[]>();
for (const stat of STATS) {
  const list = statsByService.get(stat.serviceId) ?? [];
  list.push(stat);
  statsByService.set(stat.serviceId, list);
}

for (const [serviceId, stats] of statsByService) {
  const customers: CustomerListItemDto[] = [];
  let observationCount = 0;
  let volume = 0n;
  stats.forEach((stat, index) => {
    const address = addressFor(serviceId, index, stat.chain);
    customers.push(listItem(stat, address));
    extrasByAddress.set(address, extrasFor(stat, address, index));
    profilesByAddress.set(address, profileFor(stat, address, index));
    observationCount += stat.observationCount;
    volume += BigInt(stat.spendAtomic);
  });
  customersByServiceId.set(serviceId, customers);
  summariesByServiceId.set(serviceId, {
    serviceId,
    name: stats[0]?.name ?? serviceId,
    customerCount: customers.length,
    observationCount,
    totalVolumeAtomic: volume.toString(),
  });
  const brand = extractBrandKey(serviceId);
  if (brand) {
    const ids = serviceIdsByBrand.get(brand) ?? [];
    ids.push(serviceId);
    serviceIdsByBrand.set(brand, ids);
  }
}

export function resolveSnapshotServiceId(filter?: SnapshotCustomerFilter): string | null {
  if (filter?.serviceId) {
    if (customersByServiceId.has(filter.serviceId)) return filter.serviceId;
    const brand = extractBrandKey(filter.serviceId);
    const ids = brand ? serviceIdsByBrand.get(brand) : undefined;
    if (ids?.length === 1) return ids[0] ?? null;
  }
  const payTo = filter?.payTo?.toLowerCase();
  if (payTo) {
    const serviceId = serviceIdByPayTo.get(payTo);
    if (serviceId && customersByServiceId.has(serviceId)) return serviceId;
  }
  return null;
}

export function getSnapshotCustomers(
  filter?: SnapshotCustomerFilter,
): CustomerListItemDto[] | null {
  const serviceId = resolveSnapshotServiceId(filter);
  if (!serviceId) return null;
  return customersByServiceId.get(serviceId) ?? [];
}

export function getSnapshotExtras(address: string): SdkExtras | null {
  return extrasByAddress.get(address) ?? null;
}

export function getSnapshotExtrasMap(): Map<string, SdkExtras> {
  return extrasByAddress;
}

export function getSnapshotCustomerProfile(address: string): CustomerProfileDto | null {
  return profilesByAddress.get(address) ?? null;
}

export function getSnapshotSummaries(): ReadonlyMap<string, SnapshotProviderSummary> {
  return summariesByServiceId;
}
