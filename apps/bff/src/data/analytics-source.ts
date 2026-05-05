import fs from "node:fs";
import path from "node:path";
import {
  type PhaseBCustomerUpsellMetricsResponse,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type ServiceAnalyticsComparisonResponse,
  type ServiceAnalyticsQuadrantResponse,
  type ServiceAnalyticsSummaryResponse,
  type ProviderCatalogResponse,
  type WalletUsageGraphResponse,
  type CustomerIntelligenceResponse,
  normalizePaymentRecipientAddress,
  validatePhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  validateCustomerIntelligenceResponse,
  validateProviderCatalogResponse,
} from "contracts";
import {
  getPhaseBCustomerIntelligenceByAddress,
  getPhaseBCustomerProfileByAddress,
  getPhaseBCustomerUpsellMetricsByAddress,
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";
import { buildUpsellMetricsByAddress } from "./llm";

export type BffAnalyticsDataSource = {
  customers: PhaseBCustomerListResponse;
  walletUsageGraph: WalletUsageGraphResponse;
  providers: ProviderCatalogResponse;
  serviceSummary: ServiceAnalyticsSummaryResponse;
  serviceComparison: ServiceAnalyticsComparisonResponse;
  serviceQuadrants: ServiceAnalyticsQuadrantResponse;
  getCustomers(payTo?: string): PhaseBCustomerListResponse;
  getCustomersByServiceId(serviceId: string): PhaseBCustomerListResponse;
  getCustomerProfile(address: string): PhaseBCustomerProfileResponse | undefined;
  getCustomerIntelligence(address: string): CustomerIntelligenceResponse | undefined;
  getCustomerUpsellMetrics(address: string): PhaseBCustomerUpsellMetricsResponse | undefined;
};

type GeneratedReadModelFile = Partial<{
  customers: unknown;
  walletUsageGraph: unknown;
  serviceSummary: unknown;
  serviceComparison: unknown;
  serviceQuadrants: unknown;
  providers: unknown;
  profilesByAddress: Record<string, unknown>;
  intelligenceByAddress: Record<string, unknown>;
  upsellMetricsByAddress: Record<string, unknown>;
}>;

const DEFAULT_GENERATED_ANALYTICS_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "fixtures",
  "generated",
  "analytics.json",
);

const fixtureProviderCatalog = validateProviderCatalogResponse({
  generatedAt: phaseBCustomerListResponse.generatedAt,
  generatedFrom: "phase-b-demo-fixture-provider-catalog",
  providers: phaseBWalletUsageGraphResponse.graph.providerWallets.map((provider) => ({
    providerId: `${provider.providerId}--${provider.payToWallet}`,
    name: provider.providerName ?? provider.name,
    serviceId: provider.providerId,
    serviceName: provider.providerName ?? provider.name,
    network: "base",
    asset: "USDC",
    payTo: provider.payToWallet,
    transactionCount: provider.payerWallets.reduce(
      (sum, wallet) =>
        sum +
        wallet.observations.reduce(
          (inner, observation) => inner + observation.sharedTransactionCount,
          0,
        ),
      0,
    ),
    uniqueSenderCount: provider.payerWallets.length,
    totalVolumeAtomic: provider.payerWallets
      .reduce(
        (sum, wallet) =>
          sum +
          wallet.observations.reduce(
            (inner, observation) => inner + BigInt(observation.sharedSpendAtomic),
            0n,
          ),
        0n,
      )
      .toString(),
    endpointCount: 1,
    resourceCount: 1,
    mappingPattern: "one_payto_many_endpoints",
    endpointAttributionStatus: "bundled_payto_unknown_endpoint",
    attributionConfidence: 0.35,
    hasCustomerFacts: provider.payerWallets.length > 0,
    customerFactCount: provider.payerWallets.length,
    provenance: "derived_insight",
    provenanceByField: { payTo: "onchain_fact", name: "derived_insight" },
    reasons: [{ provenance: "derived_insight", label: "fixture provider catalog" }],
  })),
  providerCount: phaseBWalletUsageGraphResponse.graph.providerWallets.length,
  provenance: "derived_insight",
  provenanceByField: { providers: "derived_insight" },
  reasons: [{ provenance: "derived_insight", label: "fixture provider catalog" }],
});

export const fixtureAnalyticsDataSource: BffAnalyticsDataSource = {
  customers: phaseBCustomerListResponse,
  walletUsageGraph: phaseBWalletUsageGraphResponse,
  providers: fixtureProviderCatalog,
  serviceSummary: serviceAnalyticsSummaryResponse,
  serviceComparison: serviceAnalyticsComparisonResponse,
  serviceQuadrants: serviceAnalyticsQuadrantResponse,
  getCustomers: (payTo?: string) =>
    filterCustomersByPayTo(
      phaseBCustomerListResponse,
      payToMapFromWalletUsageGraph(phaseBWalletUsageGraphResponse),
      payTo,
    ),
  getCustomersByServiceId: (serviceId: string) =>
    filterCustomersByServiceId(
      phaseBCustomerListResponse,
      fixtureProviderCatalog,
      phaseBWalletUsageGraphResponse,
      serviceId,
    ),
  getCustomerProfile: getPhaseBCustomerProfileByAddress,
  getCustomerIntelligence: getPhaseBCustomerIntelligenceByAddress,
  getCustomerUpsellMetrics: getPhaseBCustomerUpsellMetricsByAddress,
};

