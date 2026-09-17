import { describe, expect, test } from "bun:test";
import { buildProviderRanking } from "./provider-ranking";
import type { ProviderCatalogItemDto } from "./api/types";

const provider = (overrides: Partial<ProviderCatalogItemDto>): ProviderCatalogItemDto => ({
  providerId: "provider-a",
  name: "Provider A",
  network: "base",
  asset: "USDC",
  payTo: "0x0000000000000000000000000000000000000001",
  transactionCount: 1,
  uniqueSenderCount: 1,
  totalVolumeAtomic: "1",
  endpointCount: 1,
  resourceCount: 1,
  endpointAttributionStatus: "bundled_payto_unknown_endpoint",
  attributionConfidence: 0.35,
  hasCustomerFacts: true,
  customerFactCount: 1,
  provenance: "derived_insight",
  provenanceByField: {},
  reasons: [],
  ...overrides,
});

describe("provider ranking", () => {
  test("ranks providers by transaction count without mutating input order", () => {
    const providers = [
      provider({ providerId: "provider-a", transactionCount: 2 }),
      provider({ providerId: "provider-b", transactionCount: 5 }),
    ];

    const ranking = buildProviderRanking(providers, "transactions", 10);

    expect(ranking.providers.map((row) => row.providerId)).toEqual(["provider-b", "provider-a"]);
    expect(ranking.providers.map((row) => row.rank)).toEqual([1, 2]);
    expect(providers.map((row) => row.providerId)).toEqual(["provider-a", "provider-b"]);
  });

  test("ranks providers by settled amount and applies the limit", () => {
    const ranking = buildProviderRanking(
      [
        provider({ providerId: "provider-a", totalVolumeAtomic: "100" }),
        provider({ providerId: "provider-b", totalVolumeAtomic: "300" }),
        provider({ providerId: "provider-c", totalVolumeAtomic: "200" }),
      ],
      "settledAmount",
      2,
    );

    expect(ranking.providerCount).toBe(2);
    expect(ranking.totalProviderCount).toBe(3);
    expect(ranking.providers.map((row) => row.providerId)).toEqual(["provider-b", "provider-c"]);
  });
});
