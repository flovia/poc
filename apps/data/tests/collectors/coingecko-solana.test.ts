import { describe, expect, test } from "bun:test";
import { createCoinGeckoSolanaBalancesCollector } from "../../src/collectors/coingecko/solana-balances.js";

describe("CoinGecko Solana balances collector", () => {
  test("combines Solana token account balances with CoinGecko USD price", async () => {
    const requestedUrls: string[] = [];
    const collector = createCoinGeckoSolanaBalancesCollector({
      apiKey: "coingecko-key",
      fetch: async (url, init) => {
        requestedUrls.push(url.toString());
        if (init?.method === "POST") {
          return Response.json({
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: { mint: "mint", tokenAmount: { amount: "1000000", decimals: 6 } },
                      },
                    },
                  },
                },
              ],
            },
          });
        }
        return Response.json({ mint: { usd: 0.9999, last_updated_at: 1_762_833_600 } });
      },
      endpoint: "https://api.coingecko.test/api/v3",
      rpcEndpoint: "https://solana-rpc.test",
    });

    const result = await collector.collectBalances({
      targets: [{ chain: "solana", address: "owner", assetAddress: "mint" }],
      limit: 1,
    });

    expect(requestedUrls).toEqual([
      "https://solana-rpc.test",
      "https://api.coingecko.test/api/v3/simple/token_price/solana?contract_addresses=mint&vs_currencies=usd&include_last_updated_at=true",
    ]);
    expect(result.balances).toMatchObject([
      {
        source: "coingecko",
        chain: "solana",
        walletAddress: "owner",
        assetAddress: "mint",
        assetSymbol: "USDC",
        amountBaseUnits: "1000000",
        decimals: 6,
        valueUsd: 0.9999,
      },
    ]);
  });
});
