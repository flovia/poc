import { describe, expect, test } from "bun:test";
import { createNansenSolanaBalancesCollector } from "../../src/collectors/nansen/solana-balances.js";

describe("Nansen Solana balances collector", () => {
  test("normalizes current address balances as enrichment rows", async () => {
    const collector = createNansenSolanaBalancesCollector({
      apiKey: "nansen-key",
      fetch: async () =>
        Response.json({
          pagination: { page: 1, is_last_page: true },
          data: [
            {
              chain: "solana",
              address: "owner",
              token_address: "mint",
              token_symbol: "USDC",
              token_name: "USD Coin",
              token_amount: 1,
              price_usd: 0.9999,
              value_usd: 0.9999,
            },
          ],
        }),
    });

    const result = await collector.collectBalances({
      targets: [{ chain: "solana", address: "owner", assetAddress: "mint" }],
      limit: 1,
    });

    expect(result.balances).toMatchObject([
      {
        source: "nansen",
        chain: "solana",
        walletAddress: "owner",
        assetAddress: "mint",
        assetSymbol: "USDC",
        assetName: "USD Coin",
        amountBaseUnits: "1000000",
        decimals: 6,
        valueUsd: 0.9999,
      },
    ]);
  });
});
