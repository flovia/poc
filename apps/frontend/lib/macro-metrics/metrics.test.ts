import { describe, expect, test } from "bun:test";
import {
  MACRO_METRICS_DEMO_DATA,
  type MacroEndpointCategory,
  type MacroMetricsDemoData,
} from "./demo";
import { buildMacroMetrics, buildTrend } from "./metrics";

describe("buildMacroMetrics", () => {
  test("computes overview, repeat, ecosystem, endpoint, and source metrics from demo events", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

    expect(metrics.overview.paidActiveWallets).toBe(9);
    expect(metrics.overview.paidUsageTxCount).toBeGreaterThan(0);
    expect(metrics.overview.trend7d).toHaveLength(7);
    expect(metrics.overview.trend30d).toHaveLength(30);
    expect(metrics.repeatSummary.repeatWalletRate).toBeGreaterThan(0.7);
    expect(metrics.coUsageProviders[0].sharedSpendAtomic).not.toBe("0");
    expect(metrics.endpointUsage[0].txCount).toBeGreaterThan(0);
    expect(metrics.endpointFlows[0].occurrences).toBeGreaterThan(0);
    expect(metrics.routeSankey.flows[0]?.flow_count).toBeGreaterThan(0);
    expect(metrics.routeSankey.flows[0]?.paid_count).toBeGreaterThan(0);
    expect(metrics.routeSankey.flows[0]?.settled_usdc).toBeGreaterThan(0);
    expect(metrics.sourceRankings[0].spendAtomic).not.toBe("0");
    expect(metrics.recommendations.some((recommendation) => recommendation.proxy)).toBe(true);
  });

  test("handles empty datasets without network or live dependencies", () => {
    const empty: MacroMetricsDemoData = {
      generatedAt: MACRO_METRICS_DEMO_DATA.generatedAt,
      primaryProviderId: "northwind-price",
      services: MACRO_METRICS_DEMO_DATA.services,
      wallets: [],
      events: [],
      recommendations: [],
    };

    const metrics = buildMacroMetrics(empty);

    expect(metrics.overview.paidActiveWallets).toBe(0);
    expect(metrics.overview.totalSpendAtomic).toBe("0");
    expect(metrics.repeatSummary.repeatWalletRate).toBe(0);
    expect(metrics.spendConcentration.rankedWallets).toEqual([]);
    expect(metrics.endpointFlows).toEqual([]);
    expect(metrics.routeSankey.flows).toEqual([]);
  });

  test("keeps CoinGecko endpoints visible across all workflow steps", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);
    const expectedEndpoints = new Set<MacroEndpointCategory>([
      "pool_search",
      "trending_pools",
      "simple_price",
      "token_price",
      "token_detail",
    ]);

    for (const step of [0, 1, 2] as const) {
      const endpointsAtStep = new Set(
        metrics.endpointFlows.flatMap((flow) => [
          ...(flow.fromStep === step ? [flow.from] : []),
          ...(flow.toStep === step ? [flow.to] : []),
        ]),
      );

      expect(endpointsAtStep).toEqual(expectedEndpoints);
    }
  });

  test("builds an initial-query to intermediary to next-category sankey with route quality metrics", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

    expect(metrics.routeSankey.layer_labels).toEqual({
      left: "Initial query",
      mid: "Intermediary",
      right: "Downstream API",
    });
    expect(
      new Set(metrics.routeSankey.flows.map((flow) => flow.middle_label)).size,
    ).toBeGreaterThan(1);
    expect(metrics.routeSankey.flows.map((flow) => flow.middle_label)).toContain("Sponge");
    expect(metrics.routeSankey.flows.map((flow) => flow.middle_label)).toContain("Dexter");
    expect(metrics.routeSankey.flows.map((flow) => flow.middle_label)).toContain("agent.market");
    expect(
      metrics.routeSankey.flows.some(
        (flow) =>
          flow.success_rate > 0.9 &&
          flow.error_rate > 0 &&
          flow.p95_latency_ms > 100 &&
          flow.right_detail,
      ),
    ).toBe(true);
  });
});

describe("buildTrend", () => {
  test("fills missing days with zero values", () => {
    const generatedAt = 1_777_366_800;
    const trend = buildTrend([], 7, generatedAt);

    expect(trend).toHaveLength(7);
    expect(trend.every((point) => point.spendAtomic === "0" && point.txCount === 0)).toBe(true);
  });
});
