import { describe, expect, test } from "bun:test";
import { createGoldRushBaseTransfersCollector } from "../../src/collectors/goldrush/base-transfers.js";

describe("GoldRush Base transfers collector", () => {
  test("normalizes Base ERC20 transfer rows as fallback transfers", async () => {
    const collector = createGoldRushBaseTransfersCollector({
      apiKey: "goldrush-key",
      fetch: async () =>
        Response.json({
          error: false,
          data: {
            items: [
              {
                tx_hash: "0xgold",
                block_height: 456,
                block_hash: "0xblock",
                block_signed_at: "2026-05-11T00:00:00Z",
                successful: true,
                transfers: [
                  {
                    from_address: "0xfrom",
                    to_address: "0xto",
                    contract_address: "0xasset",
                    contract_ticker_symbol: "USDC",
                    delta: "1000000",
                  },
                ],
              },
            ],
            pagination: { has_more: true, page_number: 0 },
          },
        }),
    });

    const result = await collector.collectTransfers({
      targets: [{ chain: "base", address: "0xto", assetAddress: "0xasset" }],
      window: { chain: "base", fromBlock: 1n, toBlock: 456n },
      limit: 1,
    });

    expect(result.nextCursor).toEqual({
      source: "goldrush",
      chain: "base",
      pageNumber: 1,
      hasMore: true,
    });
    expect(result.transfers).toMatchObject([
      {
        source: "goldrush",
        chain: "base",
        idempotencyKey: "goldrush:base:0xgold:0:0xasset",
        transactionHash: "0xgold",
        blockNumber: 456n,
        blockHash: "0xblock",
        direction: "incoming",
        amountBaseUnits: "1000000",
      },
    ]);
  });
});
