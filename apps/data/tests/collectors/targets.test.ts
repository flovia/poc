import { describe, expect, test } from "bun:test";
import {
  PAY_SH_SOLANA_USDC_COLLECTION_TARGETS,
  QUICKNODE_SOLANA_PAY_TO,
  QUICKNODE_SOLANA_USDC_COLLECTION_TARGET,
  QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT,
  SOLANA_USDC_MINT,
  toCollectorTargets,
} from "../../src/collectors/targets/pay-sh-solana.js";

describe("Pay.sh Solana collection targets", () => {
  test("keeps the public-safe poc-data USDC target mapping", () => {
    expect(SOLANA_USDC_MINT).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(PAY_SH_SOLANA_USDC_COLLECTION_TARGETS).toHaveLength(12);
    expect(PAY_SH_SOLANA_USDC_COLLECTION_TARGETS[0]).toMatchObject({
      source: "pay_sh",
      protocol: "mpp",
      chain: "solana",
      asset: "usdc",
      payToAddress: "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
      resolvedReceiveAddress: "3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh",
      tokenMintAddress: SOLANA_USDC_MINT,
    });
  });

  test("converts DB-shaped targets into collector token-account targets", () => {
    const targets = toCollectorTargets(PAY_SH_SOLANA_USDC_COLLECTION_TARGETS.slice(0, 1));

    expect(targets).toEqual([
      {
        chain: "solana",
        address: "3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh",
        assetAddress: SOLANA_USDC_MINT,
        providerId: "pay_sh:mpp:Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
      },
    ]);
  });

  test("keeps QuickNode x402 Solana USDC target mapping", () => {
    expect(QUICKNODE_SOLANA_PAY_TO).toBe("2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57");
    expect(QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT).toBe(
      "6bMZDGaWLoJEVCwS6RCNaqfS3UipqG2d6mUNEqp6KQZ5",
    );
    expect(QUICKNODE_SOLANA_USDC_COLLECTION_TARGET).toMatchObject({
      source: "pay_sh",
      protocol: "x402",
      providerFqn: "quicknode/rpc",
      chain: "solana",
      asset: "usdc",
      payToAddress: QUICKNODE_SOLANA_PAY_TO,
      resolvedReceiveAddress: QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT,
      tokenMintAddress: SOLANA_USDC_MINT,
    });
    expect(toCollectorTargets([QUICKNODE_SOLANA_USDC_COLLECTION_TARGET])).toEqual([
      {
        chain: "solana",
        address: QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT,
        assetAddress: SOLANA_USDC_MINT,
        providerId: "quicknode/rpc",
      },
    ]);
  });
});
