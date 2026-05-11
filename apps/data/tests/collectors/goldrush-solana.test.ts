import { describe, expect, test } from "bun:test";
import { createGoldRushSolanaBalancesCollector } from "../../src/collectors/goldrush/solana-balances.js";

describe("GoldRush Solana balances collector", () => {
  test("normalizes Solana balances as enrichment rows", async () => {
    const collector = createGoldRushSolanaBalancesCollector({
      apiKey: "goldrush-key",
      fetch: async () =>
        Response.json({
          error: false,
          data: {
            address: "owner",
            items: [
              {
                contract_address: "mint",
                contract_ticker_symbol: "USDC",
                contract_name: "USD Coin",
                contract_decimals: 6,
                balance: "1000000",
                quote: 1,
              },
            ],
          },
        }),
    });

    const result = await collector.collectBalances({
      targets: [{ chain: "solana", address: "owner", assetAddress: "mint" }],
      limit: 1,
    });

    expect(result.balances).toMatchObject([
      {
        source: "goldrush",
        chain: "solana",
        walletAddress: "owner",
        assetAddress: "mint",
        assetSymbol: "USDC",
        amountBaseUnits: "1000000",
        decimals: 6,
        valueUsd: 1,
      },
    ]);
  });
});
