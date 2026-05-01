import { describe, expect, test } from "bun:test";
import { MACRO_METRICS_DEMO_DATA, type MacroMetricsDemoData } from "./demo";
import { buildMacroMetrics, buildTrend } from "./metrics";

describe("buildMacroMetrics", () => {
  test("computes overview, repeat, ecosystem, endpoint, and source metrics from demo events", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

    expect(metrics.overview.paidActiveWallets).toBe(9);
    expect(metrics.overview.paidUsageTxCount).toBeGreaterThan(0);
    expect(metrics.overview.trend7d).toHaveLength(7);
    expect(metrics.overview.trend30d).toHaveLength(30);
    expect(metrics.repeatSummary.repeatWalletRate).toBeGreaterThan(0.7);
    expect(metrics.otherServiceCandidates[0].sharedSpendAtomic).not.toBe("0");
    expect(metrics.endpointUsage[0].txCount).toBeGreaterThan(0);
    expect(metrics.endpointFlows[0].occurrences).toBeGreaterThan(0);
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
