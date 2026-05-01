import transactionFixture from "../../fixtures/phase-a/coingecko-transactions.json";
import customerIntelligenceFixture from "../../fixtures/phase-b/customer-intelligence/0xac5a07c44a4f971667b3df4b6551fb6991b2142d.json";
import attributionFixture from "../../fixtures/phase-b/mock-attribution.json";
import { validateCustomerIntelligenceFixture } from "contracts";
import { buildUpsellMetricsByAddress } from "./llm";
import { buildPhaseBProjections, buildServiceAnalyticsProjections } from "./projection-builder";

const projections = buildPhaseBProjections(transactionFixture, attributionFixture);
const customerIntelligence = validateCustomerIntelligenceFixture(customerIntelligenceFixture);
const serviceAnalytics = buildServiceAnalyticsProjections(
  projections.joinedRecords,
  customerIntelligence,
);

export const phaseBCustomerListResponse = projections.customerList;
export const phaseBCustomerProfilesByAddress = projections.profilesByAddress;
export const phaseBWalletUsageGraphResponse = projections.walletUsageGraph;
export const joinedPhaseBProjectionRecords = projections.joinedRecords;
export const serviceAnalyticsSummaryResponse = serviceAnalytics.summary;
export const serviceAnalyticsComparisonResponse = serviceAnalytics.comparison;
export const serviceAnalyticsQuadrantResponse = serviceAnalytics.quadrants;

export const phaseBCustomerIntelligenceByAddress = {
  [customerIntelligence.customerAddress]: customerIntelligence,
};

export const phaseBCustomerUpsellMetricsByAddress = buildUpsellMetricsByAddress({
  customers: phaseBCustomerListResponse,
  profilesByAddress: phaseBCustomerProfilesByAddress,
  intelligenceByAddress: phaseBCustomerIntelligenceByAddress,
});

export const getPhaseBCustomerProfileByAddress = (address: string) =>
  phaseBCustomerProfilesByAddress[address.toLowerCase()];

export const getPhaseBCustomerIntelligenceByAddress = (address: string) =>
  phaseBCustomerIntelligenceByAddress[address.toLowerCase()];

export const getPhaseBCustomerUpsellMetricsByAddress = (address: string) =>
  phaseBCustomerUpsellMetricsByAddress[address.toLowerCase()];

export const knownCustomerProfileAddress = phaseBCustomerListResponse.customers[0]?.address ?? "";
export const knownCustomerIntelligenceAddress = customerIntelligence.customerAddress;
