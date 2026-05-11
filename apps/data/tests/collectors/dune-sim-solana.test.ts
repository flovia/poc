import { describe, expect, test } from "bun:test";
import { createDuneSimSolanaBalancesCollector } from "../../src/collectors/dune-sim/solana-balances.js";

describe("Dune Sim Solana balances collector", () => {
  test("normalizes Solana wallet balances as enrichment rows", async () => {
    const collector = createDuneSimSolanaBalancesCollector({
      apiKey: "dune-key",
      fetch: async () =>
        Response.json({
          wallet_address: "owner",
          balances: [
            {
              chain: "solana",
              address: "mint",
              symbol: "USDC",
              name: "USD Coin",
              raw_balance: "1000000",
              decimals: 6,
              value_usd: 1,
            },
          ],
        }),
    });

    const result = await collector.collectBalances({
      targets: [{ chain: "solana", address: "owner", assetAddress: "mint" }],
      limit: 1,
    });

    expect(result.balances).toEqual([
      {
        source: "dune-sim",
        chain: "solana",
        queryTarget: { chain: "solana", address: "owner", assetAddress: "mint" },
        walletAddress: "owner",
        assetAddress: "mint",
        assetSymbol: "USDC",
        assetName: "USD Coin",
        amountBaseUnits: "1000000",
        decimals: 6,
        valueUsd: 1,
        rawPayload: {
          chain: "solana",
          address: "mint",
          symbol: "USDC",
          name: "USD Coin",
          raw_balance: "1000000",
          decimals: 6,
          value_usd: 1,
        },
      },
    ]);
  });
});
