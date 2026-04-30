import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import type { BitqueryAggregate, CdpResource } from "contracts";
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

describe("service analytics read model generation", () => {
  test("builds read models with sample basis, coverage, attribution, and provenance", async () =>
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
      store.persistCdpResources(resources);
      store.persistPayToAggregates(aggregates);
      store.detectAndPersistMappingPatterns();
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
    }));
});
