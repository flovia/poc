import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateProviderCatalogResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
} from "contracts";
import { generateDummyPayerWallets, generateEvmAddress, type ChainKind } from "./dummy-wallets";
import { mulberry32, randomInt, seedFromString } from "./prng";
import type { AtlasOffer, AtlasProvider, ParsedAtlas } from "./atlas-parser";

// Provider name fragments that are sourced from the offline analytics SQLite
// store (real on-chain payment observations) rather than the pay-skills atlas.
// build-fixture preserves rows whose name / serviceId / providerId contains any
// of these marks so they survive the atlas regeneration step.
const PRESERVED_BASE_PROVIDER_MARKS = ["coingecko", "nansen"];

const matchesPreservedMark = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const v = value.toLowerCase();
  return PRESERVED_BASE_PROVIDER_MARKS.some((m) => v.includes(m));
};

type AnalyticsJson = {
  providers: { providers: any[]; providerCount: number; [k: string]: any };
  serviceSummary: any;
  serviceComparison: { services: any[]; [k: string]: any };
  serviceQuadrants: { points: any[]; [k: string]: any };
  customers: { customers: any[]; customerCount: number; [k: string]: any };
  walletUsageGraph: {
    graph: { providerWallets: any[]; [k: string]: any };
    [k: string]: any;
  };
  profilesByAddress: Record<string, any>;
  intelligenceByAddress: Record<string, any>;
};

type ChainMeta = {
  network: string;
  chainKind: ChainKind;
  displayChain: string;
};

