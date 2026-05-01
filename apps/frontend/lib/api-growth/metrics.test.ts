import { describe, expect, test } from "bun:test";
import { MACRO_METRICS_DEMO_DATA, type MacroMetricsDemoData } from "@/lib/macro-metrics/demo";
import { buildApiGrowthIntelligence } from "./metrics";

describe("buildApiGrowthIntelligence", () => {
  test("derives growth channel, endpoint, use case, and recommendation signals", () => {
    const intelligence = buildApiGrowthIntelligence(MACRO_METRICS_DEMO_DATA);

    expect(intelligence.insightCards).toHaveLength(4);
    expect(intelligence.sourceMediumQuality.rows.map((row) => row.source)).toContain("Coinbase AgentKit MCP");
    expect(intelligence.sourceMediumQuality.rows.map((row) => row.source)).toContain("Dexter");
    expect(intelligence.sourceMediumQuality.rows.find((row) => row.source === "Direct")?.wallets).toBe(100);
    expect(intelligence.sourceMediumQuality.rows.find((row) => row.source === "Sponge")?.wallets).toBe(80);
    expect(intelligence.sourceMediumQuality.rows.find((row) => row.source === "Dexter")?.wallets).toBe(60);
    expect(intelligence.sourceMediumQuality.rows[0].qualityScore).toBeGreaterThan(0);
    expect(intelligence.sourceMediumQuality.rows.find((row) => row.source === "Coinbase AgentKit MCP")?.endpointFrequency).toBeGreaterThan(50);
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
    expect(intelligence.insightCards.every((card) => card.value === "—")).toBe(true);
    expect(intelligence.recommendations).toHaveLength(4);
  });
});