export const loadGeneratedAnalyticsDataSource = (filePath: string): BffAnalyticsDataSource => {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedReadModelFile;
  const customers = validatePhaseBCustomerListResponse(
    payload.customers ?? phaseBCustomerListResponse,
  );
  const profilesByAddress = Object.fromEntries(
    Object.entries(payload.profilesByAddress ?? {}).map(([address, profile]) => [
      normalizePaymentRecipientAddress(address),
      validatePhaseBCustomerProfileResponse(profile),
    ]),
  );
  const intelligenceByAddress = Object.fromEntries(
    Object.entries(payload.intelligenceByAddress ?? {}).map(([address, intelligence]) => [
      normalizePaymentRecipientAddress(address),
      validateCustomerIntelligenceResponse(intelligence),
    ]),
  );
  const profilesByPayTo = new Map<string, Set<string>>();
  for (const [address, profile] of Object.entries(profilesByAddress)) {
    for (const provider of profile.profile.providers) {
      const key = normalizePaymentRecipientAddress(provider.payToWallet);
      const addresses = profilesByPayTo.get(key) ?? new Set<string>();
      addresses.add(normalizePaymentRecipientAddress(address));
      profilesByPayTo.set(key, addresses);
    }
  }
  const generatedUpsellMetricsByAddress = Object.keys(payload.upsellMetricsByAddress ?? {}).length
    ? Object.fromEntries(
        Object.entries(payload.upsellMetricsByAddress ?? {}).map(([address, value]) => [
          normalizePaymentRecipientAddress(address),
          validatePhaseBCustomerUpsellMetricsResponse(value),
        ]),
      )
    : buildUpsellMetricsByAddress({
        customers,
        profilesByAddress,
        intelligenceByAddress,
      });

  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse(
    payload.walletUsageGraph ?? phaseBWalletUsageGraphResponse,
  );
  const providers = validateProviderCatalogResponse(
    payload.providers ?? fixtureAnalyticsDataSource.providers,
  );

  return {
    customers,
    walletUsageGraph,
    providers,
    serviceSummary: validateServiceAnalyticsSummaryResponse(
      payload.serviceSummary ?? serviceAnalyticsSummaryResponse,
    ),
    serviceComparison: validateServiceAnalyticsComparisonResponse(
      payload.serviceComparison ?? serviceAnalyticsComparisonResponse,
    ),
    serviceQuadrants: validateServiceAnalyticsQuadrantResponse(
      payload.serviceQuadrants ?? serviceAnalyticsQuadrantResponse,
    ),
    getCustomers: (payTo?: string) => filterCustomersByPayTo(customers, profilesByPayTo, payTo),
    getCustomersByServiceId: (serviceId: string) =>
      filterCustomersByServiceId(customers, providers, walletUsageGraph, serviceId),
    getCustomerProfile: (address: string) =>
      profilesByAddress[normalizePaymentRecipientAddress(address)],
    getCustomerIntelligence: (address: string) =>
      intelligenceByAddress[normalizePaymentRecipientAddress(address)],
    getCustomerUpsellMetrics: (address: string) =>
      generatedUpsellMetricsByAddress[normalizePaymentRecipientAddress(address)],
  };
};

const filterCustomersByPayTo = (
  customers: PhaseBCustomerListResponse,
  profilesByPayTo: Map<string, Set<string>> | undefined,
  payTo?: string,
): PhaseBCustomerListResponse => {
  if (!payTo) return customers;
  const normalized = normalizePaymentRecipientAddress(payTo);
  const allowed = profilesByPayTo?.get(normalized);
  const filtered = allowed
    ? customers.customers.filter((customer) =>
        allowed.has(normalizePaymentRecipientAddress(customer.address)),
      )
    : customers.customers.filter(() => false);
  return validatePhaseBCustomerListResponse({
    ...customers,
    customers: filtered,
    customerCount: filtered.length,
    scope: { ...(customers.scope ?? {}), payTo: normalized },
  });
};

const payToMapFromWalletUsageGraph = (walletUsageGraph: WalletUsageGraphResponse) => {
  const map = new Map<string, Set<string>>();
  for (const provider of walletUsageGraph.graph.providerWallets) {
    map.set(
      normalizePaymentRecipientAddress(provider.payToWallet),
      new Set(
        provider.payerWallets.map((wallet) => normalizePaymentRecipientAddress(wallet.address)),
      ),
    );
  }
  return map;
};

type ProviderRowSummary = {
  providerId: string;
  payTo: string;
  network: string;
  asset: string;
};

