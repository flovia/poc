import { describe, expect, test } from "bun:test";
import { validateCdpResource } from "contracts";
import fs from "node:fs";
import path from "node:path";
import {
  cdpDiscoveryPageFingerprint,
  fetchCdpDiscoveryResources,
  fetchBitqueryBaseUsdcAggregates,
  fetchOutgoingTransfersByCustomer,
  fetchPaymentTransfersByPayTo,
  fetchZerionPortfolio,
  findCdpResourcesByPaymentOption,
  makeCdpDiscoveryBody,
  normalizeZerionPortfolio,
  unavailablePortfolioSource,
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

  test("continues pagination when a page has only invalid resources", async () => {
    const validPage = {
      data: {
        items: [
          {
            resourceId: "resource-1",
            resource: "https://orthogonal.example/search",
            paymentOptions: [
              {
                network: "base",
                asset: "USDC",
                amount: "1000",
                payTo: "0x1111111111111111111111111111111111111111",
              },
            ],
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    };
    const calls: string[] = [];

    const result = await fetchCdpDiscoveryResources({
      limit: null,
      pageSize: 1,
      fetchFn: async (url) => {
        const parsedUrl = new URL(String(url));
        calls.push(parsedUrl.searchParams.get("offset") ?? "0");
        if (calls.length === 1) {
          return new Response(
            JSON.stringify({
              data: {
                items: [{ resourceId: "invalid", resource: "https://invalid.example" }],
                pageInfo: { hasNextPage: true, endCursor: "1" },
              },
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify(validPage), { status: 200 });
      },
    });

    expect(result.pageCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(result.resources.length).toBeGreaterThan(0);
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
      latestTransfer: {
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });

    expect(result[1]).toMatchObject({
      payTo: "0x3333333333333333333333333333333333333333",
      transactionCount: 0,
      uniqueSenderCount: 0,
      totalVolumeAtomic: "0",
    });
  });

  test("omits latest transfer metadata when Bitquery returns an invalid tx hash", async () => {
    const payTo = "0x1111111111111111111111111111111111111111";
    const result = await fetchBitqueryBaseUsdcAggregates({
      network: "base",
      asset: "USDC",
      token: "test-token",
      paymentOptions: [
        {
          network: "base",
          asset: "USDC",
          amount: "1000",
          payTo,
          provenance: { sourceKind: "cdp_discovery", sourceName: "cdp-discovery" },
        },
      ],
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              EVM: {
                byRecipient: [
                  {
                    Transfer: { Receiver: payTo },
                    txCount: 1,
                    uniqueSenders: 1,
                    volumeUSDC: "0.01",
                  },
                ],
                latestByRecipient: [
                  {
                    Transfer: { Receiver: payTo, Sender: "0xsender", Amount: "0.01" },
                    Transaction: { Hash: "not-a-tx-hash" },
                    Block: { Time: "2026-01-01T00:00:00Z", Number: "123" },
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
    });

    expect(result[0]).toMatchObject({
      payTo,
      transactionCount: 1,
      uniqueSenderCount: 1,
      totalVolumeAtomic: "10000",
    });
    expect(result[0]?.latestTransfer).toBeUndefined();
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

  test("parses paginated payment transfers by payTo", async () => {
    const pages = [
      readFixture<unknown>("bitquery-transfers-page-1.json"),
      readFixture<unknown>("bitquery-transfers-page-2.json"),
    ];
    const calls: Array<Record<string, unknown>> = [];

    const result = await fetchPaymentTransfersByPayTo({
      network: "base",
      asset: "USDC",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      token: "test-token",
      limit: 3,
      pageSize: 2,
      timeWindow: { from: "2026-04-01T00:00:00Z", to: "2026-04-29T23:59:59Z" },
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
        calls.push(body.variables);
        const page = pages[calls.length - 1] ?? { data: { EVM: { transfers: [] } } };
        return new Response(JSON.stringify(page), { status: 200 });
      },
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      txHash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
      sender: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      recipient: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      amountAtomic: "10000",
      blockTimestamp: "2026-04-29T04:11:53Z",
    });
    expect(result[2]?.amountAtomic).toBe("20000");
    expect(calls).toEqual([
      expect.objectContaining({ limit: 2, offset: 0 }),
      expect.objectContaining({ limit: 1, offset: 2 }),
    ]);
  });

  test("allows explicit transfer capture limits over 1000", async () => {
    const calls: Array<Record<string, unknown>> = [];
    await fetchPaymentTransfersByPayTo({
      network: "base",
      asset: "USDC",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      token: "test-token",
      limit: 1500,
      pageSize: 1500,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
        calls.push(body.variables);
        return new Response(JSON.stringify({ data: { EVM: { transfers: [] } } }), { status: 200 });
      },
    });

    expect(calls[0]).toMatchObject({ limit: 1500, offset: 0 });
  });

  test("rejects Bitquery transfer pages when every returned row is malformed", async () => {
    await expect(
      fetchPaymentTransfersByPayTo({
        network: "base",
        asset: "USDC",
        payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
        token: "test-token",
        limit: 1,
        fetchFn: async () =>
          new Response(
            JSON.stringify({
              data: {
                EVM: {
                  transfers: [
                    {
                      Transfer: {
                        Sender: "not-an-address",
                        Receiver: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
                        Amount: "0.01",
                      },
                      Block: { Time: "2026-04-29T04:11:53Z", Number: "299" },
                      Transaction: {
                        Hash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
                      },
                    },
                  ],
                },
              },
            }),
            { status: 200 },
          ),
      }),
    ).rejects.toThrow("Bitquery returned malformed transfer rows");
  });

  test("parses paginated outgoing transfers by customer", async () => {
    const pages = [
      readFixture<unknown>("bitquery-transfers-page-1.json"),
      readFixture<unknown>("bitquery-transfers-page-2.json"),
    ];
    const calls: Array<Record<string, unknown>> = [];

    const result = await fetchOutgoingTransfersByCustomer({
      network: "base",
      asset: "USDC",
      customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      token: "test-token",
      limit: 3,
      pageSize: 2,
      timeWindow: { from: "2026-04-01T00:00:00Z", to: "2026-04-29T23:59:59Z" },
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
        calls.push(body.variables);
        const page = pages[calls.length - 1] ?? { data: { EVM: { transfers: [] } } };
        return new Response(JSON.stringify(page), { status: 200 });
      },
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      network: "base",
      asset: "USDC",
      amountAtomic: "10000",
      provenance: "onchain_fact",
    });
    expect(calls).toEqual([
      expect.objectContaining({
        customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
        limit: 2,
        offset: 0,
      }),
      expect.objectContaining({
        customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
        limit: 1,
        offset: 2,
      }),
    ]);
  });

  test("rejects outgoing transfer rows whose sender does not match requested customer", async () => {
    const fixture = readFixture<Record<string, unknown>>("bitquery-transfers-page-1.json");
    const transfer = (
      ((fixture.data as Record<string, unknown>).EVM as Record<string, unknown>).transfers as Array<
        Record<string, unknown>
      >
    )[0];
    const transferFields = transfer.Transfer as Record<string, unknown>;
    transferFields.Sender = "0x9999999999999999999999999999999999999999";

    await expect(
      fetchOutgoingTransfersByCustomer({
        network: "base",
        asset: "USDC",
        customerAddress: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
        token: "test-token",
        limit: 1,
        fetchFn: async () => new Response(JSON.stringify(fixture), { status: 200 }),
      }),
    ).rejects.toThrow("sender does not match");
  });

  test("looks up CDP resources by payment option and represents unavailable portfolio source", () => {
    const resource = validateCdpResource({
      resourceId: "resource-1",
      resource: "https://example.com/x402",
      paymentOptions: [
        {
          network: "base",
          asset: "USDC",
          amount: "1000",
          payTo: "0x1111111111111111111111111111111111111111",
          provenance: { sourceKind: "cdp_discovery", sourceName: "fixture" },
        },
      ],
      provenance: { sourceKind: "cdp_discovery", sourceName: "fixture" },
    });

    const matches = findCdpResourcesByPaymentOption([resource], {
      network: "eip155:8453",
      asset: "0x833589fcD6edb6e08f4c7c32d4f71b54bda02913",
      payTo: "0x1111111111111111111111111111111111111111",
    });

    expect(matches).toHaveLength(1);
    expect(unavailablePortfolioSource("no MCP configured").sourceCoverage).toMatchObject({
      source: "portfolio",
      status: "unavailable",
      unavailableReason: "no MCP configured",
    });
  });
});

describe("Zerion portfolio source client", () => {
  test("normalizes portfolio summary and DeFi positions", () => {
    const portfolio = readFixture<unknown>("zerion-portfolio.json");
    const positions = readFixture<unknown>("zerion-positions.json");

    const result = normalizeZerionPortfolio(portfolio, positions);

    expect(result.sourceCoverage).toMatchObject({
      source: "portfolio",
      status: "available",
      provenance: { sourceKind: "zerion", sourceName: "Zerion Portfolio API" },
    });
    expect(result.summary).toMatchObject({
      totalValueUsd: "1234.56",
      tokenCount: 2,
      chains: ["base", "ethereum"],
    });
    expect(result.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ protocol: "Aave V3", positionType: "lending", network: "base" }),
        expect.objectContaining({ protocol: "Uniswap V3", positionType: "lp" }),
      ]),
    );
  });

  test("maps successful empty Zerion positions to available zero-position coverage", () => {
    const portfolio = readFixture<unknown>("zerion-portfolio.json");
    const positions = readFixture<unknown>("zerion-empty-positions.json");

    const result = normalizeZerionPortfolio(portfolio, positions);

    expect(result.sourceCoverage.status).toBe("available");
    expect(result.positions).toHaveLength(0);
    expect(result.summary?.tokenCount).toBe(0);
  });

  test("maps Zerion API errors to unavailable coverage without fabricated positions", () => {
    const error = readFixture<unknown>("zerion-error.json");
    const result = normalizeZerionPortfolio(error, error);

    expect(result.sourceCoverage).toMatchObject({
      source: "portfolio",
      status: "unavailable",
    });
    expect(result.sourceCoverage.unavailableReason).toContain("Rate Limit");
    expect(result.positions).toBeUndefined();
  });

  test("marks single-page Zerion positions capture as partial when more pages exist", () => {
    const portfolio = readFixture<unknown>("zerion-portfolio.json");
    const positions = {
      ...readFixture<Record<string, unknown>>("zerion-positions.json"),
      links: { next: "https://api.zerion.io/v1/wallets/0xabc/positions/?page=2" },
    };

    const result = normalizeZerionPortfolio(portfolio, positions);

    expect(result.sourceCoverage).toMatchObject({
      source: "portfolio",
      status: "partial",
      unavailableReason: "Zerion positions pagination not fully captured",
    });
  });

  test("fetches Zerion portfolio with explicit API key and injected fetch", async () => {
    const portfolio = readFixture<unknown>("zerion-portfolio.json");
    const positions = readFixture<unknown>("zerion-positions.json");
    const calls: Array<{ url: string; authorization: string | null }> = [];

    const result = await fetchZerionPortfolio({
      address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      apiKey: "test-key",
      fetchFn: async (url, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(url), authorization: headers.get("authorization") });
        return new Response(
          JSON.stringify(String(url).includes("/positions/") ? positions : portfolio),
        );
      },
    });

    expect(result.sourceCoverage.status).toBe("available");
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.authorization?.startsWith("Basic "))).toBe(true);
    expect(calls.map((call) => call.url).join("\n")).toContain(
      "filter%5Bpositions%5D=only_complex",
    );
    expect(calls.find((call) => call.url.includes("/portfolio"))?.url).not.toContain(
      "filter%5Bpositions%5D",
    );
  });

  test("maps Zerion network errors to unavailable coverage without throwing", async () => {
    const result = await fetchZerionPortfolio({
      address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
      apiKey: "test-key",
      fetchFn: async () => {
        throw new Error("timeout");
      },
    });

    expect(result.sourceCoverage).toMatchObject({
      source: "portfolio",
      status: "unavailable",
    });
    expect(result.positions).toBeUndefined();
  });

  test("requires explicit Zerion API key", async () => {
    await expect(
      fetchZerionPortfolio({
        address: "0xac5a07c44a4f971667b3df4b6551fb6991b2142d",
        apiKey: "",
      }),
    ).rejects.toThrow("ZERION_API_KEY is required");
  });
});
