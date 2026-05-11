import { describe, expect, test } from "bun:test";
import { createSolanaRpcTransferCollector } from "../../src/collectors/solana/rpc-transfers.js";

describe("Solana RPC transfers collector", () => {
  test("normalizes token balance diffs for a token-account target", async () => {
    const collector = createSolanaRpcTransferCollector({
      source: "alchemy",
      endpoint: "https://solana.example",
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.method === "getSignaturesForAddress") {
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: [{ signature: "sig-1", slot: 100, err: null, blockTime: 1_800_000_000 }],
          });
        }
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            slot: 100,
            blockTime: 1_800_000_000,
            transaction: {
              signatures: ["sig-1"],
              message: {
                accountKeys: ["payer", "target-token-account"],
              },
            },
            meta: {
              err: null,
              preTokenBalances: [
                {
                  accountIndex: 1,
                  mint: "mint",
                  owner: "owner",
                  uiTokenAmount: { amount: "100", decimals: 6 },
                },
              ],
              postTokenBalances: [
                {
                  accountIndex: 1,
                  mint: "mint",
                  owner: "owner",
                  uiTokenAmount: { amount: "250", decimals: 6 },
                },
              ],
            },
          },
        });
      },
    });

    const result = await collector.collectTransfers({
      targets: [{ chain: "solana", address: "target-token-account", assetAddress: "mint" }],
      window: { chain: "solana" },
      limit: 1,
    });

    expect(result.nextCursor).toEqual({
      source: "alchemy",
      chain: "solana",
      newestSeenSignature: "sig-1",
      oldestSeenSignature: "sig-1",
      newestSeenSlot: 100n,
      oldestSeenSlot: 100n,
    });
    expect(result.transfers).toMatchObject([
      {
        source: "alchemy",
        chain: "solana",
        idempotencyKey: "alchemy:solana:sig-1:1:mint",
        transactionHash: "sig-1",
        signature: "sig-1",
        slot: 100n,
        timestamp: "2027-01-15T08:00:00.000Z",
        toAddress: "target-token-account",
        direction: "incoming",
        assetAddress: "mint",
        amountBaseUnits: "150",
        success: true,
      },
    ]);
  });
});
