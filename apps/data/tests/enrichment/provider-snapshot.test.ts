import { describe, expect, test } from "bun:test";
import { buildProviderEnrichmentSnapshot } from "../../src/enrichment/provider-snapshot.js";

describe("provider enrichment snapshot", () => {
  test("builds a display-ready snapshot from transfer and balance observations", () => {
    const snapshot = buildProviderEnrichmentSnapshot({
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
        chain: "solana",
        queryTarget: { chain: "solana", address: "token-account", assetAddress: "mint" },
        idempotencyKey: "alchemy:solana:sig:1:mint",
        transactionHash: "sig",
        signature: "sig",
        slot: 100n,
        timestamp: "2026-05-11T00:00:00.000Z",
        direction: "incoming",
        assetAddress: "mint",
        assetSymbol: "USDC",
        amountBaseUnits: "10000",
        rawPayload: { hidden: true },
      },
      balances: [
        {
          source: "dune-sim",
          chain: "solana",
          queryTarget: { chain: "solana", address: "owner", assetAddress: "mint" },
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
          valueUsd: 1.729978,
          rawPayload: { hidden: true },
        },
      ],
      enrichedAt: "2026-05-11T00:01:00.000Z",
    });

    expect(snapshot).toEqual({
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
        slot: "100",
        timestamp: "2026-05-11T00:00:00.000Z",
        direction: "incoming",
        amountBaseUnits: "10000",
        assetAddress: "mint",
        assetSymbol: "USDC",
      },
      balances: [
        {
          source: "dune-sim",
          walletAddress: "owner",
          assetAddress: "mint",
          assetSymbol: "USDC",
          amountBaseUnits: "1729978",
          decimals: 6,
          valueUsd: 1.729978,
        },
      ],
      provenance: {
        enrichedAt: "2026-05-11T00:01:00.000Z",
        sources: ["alchemy", "dune-sim"],
      },
    });
  });
});
