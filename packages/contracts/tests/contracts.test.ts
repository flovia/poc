import { beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  PaymentRecipientAddressSchema,
  validateBitqueryAggregate,
  validateCdpResource,
  validateCustomerIntelligenceResponse,
  validateMarketSnapshot,
  validateMockEndpointAttributionFixture,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
  validatePhaseBWalletUsageGraphResponse,
  validatePortfolioSourceResult,
  validateProviderCatalogResponse,
  validateRealTransactionFixture,
  validateRouteAnalyticsSankeyResponse,
  validateRouteAnalyticsSummaryResponse,
} from "../src/index";

const validCustomerIntelligence = () => ({
  generatedAt: "2026-04-29T00:00:00Z",
  generatedFrom: "customer-intelligence-capture",
  customerAddress: "0xAC5A07C44A4F971667B3DF4B6551FB6991B2142D",
  scope: {
    address: "0xAC5A07C44A4F971667B3DF4B6551FB6991B2142D",
    network: "eip155:8453",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    timeWindow: { from: "2026-01-01T00:00:00Z", to: "2026-04-29T23:59:59Z" },
  },
  x402Services: [
    {
      candidateId: "base:usdc:0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      providerName: "CoinGecko",
      serviceName: "CoinGecko x402",
      resource: "https://api.coingecko.com/api/v3/x402/simple/price",
      network: "base",
      asset: "USDC",
      transactionCount: 1,
      totalAmountAtomic: "10000",
      confidence: 0.9,
      provenance: "derived_insight",
      provenanceByField: { payTo: "onchain_fact", serviceName: "derived_insight" },
      evidence: [
        {
          provenance: "onchain_fact",
          label: "customer outgoing payment",
          txHashes: ["0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94"],
        },
      ],
      reasons: [{ provenance: "onchain_fact", label: "payTo matched CDP payment option" }],
    },
  ],
  payToActivities: [
    {
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      network: "base",
      asset: "USDC",
      transactionCount: 1,
      totalAmountAtomic: "10000",
      latestTimestamp: "2026-04-29T04:11:53Z",
      txHashes: ["0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94"],
      provenance: "onchain_fact",
      provenanceByField: { payTo: "onchain_fact", totalAmountAtomic: "onchain_fact" },
      evidence: [
        {
          provenance: "onchain_fact",
          label: "Bitquery outgoing transfer",
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
      unavailableReason: "portfolio source not captured in Phase B fixture",
    },
    provenance: "derived_insight",
    provenanceByField: { sourceCoverage: "derived_insight" },
    reasons: [{ provenance: "derived_insight", label: "portfolio source unavailable" }],
  },
  defiPositions: [],
  insights: [
    {
      key: "external-x402-activity",
      title: "External x402 activity candidate",
      summary: "Observed outgoing payment matched an x402 payment option.",
      classification: "partnership",
      confidence: 0.8,
      provenance: "derived_insight",
      provenanceByField: { summary: "derived_insight" },
      reasons: [{ provenance: "onchain_fact", label: "matched payment activity" }],
    },
  ],
  sourceCoverage: [
    { source: "bitquery", status: "available" },
    { source: "cdp_discovery", status: "available" },
    {
      source: "portfolio",
      status: "unavailable",
      unavailableReason: "portfolio source not captured in Phase B fixture",
    },
  ],
  provenance: "derived_insight",
  provenanceByField: { customerAddress: "onchain_fact", x402Services: "derived_insight" },
  reasons: [{ provenance: "onchain_fact", label: "customer outgoing transfer facts" }],
});

const readFixture = <T>(name: string): T => {
  const fixtureRoot = path.resolve(import.meta.dir, "fixtures");
  const raw = fs.readFileSync(path.join(fixtureRoot, name), "utf8");
  return JSON.parse(raw) as T;
};

describe("contracts schema validation", () => {
  test("accepts machine payment route analytics summary and sankey payloads", () => {
    const summary = validateRouteAnalyticsSummaryResponse({
      generatedAt: "2026-05-06T00:00:00.000Z",
      generatedFrom: "route-analytics-demo",
      routeCount: 3,
      workflowCount: 3,
      paidWorkflowCount: 3,
      settledUsd: 42.5,
      successRate: 1,
      repeatUsage: 2,
      paymentToAccessConversion: 1,
      rails: [
        {
          rail: "x402",
          routeCount: 1,
          workflowCount: 1,
          paidWorkflowCount: 1,
          settledUsd: 10,
          successRate: 1,
          repeatUsage: 1,
          visibility: "public_onchain",
        },
        {
          rail: "stripe_mpp",
          routeCount: 1,
          workflowCount: 1,
          paidWorkflowCount: 1,
          settledUsd: 20,
          successRate: 1,
          repeatUsage: 1,
          visibility: "provider_attested",
        },
      ],
      sampleRoutes: [
        {
          routeId: "route:x402:forecast",
          workflowId: "workflow:forecast",
          rail: "x402",
          protocol: "x402",
          sourceRoute: "Direct API client",
          providerId: "coingecko",
          endpointGroup: "Forecast API",
          payerIdentity: "0x1111111111111111111111111111111111111111",
          payeeIdentity: "0x2222222222222222222222222222222222222222",
          amountUsd: 10,
          currency: "USD",
          status: "settled",
          settlementRef: { type: "onchain_tx", value: "0xabc" },
          visibility: "public_onchain",
          provenance: "derived_insight",
          provenanceByField: { rail: "onchain_fact" },
          timestamp: "2026-05-06T00:00:00.000Z",
          latencyMs: 120,
          reasons: [{ provenance: "derived_insight", label: "route analytics fixture" }],
        },
      ],
      provenance: "derived_insight",
      provenanceByField: { rails: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "route analytics fixture" }],
    });

    expect(summary.rails.map((rail) => rail.rail)).toContain("stripe_mpp");
    expect(summary.sampleRoutes[0]?.visibility).toBe("public_onchain");

    const sankey = validateRouteAnalyticsSankeyResponse({
      generatedAt: "2026-05-06T00:00:00.000Z",
      generatedFrom: "route-analytics-demo",
      layers: ["source_route", "payment_rail", "api_workflow"],
      nodes: [
        { id: "source:direct", label: "Direct API client", layer: "source_route" },
        {
          id: "rail:x402",
          label: "x402",
          layer: "payment_rail",
          rail: "x402",
          visibility: "public_onchain",
        },
        { id: "workflow:forecast", label: "Forecast API", layer: "api_workflow" },
      ],
      links: [
        {
          source: "source:direct",
          target: "rail:x402",
          routeCount: 1,
          workflowCount: 1,
          settledUsd: 10,
          rail: "x402",
          visibility: "public_onchain",
        },
      ],
      provenance: "derived_insight",
      provenanceByField: { links: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "route analytics fixture" }],
    });

    expect(sankey.layers).toEqual(["source_route", "payment_rail", "api_workflow"]);
  });

  test("accepts a valid customer intelligence response and normalizes scope", () => {
    const parsed = validateCustomerIntelligenceResponse(validCustomerIntelligence());

    expect(parsed.customerAddress).toBe("0xac5a07c44a4f971667b3df4b6551fb6991b2142d");
    expect(parsed.scope).toMatchObject({
      address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      network: "base",
      asset: "USDC",
    });
    expect(parsed.x402Services[0]?.reasons.length).toBeGreaterThan(0);
  });

  test("rejects malformed customer intelligence provenance and scope", () => {
    expect(() =>
      validateCustomerIntelligenceResponse({
        ...validCustomerIntelligence(),
        customerAddress: "0x1111111111111111111111111111111111111111",
      }),
    ).toThrow();

    expect(() =>
      validateCustomerIntelligenceResponse({
        ...validCustomerIntelligence(),
        x402Services: [
          {
            ...validCustomerIntelligence().x402Services[0],
            provenance: "derived_insight",
            reasons: [],
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      validateCustomerIntelligenceResponse({
        ...validCustomerIntelligence(),
        sourceCoverage: [{ source: "portfolio", status: "unavailable" }],
      }),
    ).toThrow();
  });

  test("accepts Zerion portfolio source provenance without raw provider payload", () => {
    const parsed = validatePortfolioSourceResult({
      summary: {
        totalValueUsd: "1234.56",
        tokenCount: 2,
        chains: ["base", "ethereum"],
      },
      positions: [
        {
          protocol: "Aave V3",
          positionType: "lending",
          valueUsd: "120.5",
          network: "base",
          reasons: [{ provenance: "onchain_fact", label: "Zerion position fact" }],
        },
      ],
      sourceCoverage: {
        source: "portfolio",
        status: "available",
        provenance: {
          sourceKind: "zerion",
          sourceName: "Zerion Portfolio API",
          fetchedAt: "2026-04-29T00:00:00Z",
        },
      },
    });

    expect(parsed.sourceCoverage.provenance?.sourceKind).toBe("zerion");
    expect(parsed.positions?.[0]?.protocol).toBe("Aave V3");
  });

  test("rejects raw Zerion payload and secret-like fields in portfolio source result", () => {
    expect(() =>
      validatePortfolioSourceResult({
        summary: { totalValueUsd: "1", tokenCount: 1 },
        positions: [],
        sourceCoverage: { source: "portfolio", status: "available" },
        raw: { data: [] },
      }),
    ).toThrow();

    expect(() =>
      validatePortfolioSourceResult({
        summary: { totalValueUsd: "1", tokenCount: 1 },
        positions: [],
        sourceCoverage: { source: "portfolio", status: "available" },
        apiKey: "secret",
      }),
    ).toThrow();

    expect(() =>
      validatePortfolioSourceResult({
        summary: { totalValueUsd: "1", tokenCount: 1 },
        positions: [],
        sourceCoverage: {
          source: "portfolio",
          status: "available",
          provenance: {
            sourceKind: "zerion",
            sourceName: "Zerion Portfolio API",
            raw: { authorization: "Basic secret" },
          },
        },
      }),
    ).toThrow();
  });

  test("accepts a valid normalized CDP resource", () => {
    const fixture = readFixture<unknown>("cdp-resource-valid.json");
    const parsed = validateCdpResource(fixture);
    expect(parsed.resourceId).toBe("resource-1");
    expect(parsed.paymentOptions).toHaveLength(2);
    expect(parsed.paymentOptions[0]?.quality?.expectedTransactionCount).toBe(12);
  });

  test("accepts a valid bitquery aggregate and rejects malformed data", () => {
    expect(
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: 2,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toMatchObject({
      transactionCount: 2,
      totalVolumeAtomic: "9001",
    });

    expect(() =>
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: -1,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toThrow();
  });

  test("accepts a valid provider catalog response and validates counts", () => {
    const valid = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      generatedFrom: "analytics-data-store:service-read-model-generation",
      providers: [
        {
          providerId: "coingecko--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
          name: "CoinGecko x402",
          serviceId: "coingecko",
          serviceName: "CoinGecko x402",
          network: "base",
          asset: "USDC",
          payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
          transactionCount: 10,
          uniqueSenderCount: 4,
          totalVolumeAtomic: "100000",
          endpointCount: 1,
          resourceCount: 1,
          mappingPattern: "one_payto_one_endpoint",
          endpointAttributionStatus: "direct_payto_endpoint",
          attributionConfidence: 0.9,
          hasCustomerFacts: true,
          customerFactCount: 2,
          provenance: "derived_insight",
          provenanceByField: { payTo: "onchain_fact", name: "derived_insight" },
          reasons: [{ provenance: "derived_insight", label: "provider catalog row" }],
        },
      ],
      providerCount: 1,
      provenance: "derived_insight",
      provenanceByField: { providers: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "provider catalog" }],
    };

    expect(validateProviderCatalogResponse(valid).providers[0]?.payTo).toBe(
      "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    );
    expect(() => validateProviderCatalogResponse({ ...valid, providerCount: 2 })).toThrow();
  });

  test("rejects invalid EVM address in Phase B customer list", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "not-an-address",
            label: null,
            observationCount: 1,
            spendAtomic: "100",
            providerCount: 1,
            activityGrowth: 0,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("rejects invalid CDP resource fixture", () => {
    const fixture = readFixture<unknown>("cdp-resource-invalid.json");
    expect(() => validateCdpResource(fixture)).toThrow();
  });

  test("validates a market snapshot fixture and rejects invalid snapshot", () => {
    const valid = readFixture<unknown>("market-snapshot-valid.json");
    const invalid = readFixture<unknown>("market-snapshot-invalid.json");

    expect(() => validateMarketSnapshot(valid)).not.toThrow();
    expect(() => validateMarketSnapshot(invalid)).toThrow();
  });

  test("rejects duplicate transaction and attribution txHash values", () => {
    const fact = {
      txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      payerWallet: "0x1111111111111111111111111111111111111111",
      payTo: "0x2222222222222222222222222222222222222222",
      amount: "10000",
      asset: "USDC",
      network: "base",
      timestamp: "2026-01-01T00:00:00Z",
      provenance: "onchain_fact",
    };

    expect(() =>
      validateRealTransactionFixture({
        generatedAt: "2026-01-01T00:00:00Z",
        providerId: "coingecko",
        metadata: {
          requestedLimit: 2,
          capturedCount: 2,
          timeWindow: { from: "2026-01-01T00:00:00Z" },
          source: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
        },
        facts: [fact, fact],
      }),
    ).toThrow();

    expect(() =>
      validateRealTransactionFixture({
        generatedAt: "2026-01-01T00:00:00Z",
        providerId: "coingecko",
        metadata: {
          requestedLimit: 2,
          capturedCount: 2,
          timeWindow: { from: "2026-01-01T00:00:00Z" },
          source: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
        },
        facts: [
          fact,
          {
            ...fact,
            txHash: fact.txHash.toUpperCase().replace("X", "x"),
          },
        ],
      }),
    ).toThrow();

    const attribution = {
      txHash: fact.txHash,
      endpointPath: "/api/v3/x402/simple/price",
      endpointName: "Simple price",
      workflowLabel: "price lookup",
      requestMethod: "GET",
      provenance: {
        endpointPath: "demo_label",
        endpointName: "demo_label",
        workflowLabel: "future_sdk_field",
        requestMethod: "demo_label",
      },
      reasons: [{ provenance: "demo_label", label: "mock attribution" }],
    };

    expect(() =>
      validateMockEndpointAttributionFixture({
        generatedAt: "2026-01-01T00:00:00Z",
        source: { sourceKind: "derived", sourceName: "mock-attribution" },
        items: [attribution, attribution],
      }),
    ).toThrow();

    expect(() =>
      validateMockEndpointAttributionFixture({
        generatedAt: "2026-01-01T00:00:00Z",
        source: { sourceKind: "derived", sourceName: "mock-attribution" },
        items: [
          attribution,
          {
            ...attribution,
            txHash: attribution.txHash.toUpperCase().replace("X", "x"),
          },
        ],
      }),
    ).toThrow();
  });

  test("accepts a valid Phase B customer list response", () => {
    expect(
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 2,
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0x3333333333333333333333333333333333333333",
        },
        provenance: "derived_insight",
        reasons: [
          {
            provenance: "demo_label",
            label: "top wallet list",
          },
        ],
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: "acme-wallet",
            observationCount: 42,
            spendAtomic: "1000000",
            providerCount: 3,
            lastSeenAt: "2026-01-01T00:00:00Z",
            activityGrowth: 0.32,
            upsellOpportunity: "high",
            provenance: "onchain_fact",
            evidence: [
              {
                provenance: "onchain_fact",
                label: "wallet spend projection",
                sourceFields: ["spendAtomic", "providerCount"],
              },
            ],
          },
          {
            address: "0x2222222222222222222222222222222222222222",
            label: null,
            observationCount: 8,
            spendAtomic: "0",
            providerCount: 1,
            activityGrowth: -0.2,
            upsellOpportunity: "low",
            provenance: "demo_label",
            evidence: [
              {
                provenance: "demo_label",
                label: "synthetic upsell score",
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      customerCount: 2,
      customers: [
        { address: "0x1111111111111111111111111111111111111111", spendAtomic: "1000000" },
        { address: "0x2222222222222222222222222222222222222222", spendAtomic: "0" },
      ],
    });
  });

  test("accepts non-EVM payTo in Phase B response scope", () => {
    const parsed = validatePhaseBCustomerListResponse({
      generatedAt: "2026-01-01T00:00:00Z",
      generatedFrom: "phase-b-demo",
      customerCount: 0,
      scope: {
        network: "solana:mainnet",
        asset: "USDC",
        payTo: "8xhngtrittcujmiadj6azw8grsifppwhnmv3hyqlhupl",
      },
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "scoped empty customer list" }],
      customers: [],
    });

    expect(parsed.scope?.payTo).toBe("8xhngtrittcujmiadj6azw8grsifppwhnmv3hyqlhupl");
  });

  test("rejects customer list responses with mismatched customerCount", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 2,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "12",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("accepts a valid Phase B profile and graph payload", () => {
    expect(
      validatePhaseBCustomerProfileResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        provenance: "onchain_fact",
        profile: {
          identity: {
            address: "0x1111111111111111111111111111111111111111",
            label: "acme-wallet",
            network: "base",
            asset: "USDC",
            role: "payer",
            identityBasis: "spend-profile",
            caveat: null,
            provenance: "onchain_fact",
          },
          metrics: {
            spendAtomic: "150000",
            activityGrowth: 0.12,
            freeTierProgress: 0.62,
            entryPointRatio: 0.4,
            upsellOpportunity: "medium",
            totalSpendAtomic: "150000",
            txCount: 24,
            uniqueProviderCount: 4,
            averageSpendAtomic: "6250",
            firstSeenAt: "2025-12-01T00:00:00Z",
            lastSeenAt: "2026-01-01T00:00:00Z",
            provenance: "onchain_fact",
          },
          providers: [
            {
              providerId: "provider-1",
              name: "Search Service",
              providerName: "Search Service",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0",
              spendAtomic: "50000",
              transactionCount: 10,
              firstSeenAt: "2025-12-05T00:00:00Z",
              lastSeenAt: "2026-01-01T00:00:00Z",
              confidence: 0.93,
              provenance: "onchain_fact",
            },
          ],
          timeline: [
            {
              at: "2026-01-01T00:00:00Z",
              eventType: "payment",
              description: "Observed payment for demo feature",
              amountAtomic: "1000",
              relatedProviderId: "provider-1",
              provenance: "derived_insight",
              reasons: [
                {
                  provenance: "onchain_fact",
                  label: "timeline from payment activity",
                  sourceFields: ["amountAtomic"],
                },
              ],
            },
          ],
          insights: [
            {
              key: "upsell-candidate",
              title: "Partnership opportunity",
              summary: "Recurring co-usage suggests shared integration point",
              confidence: 0.78,
              classification: "partnership",
              provenance: "derived_insight",
              reasons: [
                {
                  provenance: "onchain_fact",
                  label: "shared provider overlap",
                  sourceFields: ["providers", "spendAtomic"],
                },
              ],
            },
          ],
          provenance: "onchain_fact",
        },
      }),
    ).toMatchObject({
      profile: {
        identity: { address: "0x1111111111111111111111111111111111111111" },
      },
    });

    expect(
      validatePhaseBWalletUsageGraphResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        provenance: "onchain_fact",
        graph: {
          generatedFrom: "phase-b-demo",
          payerWalletLanguage: "payer wallets that also use this provider",
          identityFieldsExcluded: ["providerId", "address"],
          confidence: 0.84,
          reasons: [
            {
              provenance: "onchain_fact",
              label: "co-usage graph projection",
            },
          ],
          provenance: "onchain_fact",
          providerWallets: [
            {
              providerId: "provider-1",
              providerName: "Provider 1",
              name: "Provider 1",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              confidence: 0.9,
              firstSeenAt: "2025-11-01T00:00:00Z",
              lastSeenAt: "2026-01-01T00:00:00Z",
              provenance: "onchain_fact",
              payerWallets: [
                {
                  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  label: "payer-wallet-a",
                  sharedSpendAtomic: "78000",
                  sharedTransactionCount: 4,
                  overlapProviderCount: 2,
                  confidence: 0.88,
                  firstSeenAt: "2025-11-05T00:00:00Z",
                  lastSeenAt: "2026-01-01T00:00:00Z",
                  provenance: "onchain_fact",
                  observations: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      sharedSpendAtomic: "125000",
                      sharedTransactionCount: 7,
                      overlapProviderCount: 3,
                      confidence: 0.93,
                      firstSeenAt: "2025-12-10T00:00:00Z",
                      lastSeenAt: "2026-01-01T00:00:00Z",
                      provenance: "onchain_fact",
                    },
                  ],
                  otherServiceCandidates: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      coUsageCount: 3,
                      confidence: 0.76,
                      provenance: "derived_insight",
                      reasons: [
                        {
                          provenance: "onchain_fact",
                          label: "derived candidate from overlap",
                          sourceFields: ["observations"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({
      graph: {
        providerWallets: [
          {
            providerId: "provider-1",
            payerWallets: [
              {
                address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                observations: [{ providerId: "provider-2" }],
              },
            ],
          },
        ],
      },
    });
  });

  test("accepts a valid Phase B upsell explanation response", () => {
    const parsed = validatePhaseBCustomerUpsellExplanationResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "phase-b-llm-upsell-explanation-v1",
      address: "0xAC5A07C44A4F971667B3DF4B6551FB6991B2142D",
      sourceGeneratedAt: "2026-04-30T13:00:22Z",
      model: {
        provider: "bedrock",
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        region: "ap-northeast-1",
        promptVersion: "upsell-explanation-v1",
      },
      input: {
        signals: {
          spendAtomic: "26000",
          spendRank: 74,
          spendPercentile: 0.262626,
          customerCount: 100,
          observationCount: 9,
          providerCount: 7,
          txCount: 9,
          averageSpendAtomic: "2888",
          firstSeenAt: "2026-04-21T17:13:37Z",
          lastSeenAt: "2026-04-29T04:11:53Z",
          daysSinceLastSeen: 1,
          freeTierProgress: 0.9,
          activityGrowth: 0,
          entryPointRatio: 1,
          upsellOpportunity: "high",
          x402ServiceCount: 7,
        },
        flags: {
          isTopSpender: false,
          isRecentlyActive: true,
          isMultiProvider: true,
          hasHighTransactionCount: true,
          isNearFreeTierLimit: true,
          hasExternalX402Usage: true,
          isHighUpsellCandidate: true,
        },
        reasonCodes: [
          "recently_active",
          "multi_provider_usage",
          "high_transaction_count",
          "free_tier_near_limit",
          "external_x402_usage",
          "high_upsell_score",
        ],
        caveats: ["freeTierProgress is a PoC heuristic and not an actual commercial plan limit."],
      },
      explanation: {
        summary:
          "This wallet remains active and uses multiple providers, so it is a strong upsell candidate.",
        reasons: [
          "Recent activity was observed within the last 7 days.",
          "The wallet paid multiple providers and may be part of a broader workflow.",
        ],
        recommendedAction: "Offer a higher-frequency usage package or enterprise outreach.",
        caution:
          "freeTierProgress and entryPointRatio are PoC heuristics and should not be treated as contract-ready billing facts.",
      },
      provenance: "derived_insight",
      provenanceByField: {
        address: "onchain_fact",
        model: "derived_insight",
        input: "derived_insight",
        explanation: "derived_insight",
      },
      reasons: [{ provenance: "derived_insight", label: "llm explanation from upsell metrics" }],
    });

    expect(parsed.address).toBe("0xac5a07c44a4f971667b3df4b6551fb6991b2142d");
    expect(parsed.explanation.reasons.length).toBeGreaterThan(0);
  });

  test("rejects malformed Phase B payloads", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "123",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "bad_provenance",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "12.34",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("rejects invalid derived reasons and graph confidence bounds", () => {
    expect(() =>
      validatePhaseBCustomerProfileResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        provenance: "onchain_fact",
        profile: {
          identity: {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            network: "base",
            asset: "USDC",
            role: "payer",
            identityBasis: "spend-profile",
            caveat: null,
            provenance: "derived_insight",
          },
          metrics: {
            spendAtomic: "150000",
            activityGrowth: 0.12,
            freeTierProgress: 0.5,
            entryPointRatio: 0.4,
            upsellOpportunity: "medium",
            txCount: 24,
            uniqueProviderCount: 4,
            provenance: "onchain_fact",
          },
          providers: [],
          timeline: [],
          insights: [],
          provenance: "onchain_fact",
        },
      }),
    ).toThrow();

    expect(() =>
      validatePhaseBWalletUsageGraphResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        provenance: "onchain_fact",
        graph: {
          generatedFrom: "phase-b-demo",
          payerWalletLanguage: "payer wallets that also use this provider",
          identityFieldsExcluded: ["providerId", "address"],
          confidence: 1.2,
          reasons: [
            {
              provenance: "onchain_fact",
              label: "out-of-range confidence",
            },
          ],
          provenance: "onchain_fact",
          providerWallets: [
            {
              providerId: "provider-1",
              providerName: "Provider 1",
              name: "Provider 1",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              confidence: 0.9,
              provenance: "onchain_fact",
              payerWallets: [
                {
                  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  label: null,
                  sharedSpendAtomic: "78000",
                  sharedTransactionCount: 4,
                  overlapProviderCount: 2,
                  confidence: 0.88,
                  firstSeenAt: "2025-11-05T00:00:00Z",
                  lastSeenAt: "2026-01-01T00:00:00Z",
                  provenance: "onchain_fact",
                  observations: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      sharedSpendAtomic: "125000",
                      sharedTransactionCount: 7,
                      overlapProviderCount: 3,
                      confidence: 1.2,
                      firstSeenAt: "2025-12-10T00:00:00Z",
                      lastSeenAt: "2026-01-01T00:00:00Z",
                      provenance: "onchain_fact",
                    },
                  ],
                  otherServiceCandidates: [],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
  });
});

describe("PaymentRecipientAddressSchema", () => {
  test("accepts EVM hex (lowercased)", () => {
    expect(PaymentRecipientAddressSchema.parse("0xAC5A07C44A4F971667B3DF4B6551FB6991B2142D")).toBe(
      "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
    );
  });

  test("accepts Solana base58 preserving case", () => {
    const solana = "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP";
    expect(PaymentRecipientAddressSchema.parse(solana)).toBe(solana);
  });

  test("accepts SPL token-prefixed identifier", () => {
    const spl = "SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    expect(PaymentRecipientAddressSchema.parse(spl)).toBe(spl);
  });

  test("accepts ERC20 token-prefixed identifier (lowercases the hex part)", () => {
    expect(
      PaymentRecipientAddressSchema.parse("ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
    ).toBe("ERC20:0x036cbd53842c5426634e7929541ec2318f3dcf7e");
  });

  test("rejects empty and obviously invalid strings", () => {
    expect(() => PaymentRecipientAddressSchema.parse("")).toThrow();
    expect(() => PaymentRecipientAddressSchema.parse("not-an-address!")).toThrow();
    expect(() => PaymentRecipientAddressSchema.parse("0xshort")).toThrow();
  });

  test("trims surrounding whitespace", () => {
    expect(
      PaymentRecipientAddressSchema.parse("  0xac5a07c44a4f971667b3df4b6551fb6991b2142d  "),
    ).toBe("0xac5a07c44a4f971667b3df4b6551fb6991b2142d");
  });
});

describe("provider catalog and profile metadata extensions", () => {
  test("ProviderCatalogResponse accepts atlas-style metadata fields", () => {
    expect(
      validateProviderCatalogResponse({
        generatedAt: "2026-05-01T00:00:00Z",
        generatedFrom: "pay-skills-atlas",
        providerCount: 1,
        provenance: "derived_insight",
        provenanceByField: { providers: "derived_insight" },
        reasons: [{ provenance: "derived_insight", label: "pay-skills atlas snapshot" }],
        providers: [
          {
            providerId:
              "agentmail/email::solana::USDC::7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw",
            name: "AgentMail",
            serviceId: "agentmail/email",
            serviceName: "AgentMail",
            network: "solana",
            asset: "USDC",
            payTo: "7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw",
            transactionCount: 0,
            uniqueSenderCount: 0,
            totalVolumeAtomic: "0",
            endpointCount: 1,
            resourceCount: 1,
            mappingPattern: "one_payto_many_endpoints",
            endpointAttributionStatus: "bundled_payto_unknown_endpoint",
            attributionConfidence: 0.35,
            hasCustomerFacts: false,
            customerFactCount: 0,
            title: "AgentMail",
            description: "Create and operate dedicated email inboxes for AI agents.",
            useCase: "Use for giving agents their own email address.",
            category: "messaging",
            serviceUrl: "https://x402.api.agentmail.to",
            protocol: "x402",
            chain: "solana",
            assetSymbol: "USDC",
            priceRangeUsd: { min: 0, max: 10 },
            provenance: "derived_insight",
            provenanceByField: { description: "derived_insight" },
            reasons: [{ provenance: "derived_insight", label: "pay-skills atlas" }],
          },
        ],
      }),
    ).toMatchObject({ providers: [{ description: expect.any(String), chain: "solana" }] });
  });

  test("PhaseBWalletUsageGraph accepts solana payToWallet", () => {
    const solana = "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP";
    const payerSolana = "8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm";
    expect(
      validatePhaseBWalletUsageGraphResponse({
        generatedAt: "2026-05-01T00:00:00Z",
        provenance: "onchain_fact",
        graph: {
          generatedFrom: "pay-skills-atlas",
          payerWalletLanguage: "payer wallets that also use this provider",
          identityFieldsExcluded: ["providerId", "address"],
          confidence: 0.84,
          reasons: [{ provenance: "onchain_fact", label: "atlas payTo" }],
          provenance: "onchain_fact",
          providerWallets: [
            {
              providerId: "agentmail/email::solana::USDC::" + solana,
              providerName: "AgentMail",
              name: "AgentMail",
              payToWallet: solana,
              confidence: 0.9,
              provenance: "onchain_fact",
              payerWallets: [
                {
                  address: payerSolana,
                  label: null,
                  sharedSpendAtomic: "1000",
                  sharedTransactionCount: 1,
                  overlapProviderCount: 1,
                  confidence: 0.7,
                  firstSeenAt: "2026-04-01T00:00:00Z",
                  lastSeenAt: "2026-04-02T00:00:00Z",
                  provenance: "onchain_fact",
                  observations: [
                    {
                      providerId: "agentmail/email::solana::USDC::" + solana,
                      providerName: "AgentMail",
                      serviceName: "https://x402.api.agentmail.to",
                      sharedSpendAtomic: "1000",
                      sharedTransactionCount: 1,
                      overlapProviderCount: 1,
                      confidence: 0.7,
                      firstSeenAt: "2026-04-01T00:00:00Z",
                      lastSeenAt: "2026-04-02T00:00:00Z",
                      provenance: "onchain_fact",
                    },
                  ],
                  otherServiceCandidates: [],
                },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({
      graph: { providerWallets: [{ payToWallet: solana }] },
    });
  });

  test("PhaseBCustomerProfileProvider accepts metadata fields and solana payToWallet", () => {
    const solana = "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP";
    expect(
      validatePhaseBCustomerProfileResponse({
        generatedAt: "2026-05-01T00:00:00Z",
        generatedFrom: "pay-skills-atlas",
        scope: {
          providerId: "agentmail/email",
          network: "solana",
          asset: "USDC",
          payTo: solana,
        },
        provenance: "onchain_fact",
        profile: {
          identity: {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            network: "base",
            asset: "USDC",
            role: "payer",
            identityBasis: "spend-profile",
            caveat: null,
            provenance: "onchain_fact",
          },
          metrics: {
            spendAtomic: "1000",
            activityGrowth: 0.1,
            freeTierProgress: 0.5,
            entryPointRatio: 0.3,
            upsellOpportunity: "low",
            totalSpendAtomic: "1000",
            txCount: 1,
            uniqueProviderCount: 1,
            averageSpendAtomic: "1000",
            firstSeenAt: "2026-04-01T00:00:00Z",
            lastSeenAt: "2026-04-02T00:00:00Z",
            provenance: "onchain_fact",
          },
          providers: [
            {
              providerId: "agentmail/email::solana::USDC::" + solana,
              name: "AgentMail",
              providerName: "AgentMail",
              payToWallet: solana,
              spendAtomic: "1000",
              transactionCount: 1,
              confidence: 0.9,
              description: "AgentMail provides x402-paid email inboxes.",
              category: "messaging",
              serviceUrl: "https://x402.api.agentmail.to",
              protocol: "x402",
              chain: "solana",
              assetSymbol: "USDC",
              provenance: "onchain_fact",
            },
          ],
          timeline: [],
          insights: [],
          provenance: "onchain_fact",
        },
      }),
    ).toMatchObject({
      profile: {
        providers: [{ chain: "solana", payToWallet: solana, description: expect.any(String) }],
      },
    });
  });
});

describe("solana customer address support", () => {
  const SOLANA_CUSTOMER = "8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm";

  test("PhaseBCustomerListResponse accepts solana customer address", () => {
    const parsed = validatePhaseBCustomerListResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "pay-skills-atlas",
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "atlas synthetic customer" }],
      customers: [
        {
          address: SOLANA_CUSTOMER,
          label: null,
          observationCount: 1,
          spendAtomic: "1000",
          providerCount: 1,
          activityGrowth: 0,
          upsellOpportunity: "low",
          provenance: "derived_insight",
          provenanceByField: { address: "derived_insight" },
          reasons: [{ provenance: "derived_insight", label: "atlas synthetic customer" }],
        },
      ],
      customerCount: 1,
    });
    expect(parsed.customers[0]?.address).toBe(SOLANA_CUSTOMER);
  });

  test("PhaseBCustomerProfileResponse accepts solana identity address", () => {
    const solanaPayTo = "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP";
    const parsed = validatePhaseBCustomerProfileResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "pay-skills-atlas",
      scope: {
        providerId: "x402",
        network: "solana",
        asset: "USDC",
        payTo: solanaPayTo,
      },
      provenance: "onchain_fact",
      profile: {
        identity: {
          address: SOLANA_CUSTOMER,
          label: null,
          network: "solana",
          asset: "USDC",
          role: "payer",
          identityBasis: "atlas-synthetic",
          caveat: null,
          provenance: "derived_insight",
          reasons: [{ provenance: "derived_insight", label: "atlas synthetic identity" }],
        },
        metrics: {
          spendAtomic: "1000",
          activityGrowth: 0,
          freeTierProgress: 0.5,
          entryPointRatio: 0.3,
          upsellOpportunity: "low",
          totalSpendAtomic: "1000",
          txCount: 1,
          uniqueProviderCount: 1,
          averageSpendAtomic: "1000",
          firstSeenAt: "2026-04-01T00:00:00Z",
          lastSeenAt: "2026-04-02T00:00:00Z",
          provenance: "onchain_fact",
        },
        providers: [],
        timeline: [],
        insights: [],
        provenance: "derived_insight",
        reasons: [{ provenance: "derived_insight", label: "atlas synthetic profile" }],
      },
    });
    expect(parsed.profile.identity.address).toBe(SOLANA_CUSTOMER);
  });

  test("CustomerIntelligenceResponse accepts solana customerAddress and scope.address", () => {
    const parsed = validateCustomerIntelligenceResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "pay-skills-atlas",
      customerAddress: SOLANA_CUSTOMER,
      scope: {
        address: SOLANA_CUSTOMER,
        network: "solana",
        asset: "USDC",
        timeWindow: { from: "2026-01-01T00:00:00Z", to: "2026-04-29T23:59:59Z" },
      },
      x402Services: [],
      payToActivities: [],
      portfolioSummary: {
        totalValueUsd: null,
        tokenCount: 0,
        sourceCoverage: {
          source: "portfolio",
          status: "unavailable",
          unavailableReason: "atlas synthetic intelligence",
        },
        provenance: "derived_insight",
        provenanceByField: { sourceCoverage: "derived_insight" },
        reasons: [{ provenance: "derived_insight", label: "synthetic" }],
      },
      defiPositions: [],
      insights: [],
      sourceCoverage: [
        {
          source: "bitquery",
          status: "unavailable",
          unavailableReason: "atlas synthetic — no bitquery for non-EVM",
        },
        {
          source: "cdp_discovery",
          status: "available",
        },
        {
          source: "portfolio",
          status: "unavailable",
          unavailableReason: "atlas synthetic intelligence",
        },
      ],
      provenance: "derived_insight",
      provenanceByField: { customerAddress: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "atlas synthetic" }],
    });
    expect(parsed.customerAddress).toBe(SOLANA_CUSTOMER);
    expect(parsed.scope.address).toBe(SOLANA_CUSTOMER);
  });
});

describe("multi-chain customer aggregation fields", () => {
  test("PhaseBCustomerListItem accepts chains[]/assets[]/spendByAsset", () => {
    const parsed = validatePhaseBCustomerListResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "pay-skills-atlas-aggregated",
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "service-aggregated customer" }],
      customers: [
        {
          address: "0xffecfcd0e9888a738a64d9854abfc22ef3a6c717",
          label: null,
          observationCount: 12,
          spendAtomic: "1500000",
          providerCount: 1,
          activityGrowth: 0,
          upsellOpportunity: "medium",
          chains: ["base", "solana"],
          assets: ["USDC", "USDT"],
          spendByAsset: { USDC: "1000000", USDT: "500000" },
          provenance: "derived_insight",
          reasons: [{ provenance: "derived_insight", label: "service-aggregated" }],
        },
      ],
      customerCount: 1,
    });
    expect(parsed.customers[0]?.chains).toEqual(["base", "solana"]);
    expect(parsed.customers[0]?.assets).toEqual(["USDC", "USDT"]);
    expect(parsed.customers[0]?.spendByAsset?.USDC).toBe("1000000");
  });

  test("legacy customers (without chains[]) still validate", () => {
    const parsed = validatePhaseBCustomerListResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "phase-b-demo",
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "legacy" }],
      customers: [
        {
          address: "0xffecfcd0e9888a738a64d9854abfc22ef3a6c717",
          label: null,
          observationCount: 1,
          spendAtomic: "1000",
          providerCount: 1,
          activityGrowth: 0,
          upsellOpportunity: "low",
          provenance: "derived_insight",
          reasons: [{ provenance: "derived_insight", label: "legacy" }],
        },
      ],
      customerCount: 1,
    });
    expect(parsed.customers[0]?.chains).toBeUndefined();
  });

  test("PhaseBCustomerListItem accepts tags[] (e.g. Pay.sh)", () => {
    const parsed = validatePhaseBCustomerListResponse({
      generatedAt: "2026-05-01T00:00:00Z",
      generatedFrom: "pay-skills-atlas-aggregated",
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "tagged customer" }],
      customers: [
        {
          address: "8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm",
          label: null,
          observationCount: 1,
          spendAtomic: "1000",
          providerCount: 1,
          activityGrowth: 0,
          upsellOpportunity: "low",
          tags: ["Pay.sh"],
          provenance: "derived_insight",
          reasons: [{ provenance: "derived_insight", label: "tagged" }],
        },
      ],
      customerCount: 1,
    });
    expect(parsed.customers[0]?.tags).toEqual(["Pay.sh"]);
  });
});
