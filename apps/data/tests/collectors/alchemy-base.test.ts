import { describe, expect, test } from "bun:test";
import { createAlchemyBaseTransfersCollector } from "../../src/collectors/alchemy/base-transfers.js";

describe("Alchemy Base transfers collector", () => {
  test("normalizes alchemy_getAssetTransfers rows", async () => {
    const requests: unknown[] = [];
    const collector = createAlchemyBaseTransfersCollector({
      apiKey: "test-key",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            transfers: [
              {
                uniqueId: "asset-transfer-id",
                hash: "0xtx",
                blockNum: "0x2a",
                from: "0xfrom",
                to: "0xto",
                asset: "USDC",
                rawContract: {
                  address: "0xasset",
                  value: "0x0f4240",
                },
                metadata: { blockTimestamp: "2026-05-11T00:00:00Z" },
              },
            ],
            pageKey: "next-page",
          },
        });
      },
    });

    const result = await collector.collectTransfers({
      targets: [{ chain: "base", address: "0xto", assetAddress: "0xasset" }],
      window: { chain: "base", fromBlock: 1n, toBlock: 42n },
      limit: 10,
    });

    expect(requests).toHaveLength(1);
    expect(result.nextCursor).toEqual({ source: "alchemy", chain: "base", pageKey: "next-page" });
    expect(result.transfers).toEqual([
      {
        source: "alchemy",
        chain: "base",
        queryTarget: { chain: "base", address: "0xto", assetAddress: "0xasset" },
        idempotencyKey: "alchemy:base:asset-transfer-id",
        transactionHash: "0xtx",
        blockNumber: 42n,
        timestamp: "2026-05-11T00:00:00Z",
        fromAddress: "0xfrom",
        toAddress: "0xto",
        direction: "incoming",
        assetAddress: "0xasset",
        assetSymbol: "USDC",
        amountBaseUnits: "1000000",
        rawPayload: {
          uniqueId: "asset-transfer-id",
          hash: "0xtx",
          blockNum: "0x2a",
          from: "0xfrom",
          to: "0xto",
          asset: "USDC",
          rawContract: { address: "0xasset", value: "0x0f4240" },
          metadata: { blockTimestamp: "2026-05-11T00:00:00Z" },
        },
      },
    ]);
  });
});
