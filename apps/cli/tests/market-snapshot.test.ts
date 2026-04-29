import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseArgs, runMarketSnapshot } from "../scripts/analytics/market-snapshot";
import { renderMarketSnapshotMarkdown } from "../scripts/analytics/report";

const withFixtureTempDir = async (label: string, fn: (dir: string) => Promise<void> | void) => {
  const directory = path.join(process.cwd(), "tmp", `market-snapshot-${label}-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });

  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const buildCdpDiscoveryResponse = (network: string, asset: string, payTo: string) => ({
  data: {
    items: [
      {
        resourceId: "resource-1",
        resource: "https://orthogonal.example/search",
        paymentOptions: [
          {
            network,
            asset,
            amount: "1000",
            payTo,
          },
        ],
      },
    ],
    pageInfo: {
      hasNextPage: false,
      endCursor: null,
    },
  },
});

const buildBitqueryResponse = (payTo: string) => ({
  data: {
    aggregates: [
      {
        network: "base",
        asset: "USDC",
        payTo,
        txCount: 7,
        senderCount: 3,
        volume: "0.0021",
        latest: {
          txHash: "0xtx",
          sender: "0xsender",
          recipient: payTo,
          amountAtomic: "0.0021",
          blockTimestamp: new Date().toISOString(),
          blockNumber: "123",
        },
      },
    ],
  },
});

describe("market snapshot cli script", () => {
  test("parses supported command-line args", () => {
    const originalDefaultLimit = process.env.X402_MARKET_FETCH_LIMIT;
    process.env.X402_MARKET_FETCH_LIMIT = "25";

    try {
      const parsed = parseArgs([
        "--network",
        "base",
        "--asset",
        "USDC",
        "--limit",
        "3",
        "--json-output",
        "/tmp/market.json",
        "--markdown-output",
        "/tmp/summary.md",
        "--bitquery-chunk-size",
        "15",
      ]);

      expect(parsed.network).toBe("base");
      expect(parsed.asset).toBe("USDC");
      expect(parsed.limit).toBe(3);
      expect(parsed.jsonOutputPath).toBe("/tmp/market.json");
      expect(parsed.markdownOutputPath).toBe("/tmp/summary.md");
      expect(parsed.bitqueryChunkSize).toBe(15);
    } finally {
      if (originalDefaultLimit === undefined) {
        delete process.env.X402_MARKET_FETCH_LIMIT;
      } else {
        process.env.X402_MARKET_FETCH_LIMIT = originalDefaultLimit;
      }
    }
  });

  test("supports --all for unlimited CDP fetch", () => {
    const parsed = parseArgs(["--limit", "3", "--all"]);
    expect(parsed.limit).toBeNull();
  });

  test("uses default finite fetch limit when not provided", () => {
    const originalDefaultLimit = process.env.X402_MARKET_FETCH_LIMIT;
    delete process.env.X402_MARKET_FETCH_LIMIT;

    try {
      const parsed = parseArgs([]);
      expect(parsed.limit).toBe(100);
    } finally {
      if (originalDefaultLimit === undefined) {
        delete process.env.X402_MARKET_FETCH_LIMIT;
      } else {
        process.env.X402_MARKET_FETCH_LIMIT = originalDefaultLimit;
      }
    }
  });

  test("writes validated snapshot and summary outputs", async () =>
    withFixtureTempDir("writes", async (directory) => {
      const originalToken = process.env.BITQUERY_TOKEN;
      const network = "base";
      const asset = "USDC";
      const payTo = "0x1111111111111111111111111111111111111111";
      process.env.BITQUERY_TOKEN = "test-token";

      try {
        const result = await runMarketSnapshot({
          network,
          asset,
          limit: 1,
          jsonOutputPath: path.join(directory, "x402-market-snapshot.json"),
          markdownOutputPath: path.join(directory, "x402-market-summary.md"),
          cdpFetch: async () =>
            new Response(JSON.stringify(buildCdpDiscoveryResponse(network, asset, payTo))),
          bitqueryFetch: async () => new Response(JSON.stringify(buildBitqueryResponse(payTo))),
        });

        const snapshot = JSON.parse(fs.readFileSync(result.snapshotPath, "utf8"));
        const summaryText = fs.readFileSync(result.summaryPath, "utf8");

        expect(snapshot.scope).toMatchObject({ network, asset });
        expect(snapshot.summary.scopedPaymentOptions).toBe(1);
        expect(snapshot.resources).toHaveLength(1);
        expect(snapshot.resources[0].paymentOptions[0].inScope).toBe(true);
        expect(snapshot.resources[0].paymentOptions[0].bitqueryAggregate.transactionCount).toBe(7);
        expect(summaryText).toContain("# x402 market snapshot");
        expect(summaryText).toContain(`- payment options: ${snapshot.summary.totalPaymentOptions}`);
        expect(renderMarketSnapshotMarkdown(result.snapshot)).toBe(summaryText);
      } finally {
        if (originalToken === undefined) {
          delete process.env.BITQUERY_TOKEN;
        } else {
          process.env.BITQUERY_TOKEN = originalToken;
        }
      }
    }));

  test("fails before writing outputs when bitquery token is missing", async () =>
    withFixtureTempDir("missing-token", async (directory) => {
      const originalToken = process.env.BITQUERY_TOKEN;
      delete process.env.BITQUERY_TOKEN;

      const jsonOutputPath = path.join(directory, "snapshot.json");
      const markdownOutputPath = path.join(directory, "summary.md");

      try {
        await expect(
          runMarketSnapshot({
            limit: 1,
            jsonOutputPath,
            markdownOutputPath,
            cdpFetch: async () =>
              new Response(
                JSON.stringify(
                  buildCdpDiscoveryResponse(
                    "base",
                    "USDC",
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  ),
                ),
              ),
          }),
        ).rejects.toThrow("BITQUERY_TOKEN is required");

        expect(fs.existsSync(jsonOutputPath)).toBe(false);
        expect(fs.existsSync(markdownOutputPath)).toBe(false);
      } finally {
        if (originalToken === undefined) {
          delete process.env.BITQUERY_TOKEN;
        } else {
          process.env.BITQUERY_TOKEN = originalToken;
        }
      }
    }));
});
