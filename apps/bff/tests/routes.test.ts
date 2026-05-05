import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createBffHandler } from "../src/http";
import {
  fixtureAnalyticsDataSource,
  loadGeneratedAnalyticsDataSource,
  loadPostgresAnalyticsDataSource,
  resolveAnalyticsDataSource,
} from "../src/data/analytics-source";
import { loadPostgresLiveAnalyticsDataSource } from "../src/data/postgres-live-read-model";
import type { BffLlmService } from "../src/data/llm";
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
  validatePhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateMockEndpointAttributionFixture,
  validateCustomerIntelligenceResponse,
  validateProviderCatalogResponse,
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
      const response = await handler(request(path));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("application/json");
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ service: "flovia-bff", status: "ok" }),
      );
    }
  });

  test("rejects non-GET requests to read-only endpoints", async () => {
    const handler = createBffHandler();
    const response = await handler(request("/health", { method: "POST" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(405);
    expect(body.error).toBe("method_not_allowed");
  });

  test("returns JSON not found for unsupported routes", async () => {
    const handler = createBffHandler();
    const response = await handler(request("/unknown"));
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.message).toContain("/unknown");
  });

  test("serves customer list with schema validation", async () => {
    const handler = createBffHandler();

    const response = await handler(request("/customers"));
    const body = await response.json();
    const parsed = validatePhaseBCustomerListResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.customerCount).toBe(parsed.customers.length);
    expect(parsed.customerCount).toBeGreaterThan(0);
  });

  test("serves provider catalog with schema validation", async () => {
    const handler = createBffHandler(fixtureAnalyticsDataSource);

    const response = await handler(request("/providers"));
    const parsed = validateProviderCatalogResponse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.providerCount).toBe(parsed.providers.length);
    expect(parsed.providers.some((provider) => provider.hasCustomerFacts)).toBe(true);
  });

  test("filters customers by payTo without fabricating unknown payTo rows", async () => {
    const handler = createBffHandler(fixtureAnalyticsDataSource);
    const payTo = fixtureAnalyticsDataSource.providers.providers[0]?.payTo;
    if (!payTo) throw new Error("fixture provider missing payTo");

    const scoped = validatePhaseBCustomerListResponse(
      await (await handler(request(`/customers?payTo=${payTo}`))).json(),
    );
    const empty = validatePhaseBCustomerListResponse(
      await (
        await handler(request("/customers?payTo=0x9999999999999999999999999999999999999999"))
      ).json(),
    );

    expect(scoped.scope?.payTo).toBe(payTo.toLowerCase());
    expect(scoped.customerCount).toBeGreaterThan(0);
    expect(empty.customerCount).toBe(0);
  });

  test("returns a validated profile for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = await handler(
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

    const response = await handler(
      request("/customers/0x9999999999999999999999999999999999999999/profile"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("returns validated customer intelligence for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = await handler(
      request(`/customers/${knownCustomerIntelligenceAddress.toUpperCase()}/intelligence`),
    );
    const body = await response.json();
    const parsed = validateCustomerIntelligenceResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.customerAddress).toBe(knownCustomerIntelligenceAddress);
    expect(parsed.payToActivities.length).toBeGreaterThan(0);
    expect(parsed.x402Services[0]?.reasons.length).toBeGreaterThan(0);
  });

  test("returns validated upsell metrics for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = await handler(
      request(`/customers/${knownCustomerIntelligenceAddress.toUpperCase()}/llm/upsell-metrics`),
    );
    const body = await response.json();
    const parsed = validatePhaseBCustomerUpsellMetricsResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.address).toBe(knownCustomerIntelligenceAddress);
    expect(parsed.signals.customerCount).toBeGreaterThan(0);
    expect(parsed.reasonCodes.length).toBeGreaterThan(0);
    expect(parsed.caveats.length).toBeGreaterThan(0);
  });

  test("returns llm_unavailable when Bedrock upsell explanation is not configured", async () => {
    const handler = createBffHandler();

    const response = await handler(
      request(`/customers/${knownCustomerIntelligenceAddress}/llm/upsell-explanation`),
    );
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("llm_unavailable");
    expect(body.message).toContain("Bedrock");
  });

  test("returns llm_failed with llm service error detail", async () => {
    const llmService: BffLlmService = {
      async generateUpsellExplanation() {
        throw new Error("AccessDeniedException: missing model access");
      },
    };
    const handler = createBffHandler(undefined, llmService);
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const response = await handler(
        request(`/customers/${knownCustomerIntelligenceAddress}/llm/upsell-explanation`),
      );
      const body = (await response.json()) as { error: string; message: string };

      expect(response.status).toBe(502);
      expect(body.error).toBe("llm_failed");
      expect(body.message).toContain("AccessDeniedException");
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("returns validated Bedrock upsell explanation for a known customer wallet", async () => {
    const llmService: BffLlmService = {
      async generateUpsellExplanation(input) {
        return {
          generatedAt: "2026-05-01T00:00:00Z",
          generatedFrom: "phase-b-bedrock-upsell-explanation-v1",
          address: input.address,
          sourceGeneratedAt: input.sourceGeneratedAt,
          model: {
            provider: "bedrock",
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            region: "ap-northeast-1",
            promptVersion: "upsell-explanation-v1",
          },
          input: {
            signals: input.signals,
            flags: input.flags,
            reasonCodes: input.reasonCodes,
            caveats: input.caveats,
          },
          explanation: {
            summary:
              "This wallet remains active and shows multi-provider usage, making it a strong upsell candidate.",
            reasons: [
              "Recent activity was observed within the last 7 days.",
              "The wallet interacted with multiple providers and has a high transaction count.",
            ],
            recommendedAction: "Offer a higher-frequency plan or enterprise-style support package.",
            caution:
              "Some supporting metrics are PoC heuristics and should be reviewed before sales commitments.",
          },
          provenance: "derived_insight",
          provenanceByField: {
            address: "onchain_fact",
            model: "derived_insight",
            input: "derived_insight",
            explanation: "derived_insight",
          },
          reasons: [
            { provenance: "derived_insight", label: "bedrock explanation from upsell metrics" },
          ],
        };
      },
    };
    const handler = createBffHandler(undefined, llmService);

    const response = await handler(
      request(`/customers/${knownCustomerIntelligenceAddress}/llm/upsell-explanation`),
    );
    const body = await response.json();
    const parsed = validatePhaseBCustomerUpsellExplanationResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.address).toBe(knownCustomerIntelligenceAddress);
    expect(parsed.explanation.summary.length).toBeGreaterThan(0);
    expect(parsed.input.reasonCodes.length).toBeGreaterThan(0);
  });

  test("returns not found for unknown customer intelligence", async () => {
    const handler = createBffHandler();

    const response = await handler(
      request("/customers/0x9999999999999999999999999999999999999999/intelligence"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("returns not found for unknown customer upsell metrics", async () => {
    const handler = createBffHandler();

    const response = await handler(
      request("/customers/0x9999999999999999999999999999999999999999/llm/upsell-metrics"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("serves wallet usage graph with schema validation", async () => {
    const handler = createBffHandler();

    const response = await handler(request("/wallet-usage-graph"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      validatePhaseBWalletUsageGraphResponse(body).graph.providerWallets.length,
    ).toBeGreaterThan(0);
  });

  test("phase-b projection assigns external x402 provider candidates per payer", () => {
    const fixture = validateRealTransactionFixture(transactionFixture);
    const attribution = validateMockEndpointAttributionFixture(attributionFixture);
    const projections = buildPhaseBProjections(fixture, attribution);
    const graph = validatePhaseBWalletUsageGraphResponse(projections.walletUsageGraph).graph;

    const ownPayTo = graph.providerWallets[0]?.payToWallet;
    expect(ownPayTo).toBeTruthy();

    const allCandidates = graph.providerWallets.flatMap((provider) =>
      provider.payerWallets.flatMap((payer) => payer.otherServiceCandidates),
    );
    const externalCandidates = allCandidates.filter(
      (candidate) => candidate.payToWallet !== ownPayTo,
    );
    const externalProviderIds = new Set(externalCandidates.map((c) => c.providerId));
    const externalProviderNames = new Set(externalCandidates.map((c) => c.providerName));

    expect(externalCandidates.length).toBeGreaterThan(0);
    expect(externalProviderIds.size).toBeGreaterThanOrEqual(3);
    expect(externalProviderNames.has("CoinGecko x402")).toBe(false);
    for (const candidate of externalCandidates) {
      expect(candidate.coUsageCount).toBeGreaterThan(0);
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(candidate.payToWallet).toMatch(/^0x[a-f0-9]{40}$/);
    }
  });

  test("serves coingecko service summary analytics", async () => {
    const handler = createBffHandler();

    const response = await handler(request("/analytics/services/coingecko/summary"));
    const parsed = validateServiceAnalyticsSummaryResponse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.serviceId).toBe("coingecko");
    expect(parsed.userCount).toBeGreaterThan(100);
    expect(parsed.transactionCount).toBeGreaterThan(0);
    expect(parsed.averageTransactionsPerUser).toBeGreaterThan(0);
    expect(parsed.repeatUserRate).toBeGreaterThanOrEqual(0);
    expect(parsed.topEndpoints.length).toBeGreaterThan(0);
    expect(parsed.comparedToX402.transactionShare).toBeGreaterThan(0);
    expect(parsed.comparedToX402.sampleBasis.length).toBeGreaterThan(0);
    expect(parsed.comparedToX402.availableServiceCount).toBeGreaterThan(1);
    expect(parsed.provenanceByField).toMatchObject({
      transactionCount: "onchain_fact",
      topEndpoints: "derived_insight",
    });
    expect(parsed.topEndpoints[0]?.provenanceByField).toMatchObject({
      transactionCount: expect.stringMatching(/^(derived_insight|onchain_fact)$/),
      userCount: expect.stringMatching(/^(derived_insight|onchain_fact)$/),
    });
    expect(parsed.topEndpoints[0]?.endpointAttributionStatus).toBeTruthy();
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
      const generatedProviders = {
        ...fixtureAnalyticsDataSource.providers,
        generatedFrom: "generated-read-model-test",
        providers: [
          {
            ...fixtureAnalyticsDataSource.providers.providers[0],
            providerId: "generated-provider",
            name: "Generated Provider",
          },
        ],
        providerCount: 1,
      };
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          { serviceSummary: generatedSummary, providers: generatedProviders },
          null,
          2,
        ),
      );
      const handler = createBffHandler(loadGeneratedAnalyticsDataSource(filePath));
      const response = await handler(request("/analytics/services/coingecko/summary"));
      const parsed = validateServiceAnalyticsSummaryResponse(await response.json());
      const providers = validateProviderCatalogResponse(
        await (await handler(request("/providers"))).json(),
      );

      expect(parsed.generatedFrom).toBe("generated-read-model-test");
      expect(providers.providers[0]?.providerId).toBe("generated-provider");
      expect(parsed.transactionCount).toBe(42);
      expect(parsed.topEndpoints.map((endpoint) => endpoint.endpointAttributionStatus)).toEqual([
        "direct_payto_endpoint",
        "bundled_payto_unknown_endpoint",
      ]);
    }));

  test("resolves fixture analytics source when explicitly configured", () => {
    const dataSource = resolveAnalyticsDataSource(undefined, {
      env: { BFF_ANALYTICS_SOURCE: "fixture" },
    });

    expect(dataSource).toBe(fixtureAnalyticsDataSource);
  });

  test("resolves generated JSON analytics source when explicitly configured", async () =>
    withTempFile(async (filePath) => {
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            serviceSummary: {
              ...serviceAnalyticsSummaryResponse,
              generatedFrom: "explicit-json-source-test",
              transactionCount: 77,
            },
          },
          null,
          2,
        ),
      );

      const dataSource = await Promise.resolve(
        resolveAnalyticsDataSource(undefined, {
          env: { BFF_ANALYTICS_SOURCE: "json", BFF_ANALYTICS_READ_MODEL_PATH: filePath },
        }),
      );

      expect(dataSource.serviceSummary.generatedFrom).toBe("explicit-json-source-test");
      expect(dataSource.serviceSummary.transactionCount).toBe(77);
    }));

  test("throws when explicit JSON analytics source file is missing", () => {
    expect(() =>
      resolveAnalyticsDataSource("/tmp/flovia-missing-bff-analytics.json", {
        env: { BFF_ANALYTICS_SOURCE: "json" },
      }),
    ).toThrow("BFF analytics JSON read model not found");
  });

  test("throws when postgres analytics source has no database URL", () => {
    expect(() =>
      resolveAnalyticsDataSource(undefined, {
        env: { BFF_ANALYTICS_SOURCE: "postgres" },
      }),
    ).toThrow("BFF analytics postgres source requires");
  });

  test("uses postgres live loader by default", async () => {
    const dataSource = await resolveAnalyticsDataSource(undefined, {
      env: { BFF_ANALYTICS_SOURCE: "postgres" },
      postgresClient: {
        async query(sql) {
          if (sql.includes("attributed_grouped")) {
            return [
              {
                payer: "0x2222222222222222222222222222222222222222",
                pay_to: "0x1111111111111111111111111111111111111111",
                service_id: "live-service",
                service_name: "Live Service",
                transaction_count: 3,
                total_volume_atomic: "300",
              },
            ];
          }
          if (sql.includes("provider_activity")) {
            return [
              {
                pay_to: "0x1111111111111111111111111111111111111111",
                service_id: "live-service",
                service_name: "Live Service",
                transaction_count: 3,
                unique_sender_count: 1,
                total_volume_atomic: "300",
              },
            ];
          }
          throw new Error(`unexpected query: ${sql}`);
        },
      },
    });

    expect(dataSource.serviceSummary.generatedFrom).toBe("postgres-live-read-model");
    expect(dataSource.providers.providers[0]?.serviceId).toBe("live-service");
  });

  test("uses postgres snapshot loader when snapshot mode is configured", async () => {
    const dataSource = await resolveAnalyticsDataSource(undefined, {
      env: {
        BFF_ANALYTICS_SOURCE: "postgres",
        BFF_ANALYTICS_POSTGRES_MODE: "snapshot",
        BFF_ANALYTICS_SNAPSHOT_ID: "snapshot-test",
      },
      postgresClient: {
        async query(sql, params) {
          expect(sql).toBe("SELECT payload FROM bff_analytics_snapshots WHERE id = $1");
          expect(params).toEqual(["snapshot-test"]);
          return [
            {
              payload: {
                serviceSummary: {
                  ...serviceAnalyticsSummaryResponse,
                  generatedFrom: "postgres-snapshot-mode-test",
                  transactionCount: 99,
                },
              },
            },
          ];
        },
      },
    });

    expect(dataSource.serviceSummary.generatedFrom).toBe("postgres-snapshot-mode-test");
    expect(dataSource.serviceSummary.transactionCount).toBe(99);
  });

  test("loads postgres snapshot payload through generated payload validation", async () => {
    const dataSource = await loadPostgresAnalyticsDataSource(
      {
        async query(sql, params) {
          expect(sql).toBe("SELECT payload FROM bff_analytics_snapshots WHERE id = $1");
          expect(params).toEqual(["snapshot-test"]);
          return [
            {
              payload: {
                serviceSummary: {
                  ...serviceAnalyticsSummaryResponse,
                  generatedFrom: "postgres-snapshot-test",
                  transactionCount: 88,
                },
              },
            },
          ];
        },
      },
      "snapshot-test",
    );

    expect(dataSource.serviceSummary.generatedFrom).toBe("postgres-snapshot-test");
    expect(dataSource.serviceSummary.transactionCount).toBe(88);
  });

  test("builds postgres live payload counts from raw rows", async () => {
    const dataSource = await loadPostgresLiveAnalyticsDataSource({
      async query(sql) {
        if (sql.includes("attributed_grouped")) {
          return [
            {
              payer: "0x4444444444444444444444444444444444444444",
              pay_to: "0x3333333333333333333333333333333333333333",
              service_id: "alpha",
              service_name: "Alpha",
              transaction_count: 4,
              total_volume_atomic: "400",
            },
            {
              payer: "0x5555555555555555555555555555555555555555",
              pay_to: "0x3333333333333333333333333333333333333333",
              service_id: "alpha",
              service_name: "Alpha",
              transaction_count: 3,
              total_volume_atomic: "300",
            },
          ];
        }
        if (sql.includes("provider_activity")) {
          return [
            {
              pay_to: "0x3333333333333333333333333333333333333333",
              service_id: "alpha",
              service_name: "Alpha",
              transaction_count: 7,
              unique_sender_count: 2,
              total_volume_atomic: "700",
            },
          ];
        }
        return [];
      },
    });

    expect(dataSource.providers.providerCount).toBe(1);
    expect(dataSource.customers.customerCount).toBe(2);
    expect(dataSource.walletUsageGraph.graph.providerWallets[0]?.payerWallets.length).toBe(2);
    expect(dataSource.serviceSummary.userCount).toBe(2);
    expect(dataSource.serviceSummary.transactionCount).toBe(7);
    expect(
      dataSource.serviceComparison.services.some((service) => service.serviceId === "coingecko"),
    ).toBe(true);
  });

  test("reflects generic x402 overlap in CoinGecko customer providerCount", async () => {
    const coingeckoPayTo = "0x6666666666666666666666666666666666666666";
    const genericPayTo = "0x7777777777777777777777777777777777777777";
    const payer = "0x8888888888888888888888888888888888888888";
    const dataSource = await loadPostgresLiveAnalyticsDataSource({
      async query(sql) {
        if (sql.includes("attributed_grouped")) {
          return [
            {
              payer,
              pay_to: genericPayTo,
              service_id: "generic-service",
              service_name: "Generic Service",
              transaction_count: 2,
              total_volume_atomic: "200",
            },
            {
              payer,
              pay_to: coingeckoPayTo,
              service_id: "pro-api.coingecko.com",
              service_name: "pro-api.coingecko.com",
              transaction_count: 1,
              total_volume_atomic: "100",
            },
          ];
        }
        if (sql.includes("provider_activity")) {
          return [
            {
              pay_to: genericPayTo,
              service_id: "generic-service",
              service_name: "Generic Service",
              transaction_count: 2,
              unique_sender_count: 1,
              total_volume_atomic: "200",
            },
            {
              pay_to: coingeckoPayTo,
              service_id: "pro-api.coingecko.com",
              service_name: "pro-api.coingecko.com",
              transaction_count: 1,
              unique_sender_count: 1,
              total_volume_atomic: "100",
            },
          ];
        }
        return [];
      },
    });

    expect(
      dataSource.customers.customers.find((customer) => customer.address === payer)?.providerCount,
    ).toBe(2);
  });

  test("does not mix generated customer lookups with demo fixture profiles", async () =>
    withTempFile(async (filePath) => {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ serviceSummary: serviceAnalyticsSummaryResponse }, null, 2),
      );
      const handler = createBffHandler(loadGeneratedAnalyticsDataSource(filePath));

      const profileResponse = await handler(
        request(`/customers/${knownCustomerProfileAddress}/profile`),
      );
      const intelligenceResponse = await handler(
        request(`/customers/${knownCustomerIntelligenceAddress}/intelligence`),
      );
      const upsellMetricsResponse = await handler(
        request(`/customers/${knownCustomerProfileAddress}/llm/upsell-metrics`),
      );

      expect(profileResponse.status).toBe(404);
      expect(intelligenceResponse.status).toBe(404);
      expect(upsellMetricsResponse.status).toBe(404);
    }));

  test("serves x402 service comparison analytics", async () => {
    const handler = createBffHandler(fixtureAnalyticsDataSource);

    const response = await handler(request("/analytics/services/comparison"));
    const parsed = validateServiceAnalyticsComparisonResponse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.services[0]).toMatchObject({
      serviceId: "coingecko",
      userCount: expect.any(Number),
      transactionCount: expect.any(Number),
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
    const handler = createBffHandler(fixtureAnalyticsDataSource);

    const response = await handler(request("/analytics/services/quadrants"));
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
    const handler = createBffHandler(fixtureAnalyticsDataSource);

    for (const path of ["/demo-data", "/sdk-events", "/telemetry", "/mock-attribution"] as const) {
      const response = await handler(request(path));
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
      "/providers",
      `/customers/${knownCustomerProfileAddress}/profile`,
      `/customers/${knownCustomerIntelligenceAddress}/intelligence`,
      `/customers/${knownCustomerIntelligenceAddress}/llm/upsell-metrics`,
      `/customers/${knownCustomerIntelligenceAddress}/llm/upsell-explanation`,
      "/wallet-usage-graph",
      "/analytics/services/coingecko/summary",
      "/analytics/services/comparison",
      "/analytics/services/quadrants",
    ] as const;

    for (const path of paths) {
      const response = await handler(request(path, { method: "POST" }));
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
      expect(body.error).toBe("method_not_allowed");
    }
  });

  test("returns not found for unsupported analytics routes", async () => {
    const handler = createBffHandler();
    const response = await handler(request("/analytics/services/unknown"));
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
    const handler = createBffHandler(fixtureAnalyticsDataSource);
    const response = await handler(
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
