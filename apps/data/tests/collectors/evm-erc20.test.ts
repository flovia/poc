import { describe, expect, test } from "bun:test";
import { createEvmErc20TransfersCollector } from "../../src/collectors/evm/erc20-transfers.js";

describe("EVM ERC-20 transfers collector", () => {
  test("collects Tempo incoming transfer logs by payTo", async () => {
    const requests: unknown[] = [];
    const collector = createEvmErc20TransfersCollector({
      source: "tempo-rpc",
      chain: "tempo",
      endpoint: "https://rpc.tempo.example",
      maxBlockRange: 100n,
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        requests.push(body);
        if (body.method === "eth_getBlockByNumber") {
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: { timestamp: "0x69384e80" },
          });
        }
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: [
            {
              address: "0x20c000000000000000000000b9537d11c60e8b50",
              blockNumber: "0x2a",
              blockHash: "0xblock",
              transactionHash: "0xtx",
              logIndex: "0x3",
              data: "0x0f4240",
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x0000000000000000000000001111111111111111111111111111111111111111",
                "0x0000000000000000000000006086e37324f32d63bf30a027ea09bf166f96f3cf",
              ],
            },
          ],
        });
      },
    });

    const result = await collector.collectTransfers({
      targets: [
        {
          chain: "tempo",
          address: "0x6086e37324f32d63bf30a027ea09bf166f96f3cf",
          assetAddress: "0x20c000000000000000000000b9537d11c60e8b50",
          providerId: "browserbase",
        },
      ],
      window: { chain: "tempo", fromBlock: 1n, toBlock: 42n },
    });

    expect(requests).toHaveLength(2);
    expect(result.transfers).toEqual([
      {
        source: "tempo-rpc",
        chain: "tempo",
        queryTarget: {
          chain: "tempo",
          address: "0x6086e37324f32d63bf30a027ea09bf166f96f3cf",
          assetAddress: "0x20c000000000000000000000b9537d11c60e8b50",
          providerId: "browserbase",
        },
        idempotencyKey: "tempo-rpc:tempo:0xtx:3",
        transactionHash: "0xtx",
        blockNumber: 42n,
        timestamp: "2025-12-09T16:29:52.000Z",
        blockHash: "0xblock",
        fromAddress: "0x1111111111111111111111111111111111111111",
        toAddress: "0x6086e37324f32d63bf30a027ea09bf166f96f3cf",
        direction: "incoming",
        assetAddress: "0x20c000000000000000000000b9537d11c60e8b50",
        amountBaseUnits: "1000000",
        logIndex: 3,
        rawPayload: {
          address: "0x20c000000000000000000000b9537d11c60e8b50",
          blockNumber: "0x2a",
          blockHash: "0xblock",
          transactionHash: "0xtx",
          logIndex: "0x3",
          data: "0x0f4240",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000001111111111111111111111111111111111111111",
            "0x0000000000000000000000006086e37324f32d63bf30a027ea09bf166f96f3cf",
          ],
        },
      },
    ]);
  });
});
