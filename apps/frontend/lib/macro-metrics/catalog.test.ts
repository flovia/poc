import { describe, expect, test } from "bun:test";
import { EXPECTED_CATALOG_METRIC_IDS, METRICS_CATALOG, buildMetricsCatalog } from "./catalog";

describe("metrics catalog", () => {
  test("includes every expected metric exactly once", () => {
    const ids = METRICS_CATALOG.map((item) => item.id);

    expect(ids.toSorted()).toEqual([...EXPECTED_CATALOG_METRIC_IDS].toSorted());
    expect(new Set(ids).size).toBe(EXPECTED_CATALOG_METRIC_IDS.length);
  });

  test("provides required metadata and demo previews for every item", () => {
    for (const item of METRICS_CATALOG) {
      expect(item.priority).toMatch(/^P[0-3]$/);
      expect(item.page.length).toBeGreaterThan(0);
      expect(item.status.length).toBeGreaterThan(0);
      expect(item.represents.length).toBeGreaterThan(0);
      expect(item.whyItMatters.length).toBeGreaterThan(0);
      expect(item.visualization.length).toBeGreaterThan(0);
      expect(item.preview.headline.length).toBeGreaterThan(0);
    }
  });

  test("covers all priorities and labels advanced metrics as proxy or future", () => {
    const catalog = buildMetricsCatalog();

    expect(catalog.summary.total).toBe(EXPECTED_CATALOG_METRIC_IDS.length);
    expect(catalog.summary.byPriority).toMatchObject({ P0: 16, P1: 10, P2: 5, P3: 2 });
    expect(catalog.summary.supported).toBeGreaterThan(0);
    expect(
      catalog.summary.demoProxy + catalog.summary.needsLiveData + catalog.summary.futureAnalytics,
    ).toBeGreaterThan(0);

    for (const item of METRICS_CATALOG.filter(
      (metric) => metric.priority === "P2" || metric.priority === "P3",
    )) {
      expect(["demo-proxy", "needs-live-data", "future-analytics", "supported"]).toContain(
        item.status,
      );
      if (item.status !== "supported") {
        expect(item.caveat?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
