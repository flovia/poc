import { describe, expect, test } from "bun:test";
import type { CustomerListItemDto } from "@/lib/api/types";
import {
  DEFAULT_CUSTOMER_FILTER,
  filterAndSortCustomers,
  type CustomerFilterState,
} from "./filter";

const base: Omit<CustomerListItemDto, "address"> = {
  label: null,
  observationCount: 0,
  spendAtomic: "0",
  providerCount: 0,
  lastSeenAt: 0,
  activityGrowth: 0,
  upsellOpportunity: "low",
  provenance: "onchain_fact",
  provenanceByField: {},
  reasons: [],
};

const make = (
  overrides: Partial<CustomerListItemDto> & { address: string },
): CustomerListItemDto => ({
  ...base,
  ...overrides,
});

const fixture: CustomerListItemDto[] = [
  make({
    address: "0xAAaaaaaaAAAAaaaaAAAAaaaaaaaaAAAA00000001",
    spendAtomic: "100",
    observationCount: 5,
    providerCount: 3,
    activityGrowth: 0.1,
    lastSeenAt: 1_700_000_300,
    upsellOpportunity: "high",
  }),
  make({
    address: "0xBBbbbbbbBBBBbbbbBBBBbbbbbbbbBBBB00000002",
    spendAtomic: "999",
    observationCount: 2,
    providerCount: 7,
    activityGrowth: -0.4,
    lastSeenAt: 1_700_000_100,
    upsellOpportunity: "medium",
  }),
  make({
    address: "0xCCccccccCCCCccccCCCCccccccccCCCC00000003",
    spendAtomic: "500",
    observationCount: 12,
    providerCount: 1,
    activityGrowth: 0.9,
    lastSeenAt: 1_700_000_200,
    upsellOpportunity: "low",
  }),
];

describe("filterAndSortCustomers", () => {
  test("returns all customers sorted by spend desc with default filter", () => {
    const result = filterAndSortCustomers(fixture, DEFAULT_CUSTOMER_FILTER);
    expect(result.map((c) => c.address)).toEqual([
      "0xBBbbbbbbBBBBbbbbBBBBbbbbbbbbBBBB00000002",
      "0xCCccccccCCCCccccCCCCccccccccCCCC00000003",
      "0xAAaaaaaaAAAAaaaaAAAAaaaaaaaaAAAA00000001",
    ]);
  });

  test("filters by case-insensitive substring on address", () => {
    const state: CustomerFilterState = { ...DEFAULT_CUSTOMER_FILTER, query: "00000002" };
    const result = filterAndSortCustomers(fixture, state);
    expect(result.map((c) => c.address)).toEqual(["0xBBbbbbbbBBBBbbbbBBBBbbbbbbbbBBBB00000002"]);
  });

  test("query is case-insensitive", () => {
    const state: CustomerFilterState = { ...DEFAULT_CUSTOMER_FILTER, query: "0xcc" };
    const result = filterAndSortCustomers(fixture, state);
    expect(result.map((c) => c.address)).toEqual(["0xCCccccccCCCCccccCCCCccccccccCCCC00000003"]);
  });

  test("trims whitespace in query", () => {
    const state: CustomerFilterState = { ...DEFAULT_CUSTOMER_FILTER, query: "   00000001  " };
    const result = filterAndSortCustomers(fixture, state);
    expect(result.map((c) => c.address)).toEqual(["0xAAaaaaaaAAAAaaaaAAAAaaaaaaaaAAAA00000001"]);
  });

  test("sorts by observations desc", () => {
    const result = filterAndSortCustomers(fixture, {
      ...DEFAULT_CUSTOMER_FILTER,
      sort: "observations",
    });
    expect(result.map((c) => c.observationCount)).toEqual([12, 5, 2]);
  });

  test("sorts by providers desc", () => {
    const result = filterAndSortCustomers(fixture, {
      ...DEFAULT_CUSTOMER_FILTER,
      sort: "providers",
    });
    expect(result.map((c) => c.providerCount)).toEqual([7, 3, 1]);
  });

  test("sorts by last seen desc", () => {
    const result = filterAndSortCustomers(fixture, {
      ...DEFAULT_CUSTOMER_FILTER,
      sort: "lastSeen",
    });
    expect(result.map((c) => c.lastSeenAt)).toEqual([1_700_000_300, 1_700_000_200, 1_700_000_100]);
  });

  test("sorts by spend desc using BigInt comparison", () => {
    const big: CustomerListItemDto[] = [
      make({ address: "0x1", spendAtomic: "9" }),
      make({
        address: "0x2",
        spendAtomic: "100000000000000000000000000000000000",
      }),
      make({ address: "0x3", spendAtomic: "10" }),
    ];
    const result = filterAndSortCustomers(big, DEFAULT_CUSTOMER_FILTER);
    expect(result.map((c) => c.address)).toEqual(["0x2", "0x3", "0x1"]);
  });

  test("does not mutate input array", () => {
    const snapshot = fixture.map((c) => c.address);
    filterAndSortCustomers(fixture, { ...DEFAULT_CUSTOMER_FILTER, sort: "observations" });
    expect(fixture.map((c) => c.address)).toEqual(snapshot);
  });

  test("combines query and sort", () => {
    const state: CustomerFilterState = {
      query: "00000003",
      sort: "spend",
      chain: "all",
    };
    const result = filterAndSortCustomers(fixture, state);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("0xCCccccccCCCCccccCCCCccccccccCCCC00000003");
  });

  test("chain=all keeps every wallet under the current single-chain dataset", () => {
    const result = filterAndSortCustomers(fixture, { ...DEFAULT_CUSTOMER_FILTER, chain: "all" });
    expect(result).toHaveLength(fixture.length);
  });

  test("chain=base keeps every wallet because all rows currently resolve to base", () => {
    const result = filterAndSortCustomers(fixture, { ...DEFAULT_CUSTOMER_FILTER, chain: "base" });
    expect(result).toHaveLength(fixture.length);
  });

  test("chain=solana drops every wallet because the dataset has no solana data yet", () => {
    const result = filterAndSortCustomers(fixture, { ...DEFAULT_CUSTOMER_FILTER, chain: "solana" });
    expect(result).toHaveLength(0);
  });
});
