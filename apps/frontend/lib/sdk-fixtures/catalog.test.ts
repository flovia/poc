import { describe, expect, test } from "bun:test";
import { STATIC_PROVIDER_CAPABILITIES } from "@/lib/providers/static-capabilities";
import { getFixtureProviders } from "./catalog";
import { isSyntheticEvmAddress, isSyntheticSolanaAddress } from "./wallets";

const KNOWN_PUBLIC_WALLETS = new Set(
  [
    "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f",
    "0x6e3184c204e596ded89e8a5693b602097f4ab687",
    "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP",
    "9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ",
  ].map((value) => value.toLowerCase()),
);

describe("getFixtureProviders", () => {
  test("returns SDK demo providers plus the static capability catalog", () => {
    const providers = getFixtureProviders();
    expect(providers.some((provider) => provider.providerId === "northwind-price")).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(STATIC_PROVIDER_CAPABILITIES.length);
  });

  test("uses synthetic payTo addresses rather than known public wallets", () => {
    const providers = getFixtureProviders();
    for (const provider of providers) {
      const payTo = provider.payTo.toLowerCase();
      expect(KNOWN_PUBLIC_WALLETS.has(payTo)).toBe(false);
      const looksSynthetic =
        isSyntheticEvmAddress(provider.payTo) || isSyntheticSolanaAddress(provider.payTo);
      expect(looksSynthetic).toBe(true);
    }
  });
});
