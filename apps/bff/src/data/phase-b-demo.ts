import transactionFixture from "../../fixtures/phase-a/coingecko-transactions.json";
import customerIntelligenceFixture from "../../fixtures/phase-b/customer-intelligence/0xac5a07c44a4f971667b3df4b6551fb6991b2142d.json";
import attributionFixture from "../../fixtures/phase-b/mock-attribution.json";
import { validateCustomerIntelligenceFixture } from "contracts";
import { buildPhaseBProjections } from "./projection-builder";

const projections = buildPhaseBProjections(transactionFixture, attributionFixture);
const customerIntelligence = validateCustomerIntelligenceFixture(customerIntelligenceFixture);

export const phaseBCustomerListResponse = projections.customerList;
export const phaseBCustomerProfilesByAddress = projections.profilesByAddress;
export const phaseBWalletUsageGraphResponse = projections.walletUsageGraph;
export const joinedPhaseBProjectionRecords = projections.joinedRecords;

export const phaseBCustomerIntelligenceByAddress = {
  [customerIntelligence.customerAddress]: customerIntelligence,
};

export const getPhaseBCustomerProfileByAddress = (address: string) =>
  phaseBCustomerProfilesByAddress[address.toLowerCase()];

export const getPhaseBCustomerIntelligenceByAddress = (address: string) =>
  phaseBCustomerIntelligenceByAddress[address.toLowerCase()];

export const knownCustomerProfileAddress = phaseBCustomerListResponse.customers[0]?.address ?? "";
export const knownCustomerIntelligenceAddress = customerIntelligence.customerAddress;
