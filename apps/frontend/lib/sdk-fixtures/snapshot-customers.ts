import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import snapshotStats from "@/data/snapshot-customer-stats.json";
import { extractBrandKey } from "@/lib/pay-sh/brand";
import { STATIC_PROVIDER_CAPABILITIES } from "@/lib/providers/static-capabilities";
import {
  companionChain,
  demoCallCount,
  demoEndpoints,
  demoSpendUsd,
  personaForRank,
  sparklineFromPattern,
} from "./demo-shape";
import { T0 } from "./shared";
import type { SdkExtras } from "./types";
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
const AGENT_BY_KIND = {
  power: "Trading bot",
  explorer: "Research agent",
  loyal: "RPC proxy",
  fading: "Keepalive",
} as const;

const usdToAtomic = (usd: number): string => Math.round(usd * 1_000_000).toString();

function addressFor(serviceId: string, index: number, chain: string): string {
  return syntheticAddress(`snapshot:${serviceId}:payer:${index}`, chainKindFromNetwork(chain));
}

function listItem(
  stat: SnapshotCustomerStat,
  address: string,
  rank: number,
  n: number,
): CustomerListItemDto {
  const persona = personaForRank(rank, n);
  const spendUsd = demoSpendUsd(rank, n, persona);
  const lastSeenAt = T0 - persona.lastSeenOffsetDays * 86400;
  const chains = persona.multiChain
    ? [stat.chain, companionChain(stat.chain)].filter(
        (chain, index, all) => all.indexOf(chain) === index,
      )
    : [stat.chain];
  return {
    address,
    label: null,
    observationCount: demoCallCount(rank, n, persona),
    spendAtomic: usdToAtomic(spendUsd),
    providerCount: persona.providerCount,
    lastSeenAt,
    activityGrowth: Math.round(persona.activityGrowth * 100) / 100,
    upsellOpportunity: persona.upsellOpportunity,
    chains,
    assets: ["USDC"],
    tags: persona.tags,
    provenance: "demo_label",
    provenanceByField: {
      address: "demo_label",
      observationCount: "demo_label",
      spendAtomic: "demo_label",
      providerCount: "demo_label",
      activityGrowth: "demo_label",
      upsellOpportunity: "demo_label",
    },
    reasons: [
      {
        provenance: "demo_label",
        label: "demo customer shape",
        description:
          "Cohort size and chain mix follow the analytics snapshot; spend, co-usage, and recency are shaped for the public demo.",
      },
    ],
  };
}

function extrasFor(
  stat: SnapshotCustomerStat,
  address: string,
  rank: number,
  n: number,
): SdkExtras {
  const persona = personaForRank(rank, n);
  const spendUsd = demoSpendUsd(rank, n, persona);
  const observationCount = demoCallCount(rank, n, persona);
  const lastSeenAt = T0 - persona.lastSeenOffsetDays * 86400;
  return {
    address,
    agentType: AGENT_BY_KIND[persona.kind],
    totalSpendUsd: spendUsd,
    growth7d: persona.activityGrowth,
    freeTierProgress: Math.min(0.96, spendUsd / 900),
    monthlyReqGrowth: persona.activityGrowth,
    entryPointPctText: persona.kind === "power" ? "entry point on 84% of workflows" : null,
    timelineExtras: [],
    upsell:
      persona.upsellOpportunity === "high"
        ? {
            planName: "Scale 50M",
            projectedMrrUsd: Math.round(spendUsd * 0.18),
            whyNow: [
              "Spend concentrated on a few hot endpoints",
              "Already paying 3+ providers for overlapping work",
              "7d volume is still accelerating",
            ],
          }
        : null,
    sparkline7d: sparklineFromPattern(persona.sparkPattern, lastSeenAt, spendUsd, observationCount),
    usedEndpointsTopK: demoEndpoints(stat.serviceId, persona),
  };
}

function profileFor(
  stat: SnapshotCustomerStat,
  address: string,
  rank: number,
  n: number,
): CustomerProfileDto {
  const persona = personaForRank(rank, n);
  const spendUsd = demoSpendUsd(rank, n, persona);
  const spendAtomic = usdToAtomic(spendUsd);
  const observationCount = demoCallCount(rank, n, persona);
  const lastSeen = T0 - persona.lastSeenOffsetDays * 86400;
  const firstSeen = lastSeen - (18 + rank) * 86400;
  const endpoint = demoEndpoints(stat.serviceId, persona)[0] ?? `/${stat.serviceId}`;
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
      spendAtomic,
      activityGrowth: Math.round(persona.activityGrowth * 100) / 100,
      freeTierProgress: Math.min(0.96, spendUsd / 900),
      entryPointRatio: persona.kind === "power" ? 0.84 : 0.41,
      upsellOpportunity: persona.upsellOpportunity,
    },
    providers: [
      {
        providerId: stat.serviceId,
        name: stat.name,
        payToWallet: payTo,
        spendAtomic,
        transactionCount: observationCount,
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
        amountAtomic: spendAtomic,
        providerId: stat.serviceId,
        txHash: syntheticAddress(`snapshot:${stat.serviceId}:tx:${rank}`, "evm"),
      },
    ],
    insights: [
      {
        severity:
          persona.kind === "power" ? "opportunity" : persona.kind === "fading" ? "warning" : "info",
        title:
          persona.kind === "power"
            ? "Multi-home whale"
            : persona.kind === "explorer"
              ? "Co-usage overlap"
              : persona.kind === "fading"
                ? "Going quiet"
                : `${stat.chain} regular`,
        description:
          persona.kind === "power"
            ? "High spend across several providers. Strong upsell and packaging candidate."
            : persona.kind === "explorer"
              ? "Pays this API and at least one peer. Partnership or bundling signal."
              : persona.kind === "fading"
                ? "Used to be active; last seen is slipping. Re-engage before they churn."
                : "Mostly loyal to this provider with a steady call pattern.",
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

for (const [serviceId, rawStats] of statsByService) {
  const stats = [...rawStats].sort((left, right) => {
    const delta = BigInt(right.spendAtomic) - BigInt(left.spendAtomic);
    if (delta === 0n) return 0;
    return delta > 0n ? 1 : -1;
  });
  const n = stats.length;
  const customers: CustomerListItemDto[] = [];
  let observationCount = 0;
  let volume = 0n;
  stats.forEach((stat, rank) => {
    const address = addressFor(serviceId, rank, stat.chain);
    const customer = listItem(stat, address, rank, n);
    customers.push(customer);
    extrasByAddress.set(address, extrasFor(stat, address, rank, n));
    profilesByAddress.set(address, profileFor(stat, address, rank, n));
    observationCount += customer.observationCount;
    volume += BigInt(customer.spendAtomic);
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
