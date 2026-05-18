import fs from "node:fs";
import {
  normalizePaymentRecipientAddress,
  validateCustomerIntelligenceResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBCustomerUpsellMetricsResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateProviderCatalogResponse,
  validateRouteAnalyticsSankeyResponse,
  validateRouteAnalyticsSummaryResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
} from "contracts";
import type { BffAnalyticsDataSource, GeneratedReadModelFile } from "./analytics-data-source";
import { buildUpsellMetricsByAddress } from "./llm";
import {
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";
import { filterCustomersByPayTo, filterCustomersByServiceId } from "./customer-filters";
import { fixtureAnalyticsDataSource } from "./fixture-source";
import { buildRouteAnalytics } from "./route-analytics-builder";

export const loadGeneratedAnalyticsDataSourceFromPayload = (
  payload: GeneratedReadModelFile,
): BffAnalyticsDataSource => {
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
  const fallbackRouteAnalytics = buildRouteAnalytics(providers);

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
    routeSummary: validateRouteAnalyticsSummaryResponse(
      payload.routeSummary ?? fallbackRouteAnalytics.routeSummary,
    ),
    routeSankey: validateRouteAnalyticsSankeyResponse(
      payload.routeSankey ?? fallbackRouteAnalytics.routeSankey,
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

export const loadGeneratedAnalyticsDataSource = (filePath: string): BffAnalyticsDataSource => {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedReadModelFile;
  return loadGeneratedAnalyticsDataSourceFromPayload(payload);
};
