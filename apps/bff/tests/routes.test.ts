import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createBffHandler } from "../src/http";
import { loadGeneratedAnalyticsDataSource } from "../src/data/analytics-source";
import {
  joinedPhaseBProjectionRecords,
  knownCustomerIntelligenceAddress,
  knownCustomerProfileAddress,
  phaseBCustomerListResponse,
  serviceAnalyticsSummaryResponse,
} from "../src/data/phase-b-demo";
import transactionFixture from "../fixtures/phase-a/coingecko-transactions.json";
import attributionFixture from "../fixtures/phase-b/mock-attribution.json";
import { buildPhaseBProjections, joinTransactionAttribution } from "../src/data/projection-builder";
import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateMockEndpointAttributionFixture,
  validateCustomerIntelligenceResponse,
  validateRealTransactionFixture,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
} from "contracts";

const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

const withTempFile = async (fn: (filePath: string) => Promise<void> | void) => {
  const directory = path.join(process.cwd(), "tmp", `bff-read-model-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });
  try {
    await Promise.resolve(fn(path.join(directory, "analytics.json")));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

describe("BFF routes", () => {
  test("serves minimal read-only endpoints", async () => {
    const handler = createBffHandler();

    for (const path of ["/", "/health"] as const) {
      const response = handler(request(path));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("application/json");
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ service: "flovia-bff", status: "ok" }),
      );
    }
  });

  test("rejects non-GET requests to read-only endpoints", async () => {
    const handler = createBffHandler();
    const response = handler(request("/health", { method: "POST" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(405);
    expect(body.error).toBe("method_not_allowed");
  });

  test("returns JSON not found for unsupported routes", async () => {
    const handler = createBffHandler();
    const response = handler(request("/unknown"));
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.message).toContain("/unknown");
  });

  test("serves customer list with schema validation", async () => {
    const handler = createBffHandler();

    const response = handler(request("/customers"));
    const body = await response.json();
    const parsed = validatePhaseBCustomerListResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.customerCount).toBe(parsed.customers.length);
    expect(parsed.customerCount).toBe(phaseBCustomerListResponse.customers.length);
  });

  test("returns a validated profile for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = handler(
      request(`/customers/${knownCustomerProfileAddress.toUpperCase()}/profile`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validatePhaseBCustomerProfileResponse(body).profile.identity.address).toBe(
      knownCustomerProfileAddress,
    );
  });

  test("returns not found for an unknown customer wallet", async () => {
    const handler = createBffHandler();

    const response = handler(
      request("/customers/0x9999999999999999999999999999999999999999/profile"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("returns validated customer intelligence for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = handler(
      request(`/customers/${knownCustomerIntelligenceAddress.toUpperCase()}/intelligence`),
    );
    const body = await response.json();
    const parsed = validateCustomerIntelligenceResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.customerAddress).toBe(knownCustomerIntelligenceAddress);
    expect(parsed.payToActivities.length).toBeGreaterThan(0);
    expect(parsed.x402Services[0]?.reasons.length).toBeGreaterThan(0);
  });

  test("returns not found for unknown customer intelligence", async () => {
    const handler = createBffHandler();

    const response = handler(
      request("/customers/0x9999999999999999999999999999999999999999/intelligence"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("serves wallet usage graph with schema validation", async () => {
    const handler = createBffHandler();

    const response = handler(request("/wallet-usage-graph"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validatePhaseBWalletUsageGraphResponse(body).graph.providerWallets).toHaveLength(1);
  });

  test("serves coingecko service summary analytics", async () => {
    const handler = createBffHandler();

    const response = handler(request("/analytics/services/coingecko/summary"));
    const parsed = validateServiceAnalyticsSummaryResponse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.serviceId).toBe("coingecko");
    expect(parsed.userCount).toBeGreaterThan(100);
    expect(parsed.transactionCount).toBe(transactionFixture.facts.length);
    expect(parsed.averageTransactionsPerUser).toBeGreaterThan(0);
    expect(parsed.repeatUserRate).toBeGreaterThanOrEqual(0);
    expect(parsed.topEndpoints.length).toBeGreaterThan(0);
    expect(parsed.comparedToX402.transactionShare).toBeGreaterThan(0);
    expect(parsed.comparedToX402.sampleBasis).toContain("prepared x402");
    expect(parsed.comparedToX402.availableServiceCount).toBeGreaterThan(1);
    expect(parsed.provenanceByField).toMatchObject({
      transactionCount: "onchain_fact",
      topEndpoints: "derived_insight",
      comparedToX402: "derived_insight",
    });
    expect(parsed.topEndpoints[0]?.provenanceByField).toMatchObject({
      transactionCount: "derived_insight",
      userCount: "derived_insight",
    });
    expect(parsed.topEndpoints[0]?.endpointAttributionStatus).toBe("demo_attributed_endpoint");
    expect(parsed.topEndpoints[0]?.attributionConfidence).toBeGreaterThan(0);
  });

  test("serves generated read models before fixture fallback", async () =>
    withTempFile(async (filePath) => {
      const generatedSummary = {
        ...serviceAnalyticsSummaryResponse,
        generatedFrom: "generated-read-model-test",
        transactionCount: 42,
        topEndpoints: [
          {
            ...serviceAnalyticsSummaryResponse.topEndpoints[0],
            endpointAttributionStatus: "direct_payto_endpoint",
            attributionConfidence: 0.9,
          },
          {
            ...serviceAnalyticsSummaryResponse.topEndpoints[1],
            endpointAttributionStatus: "bundled_payto_unknown_endpoint",
            attributionConfidence: 0.35,
          },
        ],
      };
      fs.writeFileSync(filePath, JSON.stringify({ serviceSummary: generatedSummary }, null, 2));
      const handler = createBffHandler(loadGeneratedAnalyticsDataSource(filePath));
      const response = handler(request("/analytics/services/coingecko/summary"));
      const parsed = validateServiceAnalyticsSummaryResponse(await response.json());

      expect(parsed.generatedFrom).toBe("generated-read-model-test");
      expect(parsed.transactionCount).toBe(42);
      expect(parsed.topEndpoints.map((endpoint) => endpoint.endpointAttributionStatus)).toEqual([
        "direct_payto_endpoint",
        "bundled_payto_unknown_endpoint",
      ]);
    }));

  test("serves x402 service comparison analytics", async () => {
    const handler = createBffHandler();

    const response = handler(request("/analytics/services/comparison"));
    const parsed = validateServiceAnalyticsComparisonResponse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.services[0]).toMatchObject({
      serviceId: "coingecko",
      userCount: serviceAnalyticsSummaryResponse.userCount,
      transactionCount: serviceAnalyticsSummaryResponse.transactionCount,
    });
    expect(parsed.services.length).toBeGreaterThan(1);
    expect(new Set(parsed.services.map((service) => service.serviceId)).size).toBe(
      parsed.services.length,
    );
    expect(parsed.services.some((service) => service.serviceId !== "coingecko")).toBe(true);
    expect(parsed.services.every((service) => service.sampleBasis.length > 0)).toBe(true);
    expect(parsed.services.every((service) => service.reasons?.length)).toBe(true);
  });

  test("serves quadrant-ready service analytics without chain tabs", async () => {
    const handler = createBffHandler();

    const response = handler(request("/analytics/services/quadrants"));
    const body = await response.json();
    const parsed = validateServiceAnalyticsQuadrantResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.axes).toEqual({
      x: { key: "averageTransactionsPerUser", label: "Average transactions per user" },
      y: { key: "endpointDiversity", label: "Endpoint diversity" },
    });
    expect(parsed.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceId: "coingecko", isCoinGecko: true }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain('"solana"');
    expect(JSON.stringify(body)).not.toContain('"base"');
  });

  test("does not expose demo and telemetry endpoints", async () => {
    const handler = createBffHandler();

    for (const path of ["/demo-data", "/sdk-events", "/telemetry", "/mock-attribution"] as const) {
      const response = handler(request(path));
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe("not_found");
      expect(response.headers.get("content-type")).toContain("application/json");
    }
  });

  test("keeps product endpoints read-only", async () => {
    const handler = createBffHandler();

    const paths = [
      "/customers",
      `/customers/${knownCustomerProfileAddress}/profile`,
      `/customers/${knownCustomerIntelligenceAddress}/intelligence`,
      "/wallet-usage-graph",
      "/analytics/services/coingecko/summary",
      "/analytics/services/comparison",
      "/analytics/services/quadrants",
    ] as const;

    for (const path of paths) {
      const response = handler(request(path, { method: "POST" }));
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
      expect(body.error).toBe("method_not_allowed");
    }
  });

  test("returns not found for unsupported analytics routes", async () => {
    const handler = createBffHandler();
    const response = handler(request("/analytics/services/unknown"));
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.message).toContain("/analytics/services/unknown");
  });

  test("validates real transaction and mock attribution fixtures", () => {
    const transactions = validateRealTransactionFixture(transactionFixture);
    const attribution = validateMockEndpointAttributionFixture(attributionFixture);

    expect(transactions.metadata.requestedLimit).toBe(5000);
    expect(new Date(transactions.metadata.timeWindow.from ?? "").toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(transactions.metadata.capturedCount).toBeGreaterThan(1000);
    expect(transactions.metadata.capturedCount).toBe(transactions.facts.length);
    expect(attribution.items).toHaveLength(transactions.facts.length);
    expect(new Set(transactions.facts.map((fact) => fact.txHash)).size).toBe(
      transactions.facts.length,
    );
    expect(new Set(attribution.items.map((item) => item.txHash)).size).toBe(
      attribution.items.length,
    );
    expect(transactions.facts[0]).toMatchObject({
      txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
      payerWallet: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      amount: "10000",
      asset: "USDC",
      network: "base",
      provenance: "onchain_fact",
    });
    expect(attribution.items.map((item) => item.endpointPath)).toEqual(
      expect.arrayContaining([
        "/api/v3/x402/onchain/simple/networks/base/token_price/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "/api/v3/x402/onchain/search/pools",
        "/api/v3/x402/onchain/networks/base/trending_pools",
        "/api/v3/x402/onchain/networks/base/tokens/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "/api/v3/x402/simple/price",
      ]),
    );
  });

  test("rejects mock attribution whose txHash is absent from transaction facts", () => {
    expect(() =>
      joinTransactionAttribution(transactionFixture, {
        ...attributionFixture,
        items: [
          ...attributionFixture.items,
          {
            ...attributionFixture.items[0],
            txHash: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          },
        ],
      }),
    ).toThrow("unknown txHash");
  });

  test("rejects mock attribution that is missing a transaction fact", () => {
    expect(() =>
      joinTransactionAttribution(transactionFixture, {
        ...attributionFixture,
        items: attributionFixture.items.slice(1),
      }),
    ).toThrow("count mismatch");
  });

  test("rejects duplicate mock attribution txHash entries", () => {
    expect(() =>
      joinTransactionAttribution(transactionFixture, {
        ...attributionFixture,
        items: [...attributionFixture.items, attributionFixture.items[0]],
      }),
    ).toThrow("attribution txHash values must be unique");
  });

  test("keeps onchain facts and demo attribution provenance separated", () => {
    const [record] = joinedPhaseBProjectionRecords;

    expect(record?.provenanceByField).toMatchObject({
      txHash: "onchain_fact",
      payerWallet: "onchain_fact",
      payTo: "onchain_fact",
      endpointPath: "demo_label",
      workflowLabel: "future_sdk_field",
    });
    expect(phaseBCustomerListResponse.customers.every((customer) => customer.reasons?.length)).toBe(
      true,
    );
    expect(record?.reasons.length).toBeGreaterThan(0);
  });

  test("customer intelligence uses prepared fixture provenance without live source calls", async () => {
    const handler = createBffHandler();
    const response = handler(
      request(`/customers/${knownCustomerIntelligenceAddress}/intelligence`),
    );
    const parsed = validateCustomerIntelligenceResponse(await response.json());

    expect(parsed.sourceCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "bitquery", status: "available" }),
        expect.objectContaining({ source: "cdp_discovery", status: "available" }),
        expect.objectContaining({
          source: "portfolio",
          status: expect.stringMatching(/^(available|partial)$/),
          provenance: expect.objectContaining({ sourceKind: "zerion" }),
        }),
      ]),
    );
    expect(parsed.provenanceByField).toMatchObject({
      payToActivities: "onchain_fact",
      x402Services: "derived_insight",
    });
  });

  test("builds projections that validate against Phase B schemas", () => {
    const projections = buildPhaseBProjections(transactionFixture, attributionFixture);

    expect(
      validatePhaseBCustomerListResponse(projections.customerList).customerCount,
    ).toBeGreaterThan(100);
    for (const profile of Object.values(projections.profilesByAddress)) {
      expect(
        validatePhaseBCustomerProfileResponse(profile).profile.metrics.reasons?.length,
      ).toBeGreaterThan(0);
    }
    expect(
      validatePhaseBWalletUsageGraphResponse(projections.walletUsageGraph).graph.reasons.length,
    ).toBeGreaterThan(0);
    expect(
      validatePhaseBWalletUsageGraphResponse(projections.walletUsageGraph).graph.providerWallets[0]
        ?.payerWallets.length,
    ).toBeLessThanOrEqual(100);
    expect(
      Object.values(projections.profilesByAddress).every(
        (profile) => profile.profile.timeline.length <= 20 && profile.profile.providers.length <= 5,
      ),
    ).toBe(true);
  });
});
