import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  cdpDiscoveryPageFingerprint,
  fetchCdpDiscoveryResources,
  fetchBitqueryBaseUsdcAggregates,
  makeCdpDiscoveryBody,
} from "../src/index";

const readFixture = <T>(name: string): T => {
  const fixtureRoot = path.resolve(import.meta.dir, "fixtures");
  const raw = fs.readFileSync(path.join(fixtureRoot, name), "utf8");
  return JSON.parse(raw) as T;
};

describe("CDP discovery source client", () => {
  test("fetches paginated resources and respects configurable limits", async () => {
    const page1 = readFixture<unknown>("cdp-page-1.json");
    const page2 = readFixture<unknown>("cdp-page-2.json");
    const calls: Array<Record<string, unknown>> = [];

    const result = await fetchCdpDiscoveryResources({
      limit: 2,
      fetchFn: async (url) => {
        const parsedUrl = new URL(String(url));
        calls.push(Object.fromEntries(parsedUrl.searchParams.entries()));

        if (parsedUrl.searchParams.get("cursor") == null) {
          return new Response(JSON.stringify(page1), { status: 200 });
        }

        return new Response(JSON.stringify(page2), { status: 200 });
      },
    });

    expect(result.fetchedCount).toBe(2);
    expect(result.pageCount).toBe(2);
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0]).toMatchObject({
      resourceId: "resource-1",
    });
    expect(result.resources[0]?.paymentOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          network: "base",
          asset: "USDC",
          payTo: "0x1111111111111111111111111111111111111111",
        }),
      ]),
    );
    expect(result.resources[1]).toMatchObject({
      resourceId: "resource-2",
    });
    expect(result.resources[1]?.paymentOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          network: "base",
          asset: "USDC",
        }),
      ]),
    );
    expect(result.resources.every((resource) => resource.provenance.sourceKind)).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ limit: "2", offset: "0", type: "http" });
  });

  test("respects requested limit mid-pagination", async () => {
    const page1 = readFixture<unknown>("cdp-page-1.json");
    const result = await fetchCdpDiscoveryResources({
      limit: 1,
      pageSize: 1,
      fetchFn: async () => new Response(JSON.stringify(page1), { status: 200 }),
    });

    expect(result.fetchedCount).toBe(1);
    expect(result.pageCount).toBe(1);
  });

  test("builds discovery body with cursor and limit", () => {
    expect(makeCdpDiscoveryBody("cursor-1", 25)).toEqual({
      query: "query_discovery_page",
      variables: {
        after: "cursor-1",
        first: 25,
      },
    });
  });
});

describe("bitquery source client", () => {
  test("builds aggregates for requested payTo list and fills zero for missing rows", async () => {
    const aggregateFixture = readFixture<unknown>("bitquery-aggregates.json");

    const result = await fetchBitqueryBaseUsdcAggregates({
      network: "base",
      asset: "USDC",
      token: "test-token",
      paymentOptions: [
        {
          network: "base",
          asset: "USDC",
          amount: "1000",
          payTo: "0x1111111111111111111111111111111111111111",
          scheme: "eip155",
          provenance: {
            sourceKind: "cdp_discovery",
            sourceName: "cdp-discovery",
            fetchedAt: new Date().toISOString(),
          },
          quality: {
            expectedTransactionCount: 1,
          },
        },
        {
          network: "base",
          asset: "USDC",
          amount: "2000",
          payTo: "0x3333333333333333333333333333333333333333",
          scheme: "eip155",
          provenance: {
            sourceKind: "cdp_discovery",
            sourceName: "cdp-discovery",
            fetchedAt: new Date().toISOString(),
          },
        },
      ],
      fetchFn: async () =>
        new Response(JSON.stringify(aggregateFixture), {
          status: 200,
        }),
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      network: "base",
      asset: "USDC",
      payTo: "0x1111111111111111111111111111111111111111",
      transactionCount: 12,
      uniqueSenderCount: 3,
      totalVolumeAtomic: "120000",
      latestTransfer: { txHash: "0xtx123" },
    });

    expect(result[1]).toMatchObject({
      payTo: "0x3333333333333333333333333333333333333333",
      transactionCount: 0,
      uniqueSenderCount: 0,
      totalVolumeAtomic: "0",
    });
  });

  test("throws a clear error when BITQUERY token is missing", async () => {
    const old = process.env.BITQUERY_TOKEN;
    delete process.env.BITQUERY_TOKEN;

    try {
      await expect(
        fetchBitqueryBaseUsdcAggregates({
          network: "base",
          asset: "USDC",
          token: "",
          paymentOptions: [],
        }),
      ).rejects.toThrow("BITQUERY_TOKEN is required");
    } finally {
      if (old !== undefined) process.env.BITQUERY_TOKEN = old;
    }
  });

  test("requires an explicit Bitquery token instead of reading process env", async () => {
    const old = process.env.BITQUERY_TOKEN;
    process.env.BITQUERY_TOKEN = "env-token";

    try {
      await expect(
        fetchBitqueryBaseUsdcAggregates({
          network: "base",
          asset: "USDC",
          token: "",
          paymentOptions: [],
        }),
      ).rejects.toThrow("BITQUERY_TOKEN is required");
    } finally {
      if (old === undefined) {
        delete process.env.BITQUERY_TOKEN;
      } else {
        process.env.BITQUERY_TOKEN = old;
      }
    }
  });
});
