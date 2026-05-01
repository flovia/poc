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

export const fixtureAnalyticsDataSource: BffAnalyticsDataSource = {
  customers: phaseBCustomerListResponse,
  walletUsageGraph: phaseBWalletUsageGraphResponse,
  providers: validateProviderCatalogResponse({
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
  }),
  serviceSummary: serviceAnalyticsSummaryResponse,
  serviceComparison: serviceAnalyticsComparisonResponse,
  serviceQuadrants: serviceAnalyticsQuadrantResponse,
  getCustomers: (payTo?: string) =>
    filterCustomersByPayTo(
      phaseBCustomerListResponse,
      payToMapFromWalletUsageGraph(phaseBWalletUsageGraphResponse),
      payTo,
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
      address.toLowerCase(),
      validatePhaseBCustomerProfileResponse(profile),
    ]),
  );
  const intelligenceByAddress = Object.fromEntries(
    Object.entries(payload.intelligenceByAddress ?? {}).map(([address, intelligence]) => [
      address.toLowerCase(),
      validateCustomerIntelligenceResponse(intelligence),
    ]),
  );
  const profilesByPayTo = new Map<string, Set<string>>();
  for (const [address, profile] of Object.entries(profilesByAddress)) {
    for (const provider of profile.profile.providers) {
      const key = provider.payToWallet.toLowerCase();
      const addresses = profilesByPayTo.get(key) ?? new Set<string>();
      addresses.add(address.toLowerCase());
      profilesByPayTo.set(key, addresses);
    }
  }
  const generatedUpsellMetricsByAddress = Object.keys(payload.upsellMetricsByAddress ?? {}).length
    ? Object.fromEntries(
        Object.entries(payload.upsellMetricsByAddress ?? {}).map(([address, value]) => [
          address.toLowerCase(),
          validatePhaseBCustomerUpsellMetricsResponse(value),
        ]),
      )
    : buildUpsellMetricsByAddress({
        customers,
        profilesByAddress,
        intelligenceByAddress,
      });

  return {
    customers,
    walletUsageGraph: validatePhaseBWalletUsageGraphResponse(
      payload.walletUsageGraph ?? phaseBWalletUsageGraphResponse,
    ),
    providers: validateProviderCatalogResponse(
      payload.providers ?? fixtureAnalyticsDataSource.providers,
    ),
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
    getCustomerProfile: (address: string) => profilesByAddress[address.toLowerCase()],
    getCustomerIntelligence: (address: string) => intelligenceByAddress[address.toLowerCase()],
    getCustomerUpsellMetrics: (address: string) =>
      generatedUpsellMetricsByAddress[address.toLowerCase()],
  };
};

const filterCustomersByPayTo = (
  customers: PhaseBCustomerListResponse,
  profilesByPayTo: Map<string, Set<string>> | undefined,
  payTo?: string,
): PhaseBCustomerListResponse => {
  if (!payTo) return customers;
  const normalized = payTo.toLowerCase();
  const allowed = profilesByPayTo?.get(normalized);
  const filtered = allowed
    ? customers.customers.filter((customer) => allowed.has(customer.address.toLowerCase()))
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
      provider.payToWallet.toLowerCase(),
      new Set(provider.payerWallets.map((wallet) => wallet.address.toLowerCase())),
    );
  }
  return map;
};

export const resolveAnalyticsDataSource = (
  filePath = process.env.BFF_ANALYTICS_READ_MODEL_PATH ?? DEFAULT_GENERATED_ANALYTICS_PATH,
) => {
  if (filePath && fs.existsSync(filePath)) return loadGeneratedAnalyticsDataSource(filePath);
  return fixtureAnalyticsDataSource;
};
