import { describe, expect, test } from "bun:test";
import { buildDemoProviderEnrichmentSummary } from "../../src/cli/enrich-provider.js";

describe("enrich provider CLI demo summary", () => {
  test("summarizes partner endpoint proof and the UI balance label", () => {
    const summary = buildDemoProviderEnrichmentSummary({
      target: {
        providerId: "pay_sh:mpp:owner",
        chain: "solana",
        asset: "USDC",
        payToAddress: "owner",
        receiveTokenAccount: "token-account",
        tokenMintAddress: "mint",
      },
      latestTransfer: {
        source: "alchemy",
        signature: "sig",
        transactionHash: "sig",
        amountBaseUnits: "10000",
      },
      balances: [
        {
          source: "dune-sim",
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
        },
        {
          source: "goldrush",
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
        },
        {
          source: "coingecko",
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
        },
        {
          source: "nansen",
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
        },
      ],
      provenance: {
        enrichedAt: "2026-05-11T00:01:00.000Z",
        sources: ["alchemy", "dune-sim", "goldrush"],
      },
    });

    expect(summary).toEqual({
      feature: "provider-balance-enrichment",
      target: {
        providerId: "pay_sh:mpp:owner",
        chain: "solana",
        walletAddress: "owner",
        asset: "USDC",
      },
      uiLabel: "Balance 1.72 USDC",
      partnerProof: [
        {
          source: "dune-sim",
          endpoint: "GET /beta/svm/balances/{address}?chains=solana",
          role: "live Solana SVM provider wallet balance enrichment",
          formattedBalance: "1.72 USDC",
        },
        {
          source: "goldrush",
          endpoint: "GET /v1/solana-mainnet/address/{address}/balances_v2/",
          role: "secondary Solana token balance enrichment",
          formattedBalance: "1.72 USDC",
        },
        {
          source: "coingecko",
          endpoint: "GET /api/v3/simple/token_price/solana + Solana RPC getTokenAccountsByOwner",
          role: "USDC price enrichment paired with wallet token-account balance reads",
          formattedBalance: "1.72 USDC",
        },
        {
          source: "nansen",
          endpoint: "POST /api/v1/profiler/address/current-balance",
          role: "current Solana address balance enrichment",
          formattedBalance: "1.72 USDC",
        },
        {
          source: "alchemy",
          endpoint: "Solana JSON-RPC getSignaturesForAddress/getTransaction",
          role: "latest payment transfer observation",
        },
      ],
    });
  });
});
