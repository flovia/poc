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
    ]);

    expect(parsed).toMatchObject({
      address,
      network: "base",
      asset: "USDC",
      out: "/tmp/customer-intelligence.json",
      limit: 10,
      cdpLimit: 5,
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
