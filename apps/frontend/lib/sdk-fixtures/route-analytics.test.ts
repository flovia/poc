import { describe, expect, test } from "bun:test";
import { validateRouteAnalyticsSummaryResponse } from "contracts";
import { getFixtureRouteAnalyticsSummary } from "./route-analytics";

describe("getFixtureRouteAnalyticsSummary", () => {
  test("returns a contract-valid summary with demo rails", () => {
    const summary = getFixtureRouteAnalyticsSummary();
    expect(() => validateRouteAnalyticsSummaryResponse(summary)).not.toThrow();
    expect(summary.rails.map((rail) => rail.rail)).toEqual(["x402", "stripe_mpp", "hitpay_mpp"]);
    expect(summary.sampleRoutes.length).toBeGreaterThan(0);
    expect(summary.generatedFrom).toBe("frontend-fixture-route-analytics");
  });
});
