import { describe, expect, mock, test } from "bun:test";
import type { ProviderCatalogItemDto } from "./api/types";

// mock.module は同一プロセスの後続テストファイルにもリークするため,
// 実モジュールのスーパーセットを返して getProviders だけ差し替える.
const realApiClient = await import("./api/client");

const apiClientState = {
  getProviders: async () => Promise.resolve<ProviderCatalogItemDto[]>([]),
};

mock.module("./api/client", () => ({
  ...realApiClient,
  getProviders: () => apiClientState.getProviders(),
}));

const { getProviderLeaderboards } = await import("./data-source");

const provider = (overrides: Partial<ProviderCatalogItemDto>): ProviderCatalogItemDto => ({
  providerId: "provider-a",
  serviceId: "svc-a",
  serviceName: "Service A",
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
  attributionConfidence: 0,
  hasCustomerFacts: false,
  customerFactCount: 0,
  provenance: "derived_insight",
  provenanceByField: {},
  reasons: [],
  ...overrides,
});

describe("getProviderLeaderboards", () => {
  test("returns fallback rankings when BFF is unavailable", async () => {
    apiClientState.getProviders = async () => {
      throw new Error("connect timeout");
    };

    const originalWarn = console.warn;
    console.warn = (() => undefined) as typeof console.warn;

    let rankings: Awaited<ReturnType<typeof getProviderLeaderboards>>;
    try {
      rankings = await getProviderLeaderboards();
    } finally {
      console.warn = originalWarn;
    }

    expect(rankings.transactions).toMatchObject({
      providerCount: 0,
      totalProviderCount: 0,
      providers: [],
    });
    expect(rankings.settledAmount).toMatchObject({
      providerCount: 0,
      totalProviderCount: 0,
      providers: [],
    });
  });

  test("excludes demo_label providers before ranking", async () => {
    apiClientState.getProviders = async () =>
      Promise.resolve([
        provider({
          providerId: "provider-demo",
          provenance: "demo_label",
          transactionCount: 10,
          totalVolumeAtomic: "999",
        }),
        provider({
          providerId: "provider-real",
          provenance: "derived_insight",
          transactionCount: 5,
          totalVolumeAtomic: "500",
        }),
      ]);

    const rankings = await getProviderLeaderboards();

    expect(rankings.transactions.providers).toHaveLength(1);
    expect(rankings.transactions.providers[0]?.providerId).toBe("provider-real");
    expect(rankings.transactions.totalProviderCount).toBe(1);
  });
});
