import { describe, expect, test } from "bun:test";
import { validateCdpResource } from "contracts";
import {
  aggregatePayToActivities,
  buildCustomerIntelligence,
  classifyDefiActivity,
  matchPayToToPaymentOptions,
  scoreServiceCandidates,
} from "../src/customer";

const scope = {
  address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
  network: "base",
  asset: "USDC",
  timeWindow: { from: "2026-01-01T00:00:00Z", to: "2026-04-29T23:59:59Z" },
};

const transfers = [
  {
    txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
    customerAddress: scope.address,
    payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    amountAtomic: "10000",
    network: "base",
    asset: "USDC",
    timestamp: "2026-04-29T04:11:53Z",
    provenance: "onchain_fact" as const,
  },
  {
    txHash: "0x7248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
    customerAddress: scope.address,
    payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    amountAtomic: "20000",
    network: "base",
    asset: "USDC",
    timestamp: "2026-04-28T04:11:53Z",
    provenance: "onchain_fact" as const,
  },
  {
    txHash: "0x8248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
    customerAddress: scope.address,
    payTo: "0x2222222222222222222222222222222222222222",
    amountAtomic: "999",
    network: "base",
    asset: "USDC",
    timestamp: "2025-12-31T23:59:59Z",
    provenance: "onchain_fact" as const,
  },
];

const resource = validateCdpResource({
  resourceId: "coingecko-x402",
  resource: "https://api.coingecko.com/api/v3/x402/simple/price",
  provider: "CoinGecko",
  service: "CoinGecko x402",
  paymentOptions: [
    {
      network: "base",
      asset: "USDC",
      amount: "10000",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      provenance: { sourceKind: "cdp_discovery", sourceName: "fixture" },
    },
  ],
  provenance: { sourceKind: "cdp_discovery", sourceName: "fixture" },
});

describe("customer intelligence builder", () => {
  test("aggregates payTo activities by customer, scope, asset, and window", () => {
    const activities = aggregatePayToActivities(transfers, scope);

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      transactionCount: 2,
      totalAmountAtomic: "30000",
      latestTimestamp: "2026-04-29T04:11:53Z",
    });
  });

  test("matches payTo activities to CDP payment options and scores candidates", () => {
    const activities = aggregatePayToActivities(transfers, scope);
    const matches = matchPayToToPaymentOptions(activities, [resource]);
    const candidates = scoreServiceCandidates(matches);

    expect(matches[0]?.resources[0]?.resourceId).toBe("coingecko-x402");
    expect(candidates[0]).toMatchObject({
      providerName: "CoinGecko",
      serviceName: "CoinGecko x402",
      provenance: "derived_insight",
    });
    expect(candidates[0]?.confidence).toBeGreaterThan(0.6);
    expect(candidates[0]?.reasons.length).toBeGreaterThan(0);
  });

  test("emits one service candidate per CDP resource sharing the same payTo", () => {
    const secondResource = validateCdpResource({
      ...resource,
      resourceId: "coingecko-x402-pools",
      resource: "https://api.coingecko.com/api/v3/x402/onchain/search/pools",
      service: "CoinGecko pools",
    });
    const activities = aggregatePayToActivities(transfers, scope);
    const candidates = scoreServiceCandidates(
      matchPayToToPaymentOptions(activities, [resource, secondResource]),
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.candidateId)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("coingecko-x402::"),
        expect.stringContaining("coingecko-x402-pools::"),
      ]),
    );
  });

  test("classifies unavailable portfolio source without live calls", () => {
    const result = classifyDefiActivity({
      sourceCoverage: {
        source: "portfolio",
        status: "unavailable",
        unavailableReason: "portfolio source not configured",
      },
    });

    expect(result.isDefiActive).toBe(false);
    expect(result.portfolioSummary.sourceCoverage.unavailableReason).toContain("not configured");
  });

  test("classifies available Zerion portfolio positions as DeFi active", () => {
    const result = classifyDefiActivity({
      summary: { totalValueUsd: "1234.56", tokenCount: 2, chains: ["base", "ethereum"] },
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
        provenance: { sourceKind: "zerion", sourceName: "Zerion Portfolio API" },
      },
    });

    expect(result.isDefiActive).toBe(true);
    expect(result.portfolioSummary).toMatchObject({ totalValueUsd: "1234.56", tokenCount: 2 });
    expect(result.portfolioSummary.reasons?.[0]?.label).toContain("wallet-wide chains");
    expect(result.defiPositions[0]).toMatchObject({
      protocol: "Aave V3",
      positionType: "lending",
      provenance: "onchain_fact",
    });
  });

  test("does not classify unavailable Zerion coverage as DeFi inactive fact", () => {
    const result = classifyDefiActivity({
      sourceCoverage: {
        source: "portfolio",
        status: "unavailable",
        unavailableReason: "Zerion request failed: 429",
        provenance: { sourceKind: "zerion", sourceName: "Zerion Portfolio API" },
      },
    });

    expect(result.isDefiActive).toBe(false);
    expect(result.portfolioSummary.sourceCoverage.status).toBe("unavailable");
    expect(result.portfolioSummary.reasons?.[0]?.label).toContain("429");
  });

  test("builds a schema-valid customer intelligence projection", () => {
    const response = buildCustomerIntelligence({
      scope,
      transfers,
      resources: [resource],
      generatedAt: "2026-04-29T00:00:00Z",
      portfolio: {
        sourceCoverage: {
          source: "portfolio",
          status: "unavailable",
          unavailableReason: "portfolio source not captured",
        },
      },
    });

    expect(response.customerAddress).toBe(scope.address);
    expect(response.payToActivities).toHaveLength(1);
    expect(response.x402Services[0]?.evidence.length).toBeGreaterThan(0);
    expect(response.insights[0]?.reasons.length).toBeGreaterThan(0);
  });

  test("builds DeFi active insight from successful portfolio positions", () => {
    const response = buildCustomerIntelligence({
      scope,
      transfers,
      resources: [resource],
      generatedAt: "2026-04-29T00:00:00Z",
      portfolio: {
        summary: { totalValueUsd: "1234.56", tokenCount: 1, chains: ["base"] },
        positions: [
          {
            protocol: "Aave V3",
            positionType: "lending",
            valueUsd: "120.5",
            network: "base",
            evidence: [{ provenance: "onchain_fact", label: "Zerion portfolio position" }],
          },
        ],
        sourceCoverage: {
          source: "portfolio",
          status: "available",
          provenance: { sourceKind: "zerion", sourceName: "Zerion Portfolio API" },
        },
      },
    });

    expect(response.defiPositions).toHaveLength(1);
    expect(response.insights[0]).toMatchObject({
      key: "defi-active",
      classification: "defi_activity",
    });
    expect(response.sourceCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "portfolio",
          status: "available",
          provenance: expect.objectContaining({ sourceKind: "zerion" }),
        }),
      ]),
    );
  });

  test("does not emit external activity insight for an empty capture", () => {
    const response = buildCustomerIntelligence({
      scope,
      transfers: [],
      resources: [resource],
      generatedAt: "2026-04-29T00:00:00Z",
      portfolio: {
        sourceCoverage: {
          source: "portfolio",
          status: "unavailable",
          unavailableReason: "portfolio source not captured",
        },
      },
    });

    expect(response.payToActivities).toHaveLength(0);
    expect(response.x402Services).toHaveLength(0);
    expect(response.insights).toHaveLength(0);
    expect(response.reasons[0]?.label).toContain("no outgoing transfers");
  });
});
