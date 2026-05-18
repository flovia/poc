import { validateProviderCatalogResponse } from "contracts";
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
import type { BffAnalyticsDataSource } from "./analytics-data-source";
import { buildRouteAnalytics } from "./route-analytics-builder";
import {
  filterCustomersByPayTo,
  filterCustomersByServiceId,
  payToMapFromWalletUsageGraph,
} from "./customer-filters";

export const fixtureProviderCatalog = validateProviderCatalogResponse({
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

const fixtureRouteAnalytics = buildRouteAnalytics(fixtureProviderCatalog);

export const fixtureAnalyticsDataSource: BffAnalyticsDataSource = {
  customers: phaseBCustomerListResponse,
  walletUsageGraph: phaseBWalletUsageGraphResponse,
  providers: fixtureProviderCatalog,
  serviceSummary: serviceAnalyticsSummaryResponse,
  serviceComparison: serviceAnalyticsComparisonResponse,
  serviceQuadrants: serviceAnalyticsQuadrantResponse,
  routeSummary: fixtureRouteAnalytics.routeSummary,
  routeSankey: fixtureRouteAnalytics.routeSankey,
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
