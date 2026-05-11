import { describe, expect, test } from "bun:test";
import { getProviderBalanceContext } from "./provider-enrichment";

describe("provider enrichment", () => {
  test("returns the Pay.sh Solana owner balance context", () => {
    expect(
      getProviderBalanceContext({
        providerId: "provider",
        name: "Provider",
        payTo: "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
      }),
    ).toEqual({ label: "Balance", value: "1.72 USDC" });
  });

  test("does not expose enrichment for unrelated providers", () => {
    expect(
      getProviderBalanceContext({
        providerId: "provider",
        name: "Provider",
        payTo: "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f",
      }),
    ).toBeUndefined();
  });
});
