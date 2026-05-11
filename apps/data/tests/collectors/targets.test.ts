import { describe, expect, test } from "bun:test";
import {
  PAY_SH_SOLANA_USDC_COLLECTION_TARGETS,
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
});
