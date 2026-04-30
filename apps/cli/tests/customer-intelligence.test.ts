import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  parseCustomerIntelligenceArgs,
  runCustomerIntelligenceCapture,
} from "../scripts/analytics/customer-intelligence";

const withTempDir = async (label: string, fn: (dir: string) => Promise<void> | void) => {
  const directory = path.join(
    process.cwd(),
    "tmp",
    `customer-intelligence-${label}-${randomUUID()}`,
  );
  fs.mkdirSync(directory, { recursive: true });
  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const address = "0xac5a07c44a4f971667b3df4b6551fb6991b2142d";
const payTo = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";

const cdpResponse = {
  data: {
    items: [
      {
        resourceId: "coingecko-x402",
        resource: "https://api.coingecko.com/api/v3/x402/simple/price",
        provider: "CoinGecko",
        service: "CoinGecko x402",
        paymentOptions: [{ network: "base", asset: "USDC", amount: "10000", payTo }],
      },
    ],
    pageInfo: { hasNextPage: false, endCursor: null },
  },
};

const bitqueryResponse = {
  data: {
    EVM: {
      transfers: [
        {
          Transfer: { Sender: address, Receiver: payTo, Amount: "0.01" },
          Block: { Time: "2026-04-29T04:11:53Z", Number: "299" },
          Transaction: {
            Hash: "0x6248880ec36541e6783ab756afdb427939f6209551b751cec5a2c97f71176d94",
            From: address,
          },
        },
      ],
    },
  },
};

const zerionPortfolioResponse = {
  data: {
    attributes: {
      total: { positions: 1234.56 },
      positions_distribution_by_chain: { base: 1234.56 },
    },
  },
};

const zerionPositionsResponse = {
  data: [
    {
      attributes: {
        name: "Aave V3 USDC",
        protocol: "Aave V3",
        protocol_module: "lending",
        position_type: "deposit",
        value: 120.5,
      },
      relationships: { chain: { data: { id: "base" } } },
    },
  ],
};

const emptyZerionPositionsResponse = { data: [] };

const zerionErrorResponse = { errors: [{ title: "rate limited", detail: "try later" }] };

describe("customer intelligence cli script", () => {
  test("parses capture arguments", () => {
    const parsed = parseCustomerIntelligenceArgs([
      "--address",
      address,
      "--network",
      "base",
      "--asset",
      "USDC",
      "--from",
      "2026-01-01T00:00:00Z",
      "--to",
      "2026-04-29T23:59:59Z",
      "--out",
      "/tmp/customer-intelligence.json",
      "--limit",
      "10",
      "--cdp-limit",
      "5",
      "--portfolio-source",
      "zerion",
      "--zerion-endpoint",
      "https://example.test/v1",
    ]);

    expect(parsed).toMatchObject({
      address,
      network: "base",
      asset: "USDC",
      out: "/tmp/customer-intelligence.json",
      limit: 10,
      cdpLimit: 5,
      portfolioSource: "zerion",
      zerionEndpoint: "https://example.test/v1",
    });
  });

  test("writes a validated customer intelligence read model", async () =>
    withTempDir("writes", async (directory) => {
      const output = path.join(directory, "customer.json");
      const result = await runCustomerIntelligenceCapture({
        address,
        network: "base",
        asset: "USDC",
        from: "2026-01-01T00:00:00Z",
        to: "2026-04-29T23:59:59Z",
        out: output,
        bitqueryToken: "test-token",
        limit: 10,
        cdpLimit: 1,
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async () => new Response(JSON.stringify(bitqueryResponse)),
      });

      const fixture = JSON.parse(fs.readFileSync(output, "utf8"));
      expect(result.response.customerAddress).toBe(address);
      expect(fixture.payToActivities[0]).toMatchObject({ payTo, totalAmountAtomic: "10000" });
      expect(fixture.x402Services[0]).toMatchObject({ providerName: "CoinGecko" });
    }));

  test("writes customer intelligence with mocked Zerion portfolio data", async () =>
    withTempDir("zerion", async (directory) => {
      const output = path.join(directory, "customer.json");
      const result = await runCustomerIntelligenceCapture({
        address,
        network: "base",
        asset: "USDC",
        from: "2026-01-01T00:00:00Z",
        to: "2026-04-29T23:59:59Z",
        out: output,
        bitqueryToken: "test-token",
        portfolioSource: "zerion",
        zerionApiKey: "test-zerion-key",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async () => new Response(JSON.stringify(bitqueryResponse)),
        zerionFetch: async (url) =>
          new Response(
            JSON.stringify(
              String(url).includes("/positions/")
                ? zerionPositionsResponse
                : zerionPortfolioResponse,
            ),
          ),
      });

      expect(result.response.portfolioSummary.sourceCoverage).toMatchObject({
        source: "portfolio",
        status: "available",
        provenance: { sourceKind: "zerion" },
      });
      expect(result.response.defiPositions[0]).toMatchObject({ protocol: "Aave V3" });
      expect(result.response.insights[0]).toMatchObject({ key: "defi-active" });
    }));

  test("writes available Zerion coverage for an empty positions result", async () =>
    withTempDir("zerion-empty", async (directory) => {
      const output = path.join(directory, "customer.json");
      const result = await runCustomerIntelligenceCapture({
        address,
        network: "base",
        asset: "USDC",
        from: "2026-01-01T00:00:00Z",
        to: "2026-04-29T23:59:59Z",
        out: output,
        bitqueryToken: "test-token",
        portfolioSource: "zerion",
        zerionApiKey: "test-zerion-key",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async () => new Response(JSON.stringify(bitqueryResponse)),
        zerionFetch: async (url) =>
          new Response(
            JSON.stringify(
              String(url).includes("/positions/")
                ? emptyZerionPositionsResponse
                : zerionPortfolioResponse,
            ),
          ),
      });

      expect(result.response.portfolioSummary.sourceCoverage.status).toBe("available");
      expect(result.response.defiPositions).toEqual([]);
      expect(result.response.insights[0]).toMatchObject({ key: "external-x402-activity" });
    }));

  test("writes partial Zerion coverage without fabricating positions", async () =>
    withTempDir("zerion-partial", async (directory) => {
      const output = path.join(directory, "customer.json");
      const result = await runCustomerIntelligenceCapture({
        address,
        network: "base",
        asset: "USDC",
        from: "2026-01-01T00:00:00Z",
        to: "2026-04-29T23:59:59Z",
        out: output,
        bitqueryToken: "test-token",
        portfolioSource: "zerion",
        zerionApiKey: "test-zerion-key",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async () => new Response(JSON.stringify(bitqueryResponse)),
        zerionFetch: async (url) =>
          String(url).includes("/positions/")
            ? new Response(JSON.stringify(zerionErrorResponse), { status: 429 })
            : new Response(JSON.stringify(zerionPortfolioResponse)),
      });

      expect(result.response.portfolioSummary.sourceCoverage.status).toBe("partial");
      expect(result.response.defiPositions).toEqual([]);
    }));

  test("writes unavailable Zerion coverage when all Zerion calls fail", async () =>
    withTempDir("zerion-unavailable", async (directory) => {
      const output = path.join(directory, "customer.json");
      const result = await runCustomerIntelligenceCapture({
        address,
        network: "base",
        asset: "USDC",
        from: "2026-01-01T00:00:00Z",
        to: "2026-04-29T23:59:59Z",
        out: output,
        bitqueryToken: "test-token",
        portfolioSource: "zerion",
        zerionApiKey: "test-zerion-key",
        cdpFetch: async () => new Response(JSON.stringify(cdpResponse)),
        bitqueryFetch: async () => new Response(JSON.stringify(bitqueryResponse)),
        zerionFetch: async () => new Response(JSON.stringify(zerionErrorResponse), { status: 500 }),
      });

      expect(result.response.portfolioSummary.sourceCoverage.status).toBe("unavailable");
      expect(result.response.defiPositions).toEqual([]);
    }));

  test("fails before writing outputs when Zerion is enabled without API key", async () =>
    withTempDir("missing-zerion", async (directory) => {
      const output = path.join(directory, "customer.json");
      let cdpCalls = 0;
      await expect(
        runCustomerIntelligenceCapture({
          address,
          network: "base",
          asset: "USDC",
          from: "2026-01-01T00:00:00Z",
          to: "2026-04-29T23:59:59Z",
          out: output,
          bitqueryToken: "test-token",
          portfolioSource: "zerion",
          zerionApiKey: "",
          cdpFetch: async () => {
            cdpCalls += 1;
            return new Response(JSON.stringify(cdpResponse));
          },
        }),
      ).rejects.toThrow("ZERION_API_KEY is required");

      expect(cdpCalls).toBe(0);
      expect(fs.existsSync(output)).toBe(false);
    }));

  test("fails before writing outputs when bitquery token is missing", async () =>
    withTempDir("missing-token", async (directory) => {
      const output = path.join(directory, "customer.json");
      let cdpCalls = 0;
      await expect(
        runCustomerIntelligenceCapture({
          address,
          network: "base",
          asset: "USDC",
          from: "2026-01-01T00:00:00Z",
          to: "2026-04-29T23:59:59Z",
          out: output,
          bitqueryToken: "",
          cdpFetch: async () => {
            cdpCalls += 1;
            return new Response(JSON.stringify(cdpResponse));
          },
        }),
      ).rejects.toThrow("BITQUERY_TOKEN is required");

      expect(cdpCalls).toBe(0);
      expect(fs.existsSync(output)).toBe(false);
    }));
});
