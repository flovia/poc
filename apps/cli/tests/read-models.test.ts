import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { validateCustomerIntelligenceFixture } from "contracts";
import type { BitqueryAggregate, CdpResource } from "contracts";
import { generateServiceAnalyticsReadModels } from "../scripts/analytics/read-models";
import { createAnalyticsStore } from "../scripts/analytics/store";

const withTempDir = async (label: string, fn: (dir: string) => Promise<void> | void) => {
  const directory = path.join(process.cwd(), "tmp", `read-models-${label}-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });
  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const provenance = { sourceKind: "cdp_discovery" as const, sourceName: "test" };

const resource = (
  resourceId: string,
  resourceUrl: string,
  provider: string,
  service: string,
  payTo: string,
): CdpResource => ({
  resourceId,
  resource: resourceUrl,
  provider,
  service,
  paymentOptions: [
    {
      network: "base",
      asset: "USDC",
      amount: "10000",
      payTo,
      provenance,
    },
  ],
  provenance,
});

const aggregate = (
  payTo: string,
  transactionCount: number,
  uniqueSenderCount: number,
): BitqueryAggregate => ({
  network: "base",
  asset: "USDC",
  payTo,
  transactionCount,
  uniqueSenderCount,
  totalVolumeAtomic: `${transactionCount * 10000}`,
  provenance: { sourceKind: "bitquery", sourceName: "test" },
});

describe("service analytics read model generation", () => {
  test("builds read models with sample basis, coverage, attribution, and provenance", async () =>
    withTempDir("generate", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const payTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const resources: CdpResource[] = [
        {
          resourceId: "coingecko-direct",
          resource: "https://api.coingecko.com/api/v3/x402/simple/price",
          provider: "coingecko",
          service: "CoinGecko x402",
          paymentOptions: [
            {
              network: "base",
              asset: "USDC",
              amount: "10000",
              payTo,
              provenance: { sourceKind: "cdp_discovery", sourceName: "test" },
            },
          ],
          provenance: { sourceKind: "cdp_discovery", sourceName: "test" },
        },
      ];
      const aggregates: BitqueryAggregate[] = [
        {
          network: "base",
          asset: "USDC",
          payTo,
          transactionCount: 10,
          uniqueSenderCount: 4,
          totalVolumeAtomic: "100000",
          provenance: { sourceKind: "bitquery", sourceName: "test" },
        },
      ];
      const customer = validateCustomerIntelligenceFixture({
        generatedAt: "2026-01-01T00:00:00.000Z",
        generatedFrom: "test",
        customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
        scope: {
          address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
          network: "base",
          asset: "USDC",
          timeWindow: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
        },
        x402Services: [
          {
            candidateId: "coingecko-direct::base:USDC:payto",
            payTo,
            providerName: "CoinGecko",
            serviceName: "CoinGecko x402",
            resource: "https://api.coingecko.com/api/v3/x402/simple/price",
            network: "base",
            asset: "USDC",
            transactionCount: 1,
            totalAmountAtomic: "10000",
            confidence: 0.9,
            provenance: "derived_insight",
            provenanceByField: { serviceName: "derived_insight" },
            evidence: [
              {
                provenance: "onchain_fact",
                label: "test",
                txHashes: ["0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94"],
              },
            ],
            reasons: [{ provenance: "derived_insight", label: "test" }],
          },
        ],
        payToActivities: [
          {
            payTo,
            network: "base",
            asset: "USDC",
            transactionCount: 1,
            totalAmountAtomic: "10000",
            latestTimestamp: "2026-01-02T00:00:00.000Z",
            txHashes: ["0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94"],
            provenance: "onchain_fact",
            provenanceByField: { payTo: "onchain_fact" },
            evidence: [
              {
                provenance: "onchain_fact",
                label: "test",
                txHashes: ["0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94"],
              },
            ],
          },
        ],
        portfolioSummary: {
          totalValueUsd: null,
          tokenCount: 0,
          sourceCoverage: {
            source: "portfolio",
            status: "unavailable",
            unavailableReason: "portfolio source not configured",
            provenance: { sourceKind: "derived", sourceName: "test" },
          },
          provenance: "derived_insight",
          provenanceByField: { sourceCoverage: "derived_insight" },
          reasons: [{ provenance: "derived_insight", label: "portfolio source not configured" }],
        },
        defiPositions: [],
        insights: [
          {
            key: "external-x402-activity",
            title: "External x402 activity",
            summary: "Customer paid an x402 service.",
            classification: "upsell",
            confidence: 0.8,
            provenance: "derived_insight",
            provenanceByField: { summary: "derived_insight" },
            reasons: [{ provenance: "derived_insight", label: "test" }],
          },
        ],
        sourceCoverage: [
          {
            source: "bitquery",
            status: "available",
            provenance: { sourceKind: "bitquery", sourceName: "test" },
          },
        ],
        provenance: "derived_insight",
        provenanceByField: { customerAddress: "onchain_fact" },
        reasons: [{ provenance: "derived_insight", label: "test" }],
      });
      store.persistCdpResources(resources);
      store.persistPayToAggregates(aggregates);
      store.detectAndPersistMappingPatterns();
      store.persistCustomerIntelligenceSnapshots([customer]);
      store.close();

      const result = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });
      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));

      expect(result.serviceComparison.services[0]).toMatchObject({
        serviceId: "coingecko",
        transactionCount: 10,
        coverage: "offline analytics SQLite read model",
        endpointAttributionStatus: "direct_payto_endpoint",
      });
      expect(payload.serviceSummary.comparedToX402.sampleBasis).toContain("analytics data store");
      expect(payload.serviceQuadrants.points[0].attributionConfidence).toBeGreaterThan(0);
      expect(payload.customers.customerCount).toBe(1);
      expect(payload.profilesByAddress[customer.customerAddress].profile.identity.address).toBe(
        customer.customerAddress,
      );
      expect(payload.intelligenceByAddress[customer.customerAddress].customerAddress).toBe(
        customer.customerAddress,
      );
      expect(payload.walletUsageGraph.graph.providerWallets[0].payerWallets).toHaveLength(1);
    }));

  test("scopes coingecko top endpoints and deduplicates service payment sink joins", async () =>
    withTempDir("scoped-top-endpoints", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const coingeckoPayTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const secondCoingeckoPayTo = "0x3333333333333333333333333333333333333333";
      const peerPayTo = "0x2222222222222222222222222222222222222222";

      store.persistCdpResources([
        resource(
          "coingecko-price",
          "https://api.coingecko.com/api/v3/x402/simple/price",
          "coingecko",
          "CoinGecko x402",
          coingeckoPayTo,
        ),
        resource(
          "coingecko-pools",
          "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
          "coingecko",
          "CoinGecko x402",
          coingeckoPayTo,
        ),
        resource(
          "coingecko-market-data",
          "https://pro-api.coingecko.com/api/v3/x402/market-data",
          "coingecko",
          "CoinGecko x402",
          secondCoingeckoPayTo,
        ),
        resource(
          "peer-global-leader",
          "https://x402-secure-api.t54.ai/x402/tools/get_api_health",
          "x402-secure-api.t54.ai",
          "x402-secure-api.t54.ai",
          peerPayTo,
        ),
      ]);
      store.persistPayToAggregates([
        aggregate(coingeckoPayTo, 10, 4),
        aggregate(secondCoingeckoPayTo, 5, 2),
        aggregate(peerPayTo, 10_000, 2_000),
      ]);
      store.detectAndPersistMappingPatterns();
      store.close();

      const result = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });

      const coingecko = result.serviceComparison.services.find(
        (service) => service.serviceId === "coingecko",
      );

      expect(coingecko).toMatchObject({
        transactionCount: 15,
        userCount: 6,
        endpointDiversity: 3,
      });
      expect(result.serviceSummary.topEndpoints).toHaveLength(1);
      expect(result.serviceSummary.topEndpoints[0]).toMatchObject({
        endpointName: "CoinGecko x402",
        transactionCount: 15,
        userCount: 6,
        endpointAttributionStatus: "bundled_payto_unknown_endpoint",
        attributionConfidence: 0.35,
      });
      expect(
        result.serviceSummary.topEndpoints.some((endpoint) =>
          endpoint.endpointName.includes("x402-secure-api.t54.ai"),
        ),
      ).toBe(false);
    }));
});
