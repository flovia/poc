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

  test("returns the CoinGecko Base provider balance context", () => {
    expect(
      getProviderBalanceContext({
        providerId: "pro-api-coingecko-com--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
        name: "pro-api.coingecko.com",
        payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      }),
    ).toEqual({ label: "Balance", value: "21.89 USDC" });
  });

  test("returns the Nansen Base provider balance context", () => {
    expect(
      getProviderBalanceContext({
        providerId: "api-nansen-ai--base--usdc--0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f",
        name: "api.nansen.ai",
        payTo: "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f",
      }),
    ).toEqual({ label: "Balance", value: "3,849.86 USDC" });
  });

  test("matches provider payTo case-insensitively", () => {
    expect(
      getProviderBalanceContext({
        providerId: "stableemail--base--usdc--0x6e3184c204e596ded89e8a5693b602097f4ab687",
        name: "StableEmail",
        network: "Base",
        asset: "USDC",
        payTo: "0x6e3184c204e596ded89e8a5693b602097f4ab687",
      }),
    ).toEqual({ label: "Balance", value: "241.51 USDC" });
  });

  test("returns zero balances when a supported provider wallet is empty", () => {
    expect(
      getProviderBalanceContext({
        providerId: "quicknode--base--usdc--0xf46394addda95a3d5bcc1124605e3d15d204623c",
        name: "QuickNode",
        network: "base",
        asset: "USDC",
        payTo: "0xF46394adDdA95A3d5bCC1124605E3d15D204623C",
      }),
    ).toEqual({ label: "Balance", value: "0 USDC" });
  });

  test("does not expose enrichment for unrelated providers", () => {
    expect(
      getProviderBalanceContext({
        providerId: "provider",
        name: "Provider",
        payTo: "0x0000000000000000000000000000000000000001",
      }),
    ).toBeUndefined();
  });
});
