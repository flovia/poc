import transactionFixture from "../../fixtures/phase-a/coingecko-transactions.json";
import attributionFixture from "../../fixtures/phase-b/mock-attribution.json";
import { buildPhaseBProjections } from "./projection-builder";

const projections = buildPhaseBProjections(transactionFixture, attributionFixture);

export const phaseBCustomerListResponse = projections.customerList;
export const phaseBCustomerProfilesByAddress = projections.profilesByAddress;
export const phaseBWalletUsageGraphResponse = projections.walletUsageGraph;
export const joinedPhaseBProjectionRecords = projections.joinedRecords;

export const getPhaseBCustomerProfileByAddress = (address: string) =>
  phaseBCustomerProfilesByAddress[address.toLowerCase()];

export const knownCustomerProfileAddress = phaseBCustomerListResponse.customers[0]?.address ?? "";
