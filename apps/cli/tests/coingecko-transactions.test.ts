import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { validateRealTransactionFixture } from "contracts";
import {
  buildMockAttributionFixture,
  parseArgs,
  runCoingeckoTransactionCapture,
} from "../scripts/analytics/capture-coingecko-transactions";

const withFixtureTempDir = async (label: string, fn: (dir: string) => Promise<void> | void) => {
  const directory = path.join(
    process.cwd(),
    "tmp",
    `coingecko-transactions-${label}-${randomUUID()}`,
  );
  fs.mkdirSync(directory, { recursive: true });

  try {
    await Promise.resolve(fn(directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const transferRow = (index: number) => ({
  Transfer: {
    Sender: `0x${String(index + 1).padStart(40, "1")}`,
    Receiver: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    Amount: "0.010000",
  },
  Block: {
    Time: `2026-01-0${index + 1}T00:00:00Z`,
    Number: `${100 + index}`,
  },
  Transaction: {
    Hash: `0x${String(index + 1).padStart(64, "a")}`,
    From: `0x${String(index + 1).padStart(40, "2")}`,
  },
});

describe("coingecko transaction capture script", () => {
  test("parses capture arguments", () => {
    const parsed = parseArgs([
      "--from",
      "2026-01-01T00:00:00Z",
      "--to",
      "2026-04-29T23:59:59Z",
      "--limit",
      "5000",
      "--page-size",
      "250",
      "--transactions-output",
      "/tmp/transactions.json",
      "--attribution-output",
      "/tmp/attribution.json",
    ]);

    expect(parsed.limit).toBe(5000);
    expect(parsed.pageSize).toBe(250);
    expect(parsed.timeWindow.from).toBe("2026-01-01T00:00:00.000Z");
    expect(parsed.transactionOutputPath).toBe("/tmp/transactions.json");
    expect(parsed.attributionOutputPath).toBe("/tmp/attribution.json");
  });

  test("writes transaction and mock attribution fixtures", async () =>
    withFixtureTempDir("writes", async (directory) => {
      const transactionOutputPath = path.join(directory, "coingecko-transactions.json");
      const attributionOutputPath = path.join(directory, "mock-attribution.json");
      const calls: Array<Record<string, unknown>> = [];

      const result = await runCoingeckoTransactionCapture({
        limit: 3,
        pageSize: 2,
        bitqueryToken: "test-token",
        transactionOutputPath,
        attributionOutputPath,
        now: () => new Date("2026-04-29T04:15:00Z"),
        bitqueryFetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as {
            variables: { limit: number; offset: number };
          };
          calls.push(body.variables);
          const rows = [transferRow(0), transferRow(1), transferRow(2)].slice(
            body.variables.offset,
            body.variables.offset + body.variables.limit,
          );
          return new Response(JSON.stringify({ data: { EVM: { transfers: rows } } }));
        },
      });

      const transactions = JSON.parse(fs.readFileSync(transactionOutputPath, "utf8"));
      const attribution = JSON.parse(fs.readFileSync(attributionOutputPath, "utf8"));

      expect(calls).toEqual([
        expect.objectContaining({ limit: 2, offset: 0 }),
        expect.objectContaining({ limit: 1, offset: 2 }),
      ]);
      expect(result.transactions.metadata.capturedCount).toBe(3);
      expect(transactions.facts).toHaveLength(3);
      expect(attribution.items).toHaveLength(3);
      expect(attribution.items[0]).toMatchObject({
        txHash: transactions.facts[0].txHash,
        endpointPath: "/api/v3/x402/onchain/search/pools",
        workflowLabel: "pool discovery",
      });
      expect(attribution.items[1].endpointPath).toContain("token_price");
    }));

  test("builds deterministic attribution for every transaction fact", () => {
    const transactions = validateRealTransactionFixture({
      generatedAt: "2026-04-29T04:15:00Z",
      providerId: "coingecko",
      metadata: {
        requestedLimit: 2,
        capturedCount: 2,
        timeWindow: { from: "2026-01-01T00:00:00Z" },
        source: { sourceKind: "bitquery", sourceName: "bitquery-graphql" },
      },
      facts: [transferRow(0), transferRow(1)].map((row) => ({
        txHash: row.Transaction.Hash,
        payerWallet: row.Transfer.Sender,
        payTo: row.Transfer.Receiver,
        amount: "10000",
        asset: "USDC",
        network: "base",
        timestamp: row.Block.Time,
        blockNumber: row.Block.Number,
        provenance: "onchain_fact",
      })),
    });

    const attribution = buildMockAttributionFixture(transactions);

    expect(attribution.items).toHaveLength(2);
    expect(attribution.items.map((item) => item.txHash)).toEqual(
      transactions.facts.map((fact) => fact.txHash),
    );
    expect(attribution.items.every((item) => item.reasons.length > 0)).toBe(true);
  });
});
