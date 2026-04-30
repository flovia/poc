import fs from "node:fs";
import path from "node:path";
import {
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type ServiceAnalyticsComparisonResponse,
  type ServiceAnalyticsQuadrantResponse,
  type ServiceAnalyticsSummaryResponse,
  type WalletUsageGraphResponse,
  type CustomerIntelligenceResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  validateCustomerIntelligenceResponse,
} from "contracts";
import {
  getPhaseBCustomerIntelligenceByAddress,
  getPhaseBCustomerProfileByAddress,
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";

export type BffAnalyticsDataSource = {
  customers: PhaseBCustomerListResponse;
  walletUsageGraph: WalletUsageGraphResponse;
  serviceSummary: ServiceAnalyticsSummaryResponse;
  serviceComparison: ServiceAnalyticsComparisonResponse;
  serviceQuadrants: ServiceAnalyticsQuadrantResponse;
  getCustomerProfile(address: string): PhaseBCustomerProfileResponse | undefined;
  getCustomerIntelligence(address: string): CustomerIntelligenceResponse | undefined;
};

type GeneratedReadModelFile = Partial<{
  customers: unknown;
  walletUsageGraph: unknown;
  serviceSummary: unknown;
  serviceComparison: unknown;
  serviceQuadrants: unknown;
  profilesByAddress: Record<string, unknown>;
  intelligenceByAddress: Record<string, unknown>;
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
  serviceSummary: serviceAnalyticsSummaryResponse,
  serviceComparison: serviceAnalyticsComparisonResponse,
  serviceQuadrants: serviceAnalyticsQuadrantResponse,
  getCustomerProfile: getPhaseBCustomerProfileByAddress,
  getCustomerIntelligence: getPhaseBCustomerIntelligenceByAddress,
};

export const loadGeneratedAnalyticsDataSource = (filePath: string): BffAnalyticsDataSource => {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedReadModelFile;
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

  return {
    customers: validatePhaseBCustomerListResponse(payload.customers ?? phaseBCustomerListResponse),
    walletUsageGraph: validatePhaseBWalletUsageGraphResponse(
      payload.walletUsageGraph ?? phaseBWalletUsageGraphResponse,
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
    getCustomerProfile: (address: string) =>
      profilesByAddress[address.toLowerCase()] ?? getPhaseBCustomerProfileByAddress(address),
    getCustomerIntelligence: (address: string) =>
      intelligenceByAddress[address.toLowerCase()] ??
      getPhaseBCustomerIntelligenceByAddress(address),
  };
};

export const resolveAnalyticsDataSource = (
  filePath = process.env.BFF_ANALYTICS_READ_MODEL_PATH ?? DEFAULT_GENERATED_ANALYTICS_PATH,
) => {
  if (filePath && fs.existsSync(filePath)) return loadGeneratedAnalyticsDataSource(filePath);
  return fixtureAnalyticsDataSource;
};
