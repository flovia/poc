import { describe, expect, test } from "bun:test";
import { createDuneSimBaseActivityCollector } from "../../src/collectors/dune-sim/base-activity.js";

describe("Dune Sim Base activity collector", () => {
  test("normalizes Base receive activity as validation transfers", async () => {
    const collector = createDuneSimBaseActivityCollector({
      apiKey: "dune-key",
      fetch: async () =>
        Response.json({
          activity: [
            {
              tx_hash: "0xdune",
              block_number: 123,
              block_time: "2026-05-11T00:00:00Z",
              from: "0xfrom",
              to: "0xto",
              token_address: "0xasset",
              value: "1000000",
              success: true,
              token_metadata: { symbol: "USDC", decimals: 6 },
            },
          ],
          next_offset: "next",
        }),
    });

    const result = await collector.collectTransfers({
      targets: [{ chain: "base", address: "0xto", assetAddress: "0xasset" }],
      window: { chain: "base", fromBlock: 1n, toBlock: "latest" },
      limit: 1,
    });

    expect(result.nextCursor).toEqual({ source: "dune-sim", chain: "base", nextOffset: "next" });
    expect(result.transfers).toMatchObject([
      {
        source: "dune-sim",
        chain: "base",
        idempotencyKey: "dune-sim:base:0xdune:0",
        transactionHash: "0xdune",
        blockNumber: 123n,
        direction: "incoming",
        amountBaseUnits: "1000000",
      },
    ]);
  });
});