const chainMetaFor = (offer: AtlasOffer): ChainMeta => {
  const c = offer.chain.toLowerCase();
  if (c.includes("solana")) {
    return { network: "solana", chainKind: "solana", displayChain: offer.chain };
  }
  if (c.includes("base sepolia")) {
    return { network: "base-sepolia", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("base")) {
    return { network: "base", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("polygon amoy")) {
    return { network: "polygon-amoy", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("polygon")) {
    return { network: "polygon", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("tempo")) {
    return { network: "tempo", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("avalanche")) {
    return { network: "avalanche", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.includes("x layer")) {
    return { network: "x-layer", chainKind: "evm", displayChain: offer.chain };
  }
  if (c.startsWith("eip155:")) {
    return { network: c, chainKind: "evm", displayChain: offer.chain };
  }
  return { network: c, chainKind: "evm", displayChain: offer.chain };
};

const slugifyUrl = (url: string): string =>
  url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const slugifySegment = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const offerKey = (provider: AtlasProvider, offer: AtlasOffer, meta: ChainMeta): string =>
  `${slugifyUrl(provider.serviceUrl)}--${slugifySegment(meta.network)}--${slugifySegment(offer.asset)}--${offer.payTo.toLowerCase()}`;

const toAtomicAmount = (usd: number, assetSymbol: string): string => {
  const decimals =
    assetSymbol === "USDC" || assetSymbol === "USDT" || assetSymbol === "CASH" ? 6 : 6;
  const atomic = Math.round(usd * 10 ** decimals);
  return Math.max(0, atomic).toString();
};

const isoTimestamp = (epochMs: number): string => new Date(epochMs).toISOString();

const buildProviderCatalogRow = (
  provider: AtlasProvider,
  offer: AtlasOffer,
  meta: ChainMeta,
  payerCount: number,
  totalSpendAtomic: bigint,
  totalTxCount: number,
) => {
  const providerId = offerKey(provider, offer, meta);
  return {
    providerId,
    name: provider.title || provider.fqn,
    serviceId: provider.fqn,
    serviceName: provider.title || provider.fqn,
    network: meta.network,
    asset: offer.asset,
    payTo: offer.payTo,
    transactionCount: totalTxCount,
    uniqueSenderCount: payerCount,
    totalVolumeAtomic: totalSpendAtomic.toString(),
    endpointCount: provider.endpointCount,
    resourceCount: provider.endpointCount,
    mappingPattern: "one_payto_many_endpoints" as const,
    endpointAttributionStatus: "bundled_payto_unknown_endpoint" as const,
    attributionConfidence: 0.35,
    hasCustomerFacts: payerCount > 0,
    customerFactCount: payerCount,
    title: provider.title || undefined,
    description: provider.description || undefined,
    useCase: provider.useCase || undefined,
    category: provider.category || undefined,
    serviceUrl: provider.serviceUrl,
    protocol: offer.protocol,
    chain: meta.displayChain,
    assetSymbol: offer.asset,
    priceRangeUsd: provider.priceRangeUsd,
    provenance: "derived_insight" as const,
    provenanceByField: {
      payTo: "onchain_fact",
      transactionCount: "derived_insight",
      uniqueSenderCount: "derived_insight",
      description: "derived_insight",
    },
    reasons: [
      {
        provenance: "derived_insight" as const,
        label: "pay-skills atlas",
        description: "Derived from pay-skills registry probe results.",
      },
    ],
  };
};

type GeneratedProviderEntry = {
  catalogRow: ReturnType<typeof buildProviderCatalogRow>;
  walletUsageProviderWallet: any;
  totalTxCount: number;
  totalSpendAtomic: bigint;
  uniquePayerAddresses: string[];
  meta: ChainMeta;
  offer: AtlasOffer;
  provider: AtlasProvider;
};

const buildProviderEntriesForAtlas = (
  atlas: ParsedAtlas,
  topSeed: number,
): GeneratedProviderEntry[] => {
  const entries: GeneratedProviderEntry[] = [];
  for (const provider of atlas.providers) {
    let offerIdx = 0;
    for (const offer of provider.offers) {
      const meta = chainMetaFor(offer);
      const offerSeedKey = `${topSeed}::${provider.fqn}::${offer.chain}::${offer.asset}::${offer.payTo}`;
      const offerSeed = seedFromString(offerSeedKey);
      const offerRng = mulberry32(offerSeed);
      const payerCount = randomInt(offerRng, 2, 15);
      const payerSeedKey = `${offerSeedKey}::payers`;
      const payerSeed = seedFromString(payerSeedKey);
      const payerAddresses = generateDummyPayerWallets({
        chainKind: meta.chainKind,
        count: payerCount,
        seed: payerSeed,
      });

      const probePriceUsd = offer.probePriceUsd > 0 ? offer.probePriceUsd : 0.01;
      let totalSpendAtomic = 0n;
      let totalTxCount = 0;
      const payerWallets = payerAddresses.map((address, i) => {
        const walletRng = mulberry32(seedFromString(`${offerSeedKey}::wallet::${i}`));
        const txCount = randomInt(walletRng, 1, 8);
        const spendAtomicSingle = BigInt(toAtomicAmount(probePriceUsd, offer.asset));
        const sharedSpendAtomic = spendAtomicSingle * BigInt(txCount);
        totalSpendAtomic += sharedSpendAtomic;
        totalTxCount += txCount;

        const windowStartMs = Date.UTC(2026, 0, 1);
        const windowEndMs = Date.UTC(2026, 3, 30);
        const firstSeenMs = windowStartMs + Math.floor(walletRng() * (windowEndMs - windowStartMs));
        const lastSeenMs =
          firstSeenMs +
          Math.floor(walletRng() * Math.min(30 * 24 * 3600 * 1000, windowEndMs - firstSeenMs));
        const observationProviderId = offerKey(provider, offer, meta);
        return {
          address,
          label: null,
          sharedSpendAtomic: sharedSpendAtomic.toString(),
          sharedTransactionCount: txCount,
          overlapProviderCount: 1,
          confidence: 0.7,
          firstSeenAt: isoTimestamp(firstSeenMs),
          lastSeenAt: isoTimestamp(lastSeenMs),
          observations: [
            {
              providerId: observationProviderId,
              providerName: provider.title || provider.fqn,
              serviceName: provider.serviceUrl,
              sharedSpendAtomic: sharedSpendAtomic.toString(),
              sharedTransactionCount: txCount,
              overlapProviderCount: 1,
              confidence: 0.7,
              firstSeenAt: isoTimestamp(firstSeenMs),
              lastSeenAt: isoTimestamp(lastSeenMs),
              provenance: "derived_insight" as const,
              provenanceByField: {
                serviceName: "derived_insight",
                sharedSpendAtomic: "derived_insight",
              },
              reasons: [
                {
                  provenance: "derived_insight" as const,
                  label: "pay-skills atlas synthetic observation",
                },
              ],
            },
          ],
          otherServiceCandidates: [],
          provenance: "derived_insight" as const,
          provenanceByField: {
            address: "derived_insight",
            sharedSpendAtomic: "derived_insight",
          },
          reasons: [
            {
              provenance: "derived_insight" as const,
              label: "pay-skills atlas synthetic payer",
              description: "Synthesised dummy payer wallet derived from pay-skills atlas.",
            },
          ],
        };
      });

      const providerId = offerKey(provider, offer, meta);
      const walletUsageProviderWallet = {
        providerId,
        providerName: provider.title || provider.fqn,
        name: provider.title || provider.fqn,
        payToWallet: offer.payTo,
        payerWallets,
        confidence: 0.7,
        firstSeenAt: payerWallets[0]?.firstSeenAt,
        lastSeenAt: payerWallets[payerWallets.length - 1]?.lastSeenAt,
        provenance: "derived_insight" as const,
        provenanceByField: {
          payToWallet: "onchain_fact",
          payerWallets: "derived_insight",
        },
        reasons: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas",
            description: "Provider/payTo from pay-skills atlas; payer wallets are synthetic.",
          },
        ],
      };

      const catalogRow = buildProviderCatalogRow(
        provider,
        offer,
        meta,
        payerCount,
        totalSpendAtomic,
        totalTxCount,
      );

      entries.push({
        catalogRow,
        walletUsageProviderWallet,
        totalTxCount,
        totalSpendAtomic,
        uniquePayerAddresses: payerAddresses,
        meta,
        offer,
        provider,
      });
      offerIdx += 1;
    }
  }
  return entries;
};

const dedupeProviderEntries = (entries: GeneratedProviderEntry[]): GeneratedProviderEntry[] => {
  const seen = new Set<string>();
  const unique: GeneratedProviderEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.catalogRow.providerId)) continue;
    seen.add(e.catalogRow.providerId);
    unique.push(e);
  }
  return unique;
};

const buildServiceComparisonAndQuadrants = (
  base: AnalyticsJson,
  entries: GeneratedProviderEntry[],
) => {
  const byServiceId = new Map<
    string,
    {
      provider: AtlasProvider;
      userCount: number;
      transactionCount: number;
      endpointDiversity: number;
    }
  >();
  for (const e of entries) {
    const sid = e.provider.fqn;
    const existing = byServiceId.get(sid);
    if (existing) {
      existing.userCount += e.uniquePayerAddresses.length;
      existing.transactionCount += e.totalTxCount;
      existing.endpointDiversity += 1;
    } else {
      byServiceId.set(sid, {
        provider: e.provider,
        userCount: e.uniquePayerAddresses.length,
        transactionCount: e.totalTxCount,
        endpointDiversity: 1,
      });
    }
  }

  const baseGeneratedAt = base.serviceComparison.generatedAt;
  const baseGeneratedFrom = "pay-skills-atlas-projection";

  const preservedServices = base.serviceComparison.services.filter((s: any) =>
    matchesPreservedMark(s.serviceId),
  );
  const preservedPoints = base.serviceQuadrants.points.filter((p: any) =>
    matchesPreservedMark(p.serviceId),
  );

  const services: any[] = [...preservedServices];
  const points: any[] = [...preservedPoints];

  for (const [sid, agg] of byServiceId) {
    const avgTx = agg.userCount > 0 ? agg.transactionCount / agg.userCount : 0;
    services.push({
      serviceId: sid,
      serviceName: agg.provider.title || sid,
      userCount: agg.userCount,
      transactionCount: agg.transactionCount,
      repeatUserRate: 1,
      averageTransactionsPerUser: avgTx,
      endpointDiversity: agg.endpointDiversity,
      userOverlapWithCoinGecko: 0,
      sampleBasis: "pay-skills atlas synthetic projection",
      coverage: "pay-skills atlas snapshot",
      endpointAttributionStatus: "bundled_payto_unknown_endpoint",
      attributionConfidence: 0.35,
      provenance: "derived_insight",
      provenanceByField: {
        userCount: "derived_insight",
        transactionCount: "derived_insight",
        endpointDiversity: "derived_insight",
      },
      reasons: [
        {
          provenance: "derived_insight",
          label: "pay-skills atlas",
        },
      ],
    });
    points.push({
      serviceId: sid,
      serviceName: agg.provider.title || sid,
      x: avgTx,
      y: agg.endpointDiversity,
      userCount: agg.userCount,
      transactionCount: agg.transactionCount,
      sampleBasis: "pay-skills atlas synthetic projection",
      isCoinGecko: false,
      coverage: "pay-skills atlas snapshot",
      endpointAttributionStatus: "bundled_payto_unknown_endpoint",
      attributionConfidence: 0.35,
      provenance: "derived_insight",
      provenanceByField: {
        x: "derived_insight",
        y: "derived_insight",
      },
      reasons: [
        {
          provenance: "derived_insight",
          label: "pay-skills atlas",
        },
      ],
    });
  }

  const serviceComparison = {
    ...base.serviceComparison,
    generatedAt: baseGeneratedAt,
    generatedFrom: baseGeneratedFrom,
    services,
  };

  const serviceQuadrants = {
    ...base.serviceQuadrants,
    generatedAt: base.serviceQuadrants.generatedAt,
    generatedFrom: baseGeneratedFrom,
    points,
  };

  return { serviceComparison, serviceQuadrants };
};

type AtlasCustomerAggregate = {
  address: string;
  chainKind: ChainKind;
  network: string;
  totalSpendAtomic: bigint;
  totalTxCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  providerEntries: GeneratedProviderEntry[];
  payerObservations: Array<{
    entry: GeneratedProviderEntry;
    sharedSpendAtomic: bigint;
    sharedTransactionCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
  }>;
};

const aggregatePayersAcrossEntries = (
  entries: GeneratedProviderEntry[],
): Map<string, AtlasCustomerAggregate> => {
  const byAddress = new Map<string, AtlasCustomerAggregate>();
  for (const entry of entries) {
    const wallet = entry.walletUsageProviderWallet;
    for (const payer of wallet.payerWallets) {
      const observation = payer.observations[0];
      const sharedSpendAtomic = BigInt(payer.sharedSpendAtomic);
      const sharedTxCount = payer.sharedTransactionCount;
      const existing = byAddress.get(payer.address);
      if (!existing) {
        byAddress.set(payer.address, {
          address: payer.address,
          chainKind: entry.meta.chainKind,
          network: entry.meta.network,
          totalSpendAtomic: sharedSpendAtomic,
          totalTxCount: sharedTxCount,
          firstSeenAt: payer.firstSeenAt,
          lastSeenAt: payer.lastSeenAt,
          providerEntries: [entry],
          payerObservations: [
            {
              entry,
              sharedSpendAtomic,
              sharedTransactionCount: sharedTxCount,
              firstSeenAt: payer.firstSeenAt,
              lastSeenAt: payer.lastSeenAt,
            },
          ],
        });
        continue;
      }
      existing.totalSpendAtomic += sharedSpendAtomic;
      existing.totalTxCount += sharedTxCount;
      if (payer.firstSeenAt < existing.firstSeenAt) existing.firstSeenAt = payer.firstSeenAt;
      if (payer.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = payer.lastSeenAt;
      existing.providerEntries.push(entry);
      existing.payerObservations.push({
        entry,
        sharedSpendAtomic,
        sharedTransactionCount: sharedTxCount,
        firstSeenAt: payer.firstSeenAt,
        lastSeenAt: payer.lastSeenAt,
      });
    }
  }
  return byAddress;
};

const buildAtlasCustomerListItem = (agg: AtlasCustomerAggregate) => ({
  address: agg.address,
  label: null,
  observationCount: agg.totalTxCount,
  spendAtomic: agg.totalSpendAtomic.toString(),
  providerCount: agg.providerEntries.length,
  lastSeenAt: agg.lastSeenAt,
  activityGrowth: 0,
  upsellOpportunity: agg.providerEntries.length >= 3 ? "high" : "low",
  provenance: "derived_insight" as const,
  provenanceByField: {
    address: "derived_insight",
    spendAtomic: "derived_insight",
    providerCount: "derived_insight",
  },
  reasons: [
    {
      provenance: "derived_insight" as const,
      label: "pay-skills atlas synthetic customer",
    },
  ],
});

const buildAtlasProfile = (agg: AtlasCustomerAggregate) => {
  const sortedObs = [...agg.payerObservations].sort((a, b) =>
    Number(b.sharedSpendAtomic - a.sharedSpendAtomic),
  );
  const dominantObs = sortedObs[0];
  if (!dominantObs) {
    throw new Error(`agg ${agg.address} has no observations`);
  }
  const dominantEntry = dominantObs.entry;

  return {
    generatedAt: agg.lastSeenAt,
    generatedFrom: "pay-skills-atlas-synthetic-profile",
    scope: {
      providerId: "x402",
      network: agg.network,
      asset: dominantEntry.offer.asset,
      payTo: dominantEntry.offer.payTo,
    },
    provenance: "derived_insight" as const,
    reasons: [
      {
        provenance: "derived_insight" as const,
        label: "pay-skills atlas synthetic profile",
      },
    ],
    profile: {
      identity: {
        address: agg.address,
        label: null,
        network: agg.network,
        asset: dominantEntry.offer.asset,
        role: "payer",
        identityBasis: "pay-skills-atlas-synthetic",
        caveat: null,
        provenance: "derived_insight" as const,
        provenanceByField: { address: "derived_insight" },
        reasons: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas synthetic identity",
          },
        ],
      },
      metrics: {
        spendAtomic: agg.totalSpendAtomic.toString(),
        activityGrowth: 0,
        freeTierProgress: Math.min(0.95, agg.totalTxCount / 100),
        entryPointRatio: 1 / Math.max(1, agg.providerEntries.length),
        upsellOpportunity: agg.providerEntries.length >= 3 ? ("high" as const) : ("low" as const),
        totalSpendAtomic: agg.totalSpendAtomic.toString(),
        txCount: agg.totalTxCount,
        uniqueProviderCount: agg.providerEntries.length,
        averageSpendAtomic:
          agg.totalTxCount > 0 ? (agg.totalSpendAtomic / BigInt(agg.totalTxCount)).toString() : "0",
        firstSeenAt: agg.firstSeenAt,
        lastSeenAt: agg.lastSeenAt,
        provenance: "derived_insight" as const,
        provenanceByField: { spendAtomic: "derived_insight" },
        reasons: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas synthetic metrics",
          },
        ],
      },
      providers: agg.payerObservations.map((obs) => {
        const entry = obs.entry;
        const provider = entry.provider;
        const meta = entry.meta;
        const offer = entry.offer;
        return {
          providerId: entry.catalogRow.providerId,
          name: provider.title || provider.fqn,
          providerName: provider.title || provider.fqn,
          payToWallet: offer.payTo,
          spendAtomic: obs.sharedSpendAtomic.toString(),
          transactionCount: obs.sharedTransactionCount,
          txCount: obs.sharedTransactionCount,
          firstSeenAt: obs.firstSeenAt,
          lastSeenAt: obs.lastSeenAt,
          confidence: 0.7,
          description: provider.description || undefined,
          category: provider.category || undefined,
          serviceUrl: provider.serviceUrl,
          protocol: offer.protocol,
          chain: meta.displayChain,
          assetSymbol: offer.asset,
          provenance: "derived_insight" as const,
          provenanceByField: {
            payToWallet: "onchain_fact",
            spendAtomic: "derived_insight",
          },
          reasons: [
            {
              provenance: "derived_insight" as const,
              label: "pay-skills atlas synthetic provider usage",
            },
          ],
        };
      }),
      timeline: [],
      insights: [],
      provenance: "derived_insight" as const,
      provenanceByField: { providers: "derived_insight" },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "pay-skills atlas synthetic profile",
        },
      ],
    },
  };
};