const filterCustomersByServiceId = (
  baseCustomers: PhaseBCustomerListResponse,
  providers: ProviderCatalogResponse,
  walletUsageGraph: WalletUsageGraphResponse,
  serviceId: string,
): PhaseBCustomerListResponse => {
  const target = serviceId.trim();
  if (!target) {
    return validatePhaseBCustomerListResponse({
      ...baseCustomers,
      customers: [],
      customerCount: 0,
      scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
    });
  }

  const matchingRows: ProviderRowSummary[] = [];
  for (const row of providers.providers) {
    if (
      row.serviceId === target ||
      row.providerId === target ||
      (row.title && row.title === target) ||
      row.name === target
    ) {
      matchingRows.push({
        providerId: row.providerId,
        payTo: normalizePaymentRecipientAddress(row.payTo),
        network: row.network,
        asset: row.asset,
      });
    }
  }
  if (matchingRows.length === 0) {
    return validatePhaseBCustomerListResponse({
      ...baseCustomers,
      customers: [],
      customerCount: 0,
      scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
    });
  }

  // catalog row の providerId は build-fixture で生成された
  // `<slug-url>--<chain>--<asset>--<payTo>` 形式で、walletUsageGraph 側の
  // providerId と完全一致する。これを直接 lookup key として使う。
  const matchingProviderIds = new Set(matchingRows.map((r) => r.providerId));
  const rowsByProviderId = new Map(matchingRows.map((r) => [r.providerId, r] as const));

  type Aggregate = {
    address: string;
    /** chain ごとにその chain で使われた asset の集合 */
    chainAssetMap: Map<string, Set<string>>;
    /** 一意の providerId 集合 (wallet が実際にヒットした catalog row 数) */
    providerIds: Set<string>;
    spendByAsset: Map<string, bigint>;
    totalSpend: bigint;
    observationCount: number;
    lastSeenAt: string | undefined;
  };

  const aggByAddress = new Map<string, Aggregate>();

  for (const provider of walletUsageGraph.graph.providerWallets) {
    if (!matchingProviderIds.has(provider.providerId)) continue;
    const row = rowsByProviderId.get(provider.providerId);
    if (!row) continue;
    const network = row.network;
    const asset = row.asset;

    for (const payer of provider.payerWallets) {
      const addrKey = normalizePaymentRecipientAddress(payer.address);
      const spendAtomic = BigInt(payer.sharedSpendAtomic);
      const txCount = payer.sharedTransactionCount;
      const lastSeen = payer.lastSeenAt;
      const existing = aggByAddress.get(addrKey);
      if (!existing) {
        aggByAddress.set(addrKey, {
          address: payer.address,
          chainAssetMap: new Map([[network, new Set([asset])]]),
          providerIds: new Set([provider.providerId]),
          spendByAsset: new Map([[asset, spendAtomic]]),
          totalSpend: spendAtomic,
          observationCount: txCount,
          lastSeenAt: lastSeen,
        });
        continue;
      }
      const chainAssets = existing.chainAssetMap.get(network);
      if (chainAssets) {
        chainAssets.add(asset);
      } else {
        existing.chainAssetMap.set(network, new Set([asset]));
      }
      existing.providerIds.add(provider.providerId);
      existing.spendByAsset.set(asset, (existing.spendByAsset.get(asset) ?? 0n) + spendAtomic);
      existing.totalSpend += spendAtomic;
      existing.observationCount += txCount;
      if (lastSeen && (!existing.lastSeenAt || lastSeen > existing.lastSeenAt)) {
        existing.lastSeenAt = lastSeen;
      }
    }
  }

  const aggregated = Array.from(aggByAddress.values()).map((a) => {
    const chainsArr = Array.from(a.chainAssetMap.keys());
    const assetSet = new Set<string>();
    for (const assets of a.chainAssetMap.values()) {
      for (const asset of assets) assetSet.add(asset);
    }
    return {
      address: a.address,
      label: null as string | null,
      observationCount: a.observationCount,
      spendAtomic: a.totalSpend.toString(),
      providerCount: a.providerIds.size,
      lastSeenAt: a.lastSeenAt,
      activityGrowth: 0,
      upsellOpportunity:
        chainsArr.length >= 2
          ? ("high" as const)
          : a.observationCount >= 5
            ? ("medium" as const)
            : ("low" as const),
      chains: chainsArr,
      assets: Array.from(assetSet),
      spendByAsset: Object.fromEntries(
        Array.from(a.spendByAsset.entries()).map(([k, v]) => [k, v.toString()] as const),
      ),
      provenance: "derived_insight" as const,
      provenanceByField: {
        address: "derived_insight",
        spendAtomic: "derived_insight",
        providerCount: "derived_insight",
      },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "service-aggregated customer",
          description: `Aggregated across ${matchingRows.length} catalog row(s) sharing serviceId ${target}.`,
        },
      ],
    };
  });

  return validatePhaseBCustomerListResponse({
    ...baseCustomers,
    generatedFrom: `service-aggregated:${target}`,
    customers: aggregated,
    customerCount: aggregated.length,
    scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
  });
};

export const resolveAnalyticsDataSource = (
  filePath = process.env.BFF_ANALYTICS_READ_MODEL_PATH ?? DEFAULT_GENERATED_ANALYTICS_PATH,
) => {
  if (filePath && fs.existsSync(filePath)) return loadGeneratedAnalyticsDataSource(filePath);
  return fixtureAnalyticsDataSource;
};
