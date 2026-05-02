import { describe, expect, test } from "bun:test";
import { aggregateCoUsageProviders } from "../customers/co-usage-providers";
import { buildSdkWalletUsageGraph } from "./graph";

describe("buildSdkWalletUsageGraph", () => {
  test("provides enough provider and endpoint detail for the co-usage Sankey preview", () => {
    const graph = buildSdkWalletUsageGraph();
    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: graph.providerWallets[0]?.payTo,
    });

    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.some((row) => row.endpoints.length >= 2)).toBe(true);
    expect(rows.some((row) => row.endpoints.length >= 3)).toBe(true);
  });
});
