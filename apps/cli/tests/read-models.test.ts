import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { validateCustomerIntelligenceFixture } from "contracts";
import type { BitqueryAggregate, CdpResource, CustomerIntelligenceResponse } from "contracts";
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

const customerFixture = (
  address: string,
  payTo: string,
  serviceNameValue: string,
  transactionCount: number,
  totalAmountAtomic: string,
): CustomerIntelligenceResponse =>
  validateCustomerIntelligenceFixture({
    generatedAt: "2026-01-01T00:00:00.000Z",
    generatedFrom: "test",
    customerAddress: address,
    scope: {
      address,
      network: "base",
      asset: "USDC",
      timeWindow: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
    },
    x402Services: [
      {
        candidateId: `${serviceNameValue}::base:USDC:payto`,
        payTo,
        providerName: serviceNameValue,
        serviceName: serviceNameValue,
        resource: `https://example.com/${serviceNameValue}`,
        network: "base",
        asset: "USDC",
        transactionCount,
        totalAmountAtomic,
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
        transactionCount,
        totalAmountAtomic,
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
    insights: [],
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

describe("service analytics read model generation", () => {
  test(
    "builds read models with sample basis, coverage, attribution, and provenance",
    async () =>
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
        store.persistTransferFacts([
          {
            network: "base",
            asset: "USDC",
            payTo,
            txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
            transferIndex: 0,
            payerWallet: customer.customerAddress,
            amountAtomic: "10000",
            blockTimestamp: "2026-01-02T00:00:00.000Z",
          },
        ]);
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
        expect(payload.providers.providers[0]).toMatchObject({
          payTo,
          serviceId: "coingecko",
          endpointAttributionStatus: "direct_payto_endpoint",
          hasCustomerFacts: true,
          customerFactCount: 1,
        });
        expect(payload.customers.customerCount).toBe(1);
        expect(payload.profilesByAddress[customer.customerAddress].profile.identity.address).toBe(
          customer.customerAddress,
        );
        expect(payload.intelligenceByAddress[customer.customerAddress].customerAddress).toBe(
          customer.customerAddress,
        );
        expect(payload.walletUsageGraph.graph.providerWallets[0].payerWallets).toHaveLength(1);
      }),
    15_000,
  );

  test("computes activityGrowth from on-chain transfer fact timestamps", async () =>
    withTempDir("activity-growth", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const payTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const customerAddress = "0xac5a07c44a4f971667b3df4b6551fb6991b2142d";

      store.persistCdpResources([
        resource(
          "coingecko-direct",
          "https://api.coingecko.com/api/v3/x402/simple/price",
          "coingecko",
          "CoinGecko x402",
          payTo,
        ),
      ]);
      store.persistPayToAggregates([aggregate(payTo, 6, 1)]);
      store.detectAndPersistMappingPatterns();
      // Two transfers in the earlier half (Jan 1, Jan 5) and four in the recent half
      // (Jan 25-28) of a Jan 1 → Jan 28 span. recent-vs-earlier = 4 vs 2 → +1.0 growth.
      const transferTimestamps: Array<{ tx: string; at: string }> = [
        {
          tx: "0x1111111111111111111111111111111111111111111111111111111111111111",
          at: "2026-01-01T00:00:00.000Z",
        },
        {
          tx: "0x2222222222222222222222222222222222222222222222222222222222222222",
          at: "2026-01-05T00:00:00.000Z",
        },
        {
          tx: "0x3333333333333333333333333333333333333333333333333333333333333333",
          at: "2026-01-25T00:00:00.000Z",
        },
        {
          tx: "0x4444444444444444444444444444444444444444444444444444444444444444",
          at: "2026-01-26T00:00:00.000Z",
        },
        {
          tx: "0x5555555555555555555555555555555555555555555555555555555555555555",
          at: "2026-01-27T00:00:00.000Z",
        },
        {
          tx: "0x6666666666666666666666666666666666666666666666666666666666666666",
          at: "2026-01-28T00:00:00.000Z",
        },
      ];
      store.persistTransferFacts(
        transferTimestamps.map(({ tx, at }) => ({
          network: "base",
          asset: "USDC",
          payTo,
          txHash: tx,
          transferIndex: 0,
          payerWallet: customerAddress,
          amountAtomic: "10000",
          blockTimestamp: at,
        })),
      );
      store.persistCustomerIntelligenceSnapshots([
        customerFixture(customerAddress, payTo, "CoinGecko x402", 1, "10000"),
      ]);
      store.close();

      generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-02-01T00:00:00.000Z",
      });
      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));

      const customerEntry = payload.customers.customers.find(
        (entry: { address: string }) => entry.address === customerAddress,
      );
      const profile = payload.profilesByAddress[customerAddress];
      expect(customerEntry.activityGrowth).toBeCloseTo(1, 5);
      expect(customerEntry.provenanceByField.activityGrowth).toBe("derived_insight");
      expect(profile.profile.metrics.activityGrowth).toBeCloseTo(1, 5);
      expect(profile.profile.metrics.provenanceByField.activityGrowth).toBe("derived_insight");
    }));

  test("scopes activityGrowth to the customer snapshot's (network, asset) — ignores other-asset transfers", async () =>
    withTempDir("activity-growth-scope", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const payTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const customerAddress = "0xac5a07c44a4f971667b3df4b6551fb6991b2142d";

      store.persistCdpResources([
        resource(
          "coingecko-direct",
          "https://api.coingecko.com/api/v3/x402/simple/price",
          "coingecko",
          "CoinGecko x402",
          payTo,
        ),
      ]);
      store.persistPayToAggregates([aggregate(payTo, 1, 1)]);
      store.detectAndPersistMappingPatterns();
      // In-scope: a single same-asset transfer → cannot split → growth must be 0.
      store.persistTransferFacts([
        {
          network: "base",
          asset: "USDC",
          payTo,
          txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
          transferIndex: 0,
          payerWallet: customerAddress,
          amountAtomic: "10000",
          blockTimestamp: "2026-01-15T00:00:00.000Z",
        },
        // Out-of-scope: same payer + same payTo but a different asset. If the
        // growth scoping were broken, these timestamps would leak in and produce
        // a non-zero recent-vs-earlier signal.
        {
          network: "base",
          asset: "USDT",
          payTo,
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          transferIndex: 0,
          payerWallet: customerAddress,
          amountAtomic: "10000",
          blockTimestamp: "2026-01-01T00:00:00.000Z",
        },
        {
          network: "base",
          asset: "USDT",
          payTo,
          txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          transferIndex: 0,
          payerWallet: customerAddress,
          amountAtomic: "10000",
          blockTimestamp: "2026-01-30T00:00:00.000Z",
        },
      ]);
      // Snapshot scope is base/USDC — out-of-scope USDT transfers must be ignored.
      store.persistCustomerIntelligenceSnapshots([
        customerFixture(customerAddress, payTo, "CoinGecko x402", 1, "10000"),
      ]);
      store.close();

      generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-02-01T00:00:00.000Z",
      });
      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      const customerEntry = payload.customers.customers.find(
        (entry: { address: string }) => entry.address === customerAddress,
      );
      expect(customerEntry.activityGrowth).toBe(0);
      expect(payload.profilesByAddress[customerAddress].profile.metrics.activityGrowth).toBe(0);
    }));

  test("generates provider catalog rows for bundled, unresolved, and no-customer-fact payTos", async () =>
    withTempDir("provider-catalog", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const bundledPayTo = "0x1111111111111111111111111111111111111111";
      const secondPayTo = "0x2222222222222222222222222222222222222222";
      const unresolvedPayTo = "0x3333333333333333333333333333333333333333";

      store.persistCdpResources([
        resource("bundle-a", "https://bundle.example/a", "Bundle", "Bundle API", bundledPayTo),
        resource("bundle-b", "https://bundle.example/b", "Bundle", "Bundle API", bundledPayTo),
        resource("second", "https://second.example", "Second", "Second API", secondPayTo),
      ]);
      store.persistPayToAggregates([
        aggregate(bundledPayTo, 20, 3),
        aggregate(secondPayTo, 2, 1),
        aggregate(unresolvedPayTo, 1, 1),
      ]);
      store.detectAndPersistMappingPatterns([
        { network: "base", asset: "USDC", payTo: unresolvedPayTo },
      ]);
      store.persistTransferFacts([
        {
          network: "base",
          asset: "USDC",
          payTo: bundledPayTo,
          txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
          payerWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          amountAtomic: "10000",
          blockTimestamp: "2026-01-02T00:00:00.000Z",
        },
      ]);
      store.close();

      const result = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });

      const bundled = result.providers.providers.find(
        (provider) => provider.payTo === bundledPayTo,
      );
      const unresolved = result.providers.providers.find(
        (provider) => provider.payTo === unresolvedPayTo,
      );
      const withoutFacts = result.providers.providers.find(
        (provider) => provider.payTo === secondPayTo,
      );

      expect(bundled).toMatchObject({
        endpointAttributionStatus: "bundled_payto_unknown_endpoint",
        hasCustomerFacts: true,
      });
      expect(unresolved).toMatchObject({
        endpointAttributionStatus: "unresolved_payto",
        hasCustomerFacts: false,
      });
      expect(withoutFacts).toMatchObject({ hasCustomerFacts: false });
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
        endpointPath: "CoinGecko x402",
        endpointName: "CoinGecko x402 inferred cluster",
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

  test("computes service summary comparison shares from all services", async () =>
    withTempDir("comparison-shares", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const coingeckoPayTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const peerPayTo = "0x2222222222222222222222222222222222222222";

      store.persistCdpResources([
        resource(
          "coingecko",
          "https://api.coingecko.com/api/v3/x402/simple/price",
          "coingecko",
          "CoinGecko x402",
          coingeckoPayTo,
        ),
        resource("peer", "https://peer.example/x402", "peer", "Peer x402", peerPayTo),
      ]);
      store.persistPayToAggregates([aggregate(coingeckoPayTo, 10, 2), aggregate(peerPayTo, 30, 6)]);
      store.detectAndPersistMappingPatterns();
      store.close();

      const result = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });

      expect(result.serviceSummary.comparedToX402.userShare).toBeCloseTo(0.25);
      expect(result.serviceSummary.comparedToX402.transactionShare).toBeCloseTo(0.25);
      expect(result.serviceSummary.comparedToX402.activityIndex).toBeCloseTo(1);
    }));

  test("scopes customer snapshots and wallet observations to the requested current runs", async () =>
    withTempDir("customer-scope", (directory) => {
      const dbPath = path.join(directory, "analytics.sqlite");
      const outputPath = path.join(directory, "analytics.json");
      const store = createAnalyticsStore({ path: dbPath });
      const payTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
      const oldCustomer = customerFixture(
        "0x1111111111111111111111111111111111111111",
        payTo,
        "Old Service",
        1,
        "10000",
      );
      const currentCustomer = customerFixture(
        "0x2222222222222222222222222222222222222222",
        payTo,
        "Current Service",
        1,
        "20000",
      );
      const oldRunId = store.beginCaptureRun({
        kind: "customer_intelligence_capture",
        parameters: {},
      });
      store.completeCaptureRun(oldRunId, {});
      const currentRunId = store.beginCaptureRun({
        kind: "customer_intelligence_capture",
        parameters: {},
      });
      store.completeCaptureRun(currentRunId, {});

      store.persistCdpResources([
        resource(
          "coingecko",
          "https://api.coingecko.com/api/v3/x402/simple/price",
          "coingecko",
          "CoinGecko x402",
          payTo,
        ),
      ]);
      store.persistPayToAggregates([aggregate(payTo, 10, 2)]);
      store.detectAndPersistMappingPatterns();
      store.persistCustomerIntelligenceSnapshots([oldCustomer], oldRunId);
      store.persistCustomerIntelligenceSnapshots([currentCustomer], currentRunId);
      store.close();

      const emptyScoped = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath: path.join(directory, "empty.json"),
        generatedAt: "2026-01-01T00:00:00.000Z",
        customerRunIds: [],
      });
      expect(emptyScoped.customers.customerCount).toBe(0);

      const currentScoped = generateServiceAnalyticsReadModels({
        analyticsDbPath: dbPath,
        outputPath,
        generatedAt: "2026-01-01T00:00:00.000Z",
        customerRunIds: [currentRunId],
      });

      expect(currentScoped.customers.customers.map((customer) => customer.address)).toEqual([
        currentCustomer.customerAddress,
      ]);
      expect(
        currentScoped.walletUsageGraph.graph.providerWallets[0]?.payerWallets[0]?.observations.map(
          (observation) => observation.serviceName,
        ),
      ).toEqual(["Current Service"]);
    }));
});