const buildAtlasIntelligence = (agg: AtlasCustomerAggregate) => {
  const sortedObs = [...agg.payerObservations].sort((a, b) =>
    Number(b.sharedSpendAtomic - a.sharedSpendAtomic),
  );
  const dominantObs = sortedObs[0];
  if (!dominantObs) {
    throw new Error(`agg ${agg.address} has no observations`);
  }
  const dominantEntry = dominantObs.entry;

  return {
    generatedAt: agg.lastSeenAt,
    generatedFrom: "pay-skills-atlas-synthetic-intelligence",
    customerAddress: agg.address,
    scope: {
      address: agg.address,
      network: agg.network,
      asset: dominantEntry.offer.asset,
      timeWindow: { from: agg.firstSeenAt, to: agg.lastSeenAt },
    },
    x402Services: agg.payerObservations.map((obs) => {
      const entry = obs.entry;
      const provider = entry.provider;
      return {
        candidateId: entry.catalogRow.providerId,
        payTo: entry.offer.payTo,
        providerName: provider.title || null,
        serviceName: provider.serviceUrl,
        resource: provider.serviceUrl,
        network: entry.meta.network,
        asset: entry.offer.asset,
        transactionCount: obs.sharedTransactionCount,
        totalAmountAtomic: obs.sharedSpendAtomic.toString(),
        confidence: 0.7,
        provenance: "derived_insight" as const,
        provenanceByField: {
          payTo: "onchain_fact",
          serviceName: "derived_insight",
        },
        evidence: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas synthetic observation",
          },
        ],
        reasons: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas synthetic candidate",
          },
        ],
      };
    }),
    payToActivities: [],
    portfolioSummary: {
      totalValueUsd: null,
      tokenCount: 0,
      sourceCoverage: {
        source: "portfolio" as const,
        status: "unavailable" as const,
        unavailableReason: "pay-skills atlas synthetic — portfolio source not available",
      },
      provenance: "derived_insight" as const,
      provenanceByField: { sourceCoverage: "derived_insight" },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "portfolio source unavailable for synthetic customer",
        },
      ],
    },
    defiPositions: [],
    insights: [
      {
        key: "pay-skills-atlas-synthetic",
        title: "Pay-skills atlas synthetic customer",
        summary: `Synthetic atlas customer using ${agg.providerEntries.length} provider${agg.providerEntries.length === 1 ? "" : "s"}.`,
        classification: "partnership" as const,
        confidence: 0.7,
        provenance: "derived_insight" as const,
        provenanceByField: { summary: "derived_insight" },
        reasons: [
          {
            provenance: "derived_insight" as const,
            label: "pay-skills atlas synthetic insight",
          },
        ],
      },
    ],
    sourceCoverage: [
      {
        source: "bitquery" as const,
        status: "unavailable" as const,
        unavailableReason: "pay-skills atlas synthetic — non-onchain source",
      },
      { source: "cdp_discovery" as const, status: "available" as const },
      {
        source: "portfolio" as const,
        status: "unavailable" as const,
        unavailableReason: "pay-skills atlas synthetic — portfolio source not available",
      },
    ],
    provenance: "derived_insight" as const,
    provenanceByField: { customerAddress: "derived_insight" },
    reasons: [
      {
        provenance: "derived_insight" as const,
        label: "pay-skills atlas synthetic intelligence",
      },
    ],
  };
};

