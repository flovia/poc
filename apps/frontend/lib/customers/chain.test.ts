import { describe, expect, test } from "bun:test";
import type { CustomerListItemDto } from "@/lib/api/types";
import { getCustomerChainAttribution } from "./chain";

const customer = (overrides: Partial<CustomerListItemDto>): CustomerListItemDto => ({
  address: "0xcustomer",
  label: null,
  observationCount: 1,
  spendAtomic: "1",
  providerCount: 1,
  lastSeenAt: 1,
  activityGrowth: 0,
  upsellOpportunity: "low",
  provenance: "onchain_fact",
  provenanceByField: {},
  reasons: [],
  ...overrides,
});

describe("getCustomerChainAttribution", () => {
  test("defaults to base and USDC when chain metadata is absent", () => {
    expect(getCustomerChainAttribution(customer({}))).toMatchObject({
      chain: "base",
      asset: "USDC",
      chains: ["base"],
      assets: ["USDC"],
    });
  });

  test("returns solana first for multi-chain customers", () => {
    expect(
      getCustomerChainAttribution(
        customer({ chains: ["base", "polygon", "solana"], assets: ["USDC"] }),
      ).chains,
    ).toEqual(["solana", "base", "polygon"]);
  });
});
