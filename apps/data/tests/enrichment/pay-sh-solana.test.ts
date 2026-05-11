import { describe, expect, test } from "bun:test";
import { enrichPayShSolanaTarget } from "../../src/enrichment/pay-sh-solana.js";

describe("Pay.sh Solana enrichment", () => {
  test("combines transfer and balance collectors into a provider snapshot", async () => {
    const snapshot = await enrichPayShSolanaTarget({
      targetIndex: 0,
      enrichedAt: "2026-05-11T00:01:00.000Z",
      transferCollector: {
        source: "alchemy",
        supportedChains: ["solana"],
        async collectTransfers() {
          return {
            source: "alchemy",
            rawRequestCount: 1,
            transfers: [
              {
                source: "alchemy",
                chain: "solana",
                queryTarget: { chain: "solana", address: "token", assetAddress: "mint" },
                idempotencyKey: "id",
                transactionHash: "sig",
                signature: "sig",
                slot: 100n,
                amountBaseUnits: "10000",
                rawPayload: {},
              },
            ],
          };
        },
      },
      balanceCollectors: [
        {
          source: "dune-sim",
          supportedChains: ["solana"],
          async collectBalances() {
            return {
              source: "dune-sim",
              rawRequestCount: 1,
              balances: [
                {
                  source: "dune-sim",
                  chain: "solana",
                  queryTarget: { chain: "solana", address: "owner", assetAddress: "mint" },
                  walletAddress: "owner",
                  assetAddress: "mint",
                  assetSymbol: "USDC",
                  amountBaseUnits: "1729978",
                  rawPayload: {},
                },
              ],
            };
          },
        },
      ],
    });

    expect(snapshot.target.payToAddress).toBe("Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP");
    expect(snapshot.target.receiveTokenAccount).toBe(
      "3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh",
    );
    expect(snapshot.latestTransfer?.signature).toBe("sig");
    expect(snapshot.balances).toHaveLength(1);
    expect(snapshot.provenance.sources).toEqual(["alchemy", "dune-sim"]);
  });
});
