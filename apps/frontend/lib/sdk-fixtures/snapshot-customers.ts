import type { CustomerListItemDto, CustomerProfileDto } from "@/lib/api/types";
import snapshotStats from "@/data/snapshot-customer-stats.json";
import { extractBrandKey } from "@/lib/pay-sh/brand";
import {
  STATIC_PROVIDER_CAPABILITIES,
  STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID,
} from "@/lib/providers/static-capabilities";
import {
  buildDemoStory,
  companionChain,
  demoCallCount,
  demoEndpoints,
  demoSpendUsd,
  personaForRank,
  sparklineFromPattern,
  type DemoProviderPeer,
  type DemoStory,
} from "./demo-shape";
import { PROVIDER_NAME, T0 } from "./shared";
import type { SdkCustomerListExtras, SdkExtras } from "./types";
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

const DEMO_CATALOG: DemoProviderPeer[] = STATIC_PROVIDER_CAPABILITIES.map((capability) => ({
  providerId: capability.serviceId,
  name: capability.name,
  payToWallet: capability.payTo,
}));

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

function listExtrasFor(stat: SnapshotCustomerStat, rank: number, n: number): SdkCustomerListExtras {
  const persona = personaForRank(rank, n);
  const lastSeenAt = T0 - persona.lastSeenOffsetDays * 86400;
  return {
    agentType: AGENT_BY_KIND[persona.kind],
    sparkline7d: sparklineFromPattern(
      persona.sparkPattern,
      lastSeenAt,
      demoSpendUsd(rank, n, persona),
      demoCallCount(rank, n, persona),
    ),
    usedEndpointsTopK: demoEndpoints(stat.serviceId, persona),
  };
}

function extrasFor(
  stat: SnapshotCustomerStat,
  address: string,
  rank: number,
  n: number,
  story: DemoStory,
): SdkExtras {
  const persona = personaForRank(rank, n);
  const spendUsd = demoSpendUsd(rank, n, persona);
  return {
    ...listExtrasFor(stat, rank, n),
    address,
    totalSpendUsd: spendUsd,
    growth7d: persona.activityGrowth,
    freeTierProgress: Math.min(0.96, spendUsd / 900),
    monthlyReqGrowth: persona.activityGrowth,
    entryPointPctText: persona.kind === "power" ? "entry point on 84% of workflows" : null,
    timelineExtras: story.timelineExtras,
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
  };
}

function profileFor(
  address: string,
  rank: number,
  n: number,
  story: DemoStory,
): CustomerProfileDto {
  const persona = personaForRank(rank, n);
  const spendUsd = demoSpendUsd(rank, n, persona);
  const spendAtomic = usdToAtomic(spendUsd);
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
    providers: story.providers,
    timeline: story.timeline,
    insights: story.insights,
  };
}

const customersByServiceId = new Map<string, CustomerListItemDto[]>();
// Keep a small index for stable wallet deep links; stories are built on demand.
type CustomerContext = { stat: SnapshotCustomerStat; rank: number; n: number };
type CustomerDetail = { extras: SdkExtras; profile: CustomerProfileDto };
const contextByAddress = new Map<string, CustomerContext>();
const detailsByAddress = new Map<string, CustomerDetail>();
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

// A shared 24-customer shape retains all personas without cloning 92 wallets per provider.
const TEMPLATE_STATS = (statsByService.get("quicknode/rpc") ?? STATS).slice(0, 24);

function materializeCohort(serviceId: string, rawStats: SnapshotCustomerStat[]): void {
  if (customersByServiceId.has(serviceId)) return;
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
    contextByAddress.set(address, { stat, rank, n });
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
    if (!ids.includes(serviceId)) ids.push(serviceId);
    serviceIdsByBrand.set(brand, ids);
  }
}

function cloneTemplateStats(
  serviceId: string,
  name: string,
  chain: string,
): SnapshotCustomerStat[] {
  return TEMPLATE_STATS.map((stat) => ({
    ...stat,
    serviceId,
    name,
    chain,
  }));
}

export function ensureDemoCohort(serviceId: string, name?: string, chain?: string): void {
  if (!serviceId || customersByServiceId.has(serviceId)) return;
  const capability = STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(serviceId);
  materializeCohort(
    serviceId,
    cloneTemplateStats(
      serviceId,
      name ?? capability?.name ?? serviceId,
      chain ?? capability?.network ?? "base",
    ),
  );
}

for (const [serviceId, rawStats] of statsByService) {
  materializeCohort(serviceId, rawStats);
}

for (const capability of STATIC_PROVIDER_CAPABILITIES) {
  ensureDemoCohort(capability.serviceId, capability.name, capability.network);
}

for (const [providerId, name] of Object.entries(PROVIDER_NAME)) {
  if (providerId === "northwind-price") continue;
  ensureDemoCohort(providerId, name, "base");
}

for (const seedId of ["lumen-vec", "halonet"] as const) {
  ensureDemoCohort(seedId, seedId, "base");
}

export function resolveSnapshotServiceId(filter?: SnapshotCustomerFilter): string | null {
  if (filter?.serviceId) {
    if (customersByServiceId.has(filter.serviceId)) return filter.serviceId;
    const brand = extractBrandKey(filter.serviceId);
    const ids = brand ? serviceIdsByBrand.get(brand) : undefined;
    if (ids?.length === 1) return ids[0] ?? null;
    return filter.serviceId;
  }
  const payTo = filter?.payTo?.toLowerCase();
  if (payTo) {
    const serviceId = serviceIdByPayTo.get(payTo);
    if (serviceId) return serviceId;
  }
  return null;
}

export function getSnapshotCustomers(
  filter?: SnapshotCustomerFilter,
): CustomerListItemDto[] | null {
  const serviceId = resolveSnapshotServiceId(filter);
  if (!serviceId) return null;
  ensureDemoCohort(serviceId);
  return customersByServiceId.get(serviceId) ?? [];
}

export function getSnapshotExtras(address: string): SdkExtras | null {
  return getSnapshotDetail(address)?.extras ?? null;
}

export function getSnapshotListExtras(address: string): SdkCustomerListExtras | null {
  const context = contextByAddress.get(address);
  return context ? listExtrasFor(context.stat, context.rank, context.n) : null;
}

export function getSnapshotCustomerProfile(address: string): CustomerProfileDto | null {
  return getSnapshotDetail(address)?.profile ?? null;
}

function getSnapshotDetail(address: string): CustomerDetail | null {
  const cached = detailsByAddress.get(address);
  if (cached) return cached;
  const context = contextByAddress.get(address);
  if (!context) return null;
  const { stat, rank, n } = context;
  const persona = personaForRank(rank, n);
  const lastSeen = T0 - persona.lastSeenOffsetDays * 86400;
  const story = buildDemoStory({
    persona,
    rank,
    home: {
      providerId: stat.serviceId,
      name: stat.name,
      payToWallet: STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(stat.serviceId)?.payTo ?? "",
    },
    catalog: DEMO_CATALOG,
    lastSeenUnix: lastSeen,
    firstSeenUnix: lastSeen - (18 + rank) * 86400,
    spendUsd: demoSpendUsd(rank, n, persona),
    endpoints: demoEndpoints(stat.serviceId, persona),
  });
  const detail = {
    extras: extrasFor(stat, address, rank, n, story),
    profile: profileFor(address, rank, n, story),
  };
  detailsByAddress.set(address, detail);
  return detail;
}

export function getSnapshotSummaries(): ReadonlyMap<string, SnapshotProviderSummary> {
  return summariesByServiceId;
}
