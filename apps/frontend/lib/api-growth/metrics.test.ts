import { describe, expect, test } from "bun:test";
import { MACRO_METRICS_DEMO_DATA, type MacroMetricsDemoData } from "@/lib/macro-metrics/demo";
import { buildApiGrowthIntelligence } from "./metrics";

describe("buildApiGrowthIntelligence", () => {
  test("derives growth channel, endpoint, use case, and recommendation signals", () => {
    const intelligence = buildApiGrowthIntelligence(MACRO_METRICS_DEMO_DATA);

    expect(intelligence.insightCards).toHaveLength(5);
    expect(intelligence.insightCards.map((card) => card.label)).toContain("Repeat wallet rate");
    expect(intelligence.insightCards[0].value).not.toBe(intelligence.insightCards[1].value);
    expect(intelligence.sourceMediumQuality.rows.map((row) => row.source)).toContain(
      "AgentKit MCP",
    );
    expect(intelligence.sourceMediumQuality.rows.map((row) => row.source)).toContain("Dexter");
    expect(
      intelligence.sourceMediumQuality.rows.find((row) => row.source === "Direct")?.wallets,
    ).toBe(100);
    expect(
      intelligence.sourceMediumQuality.rows.find((row) => row.source === "Sponge")?.wallets,
    ).toBe(80);
    expect(
      intelligence.sourceMediumQuality.rows.find((row) => row.source === "Dexter")?.wallets,
    ).toBe(60);
    expect(intelligence.sourceMediumQuality.rows[0].qualityScore).toBeGreaterThan(0);
    expect(
      intelligence.sourceMediumQuality.rows.find((row) => row.source === "AgentKit MCP")
        ?.endpointFrequency,
    ).toBeGreaterThan(50);
    expect(
      new Set(
        intelligence.sourceMediumQuality.rows.map(
          (row) => `${row.volumeShare.toFixed(2)}:${row.repeatQuality.toFixed(2)}`,
        ),
      ).size,
    ).toBe(intelligence.sourceMediumQuality.rows.length);
    expect(intelligence.endpointFrequency.rows[0].callsPerWallet).toBeGreaterThan(0);
    expect(intelligence.endpointFrequency.rows[0].paidFrequency).toBeGreaterThan(1_000);
    expect(intelligence.endpointFrequency.flow).toEqual([
      "pool_search",
      "token_price",
      "token_detail",
    ]);
    expect(intelligence.endpointFrequency.flows).toHaveLength(8);
    expect(intelligence.endpointFrequency.flows[0].occurrences).toBeGreaterThan(100);
    expect(intelligence.repeatWalletRate.rate).toBeGreaterThan(0);
    expect(intelligence.repeatWalletRate.repeatedWallets).toBeGreaterThan(0);
    expect(intelligence.repeatCohorts.length).toBeGreaterThan(0);
    expect(intelligence.repeatCohorts[0].week0).toBe(1);
    expect(intelligence.repeatCohorts[0].week2).toBeGreaterThan(0);
    expect(intelligence.endpointEntryCohorts[0].week1).toBeGreaterThan(0.7);
    expect(intelligence.endpointEntryCohorts[0].week3).toBeGreaterThan(0);
    expect(intelligence.repeatWalletSegments[0].segment).toBe("Agent-like workflow");
    expect(intelligence.otherServiceCandidates.length).toBeGreaterThan(0);
    expect(intelligence.otherServiceCandidates[0].owner).toBeTruthy();
    expect(intelligence.otherServiceCandidates[0].sharedWallets).toBeGreaterThan(0);
    expect(intelligence.inboundApiCohorts.map((cohort) => cohort.originApi)).toContain("The Graph");
    expect(intelligence.inboundApiCohorts[0].triedWallets).toBeGreaterThan(0);
    expect(intelligence.inboundApiCohorts[0].week2).toBeGreaterThan(0);
    expect(
      intelligence.useCaseFit.cards.some((card) => card.useCase === "Trading bot / agent workflow"),
    ).toBe(true);
    expect(intelligence.useCaseFit.cards[0].frequency).toBeGreaterThan(10);
    expect(intelligence.useCaseFit.cards[0].agentFit).toBeGreaterThan(0);
    expect(intelligence.recommendations).toHaveLength(4);
  });

  test("keeps all output sections stable for empty offline data", () => {
    const empty: MacroMetricsDemoData = {
      generatedAt: MACRO_METRICS_DEMO_DATA.generatedAt,
      primaryProviderId: "northwind-price",
      services: MACRO_METRICS_DEMO_DATA.services,
      wallets: [],
      events: [],
      recommendations: [],
    };

    const intelligence = buildApiGrowthIntelligence(empty);

    expect(intelligence.sourceMediumQuality.rows).toEqual([]);
    expect(intelligence.endpointFrequency.rows).toEqual([]);
    expect(intelligence.useCaseFit.cards).toEqual([]);
    expect(intelligence.repeatWalletRate).toEqual({
      rate: 0,
      repeatedWallets: 0,
      totalWallets: 0,
      note: "0 / 0 paid wallets used the API in multiple sessions",
    });
    expect(intelligence.repeatCohorts).toEqual([]);
    expect(intelligence.endpointEntryCohorts).toEqual([]);
    expect(intelligence.repeatWalletSegments).toEqual([]);
    expect(intelligence.otherServiceCandidates).toEqual([]);
    expect(intelligence.inboundApiCohorts).toEqual([]);
    expect(intelligence.insightCards.every((card) => card.value === "—")).toBe(true);
    expect(intelligence.recommendations).toHaveLength(4);
  });
});