export type BuildArgs = {
  base: AnalyticsJson;
  atlas: ParsedAtlas;
  seed: number;
};

export const buildPaySkillsFixture = (args: BuildArgs): AnalyticsJson => {
  const { base, atlas, seed } = args;

  const coingeckoProviderWallets = base.walletUsageGraph.graph.providerWallets.filter(
    (p: any) =>
      matchesPreservedMark(p.providerName)
      || matchesPreservedMark(p.name)
      || matchesPreservedMark(p.providerId),
  );

  const coingeckoCatalogRows = base.providers.providers.filter((p: any) =>
    matchesPreservedMark(p.providerId)
    || matchesPreservedMark(p.name)
    || matchesPreservedMark(p.serviceId),
  );

  const generated = dedupeProviderEntries(buildProviderEntriesForAtlas(atlas, seed));

  const newProviderWallets = [
    ...coingeckoProviderWallets,
    ...generated.map((e) => e.walletUsageProviderWallet),
  ];

  const newCatalogRows = [...coingeckoCatalogRows, ...generated.map((e) => e.catalogRow)];

  const walletUsageGraph = {
    ...base.walletUsageGraph,
    graph: {
      ...base.walletUsageGraph.graph,
      providerWallets: newProviderWallets,
    },
  };

  const providers = {
    ...base.providers,
    providers: newCatalogRows,
    providerCount: newCatalogRows.length,
  };

  const { serviceComparison, serviceQuadrants } = buildServiceComparisonAndQuadrants(
    base,
    generated,
  );

  const atlasCustomersByAddress = aggregatePayersAcrossEntries(generated);
  const atlasCustomerListItems = Array.from(atlasCustomersByAddress.values()).map(
    buildAtlasCustomerListItem,
  );
  const atlasProfilesByAddress = Object.fromEntries(
    Array.from(atlasCustomersByAddress.entries()).map(([address, agg]) => [
      address,
      buildAtlasProfile(agg),
    ]),
  );
  const atlasIntelligenceByAddress = Object.fromEntries(
    Array.from(atlasCustomersByAddress.entries()).map(([address, agg]) => [
      address,
      buildAtlasIntelligence(agg),
    ]),
  );

  const isAtlasSynthetic = (entry: any): boolean => {
    const generatedFrom = entry?.generatedFrom;
    if (typeof generatedFrom === "string" && generatedFrom.startsWith("pay-skills-atlas")) {
      return true;
    }
    const reasons: any[] = entry?.reasons ?? [];
    if (
      reasons.some((r) => typeof r?.label === "string" && r.label.startsWith("pay-skills atlas"))
    ) {
      return true;
    }
    return false;
  };

  const baseCustomersWithoutAtlas = base.customers.customers.filter(
    (c: any) => !isAtlasSynthetic(c),
  );

  const customers = {
    ...base.customers,
    customers: [...baseCustomersWithoutAtlas, ...atlasCustomerListItems],
    customerCount: baseCustomersWithoutAtlas.length + atlasCustomerListItems.length,
  };

  const baseProfilesWithoutAtlas = Object.fromEntries(
    Object.entries(base.profilesByAddress).filter(([, value]) => !isAtlasSynthetic(value)),
  );
  const profilesByAddress = {
    ...baseProfilesWithoutAtlas,
    ...atlasProfilesByAddress,
  };

  const baseIntelligenceWithoutAtlas = Object.fromEntries(
    Object.entries(base.intelligenceByAddress).filter(([, value]) => !isAtlasSynthetic(value)),
  );
  const intelligenceByAddress = {
    ...baseIntelligenceWithoutAtlas,
    ...atlasIntelligenceByAddress,
  };

  const result: AnalyticsJson = {
    ...base,
    walletUsageGraph,
    providers,
    serviceComparison,
    serviceQuadrants,
    customers,
    profilesByAddress,
    intelligenceByAddress,
  };

  return result;
};

export const validateBuildResult = (result: AnalyticsJson) => {
  validatePhaseBWalletUsageGraphResponse(result.walletUsageGraph);
  validateProviderCatalogResponse(result.providers);
  validateServiceAnalyticsComparisonResponse(result.serviceComparison);
  validateServiceAnalyticsQuadrantResponse(result.serviceQuadrants);
  validatePhaseBCustomerListResponse(result.customers);
  for (const [, profile] of Object.entries(result.profilesByAddress)) {
    validatePhaseBCustomerProfileResponse(profile);
  }
};
