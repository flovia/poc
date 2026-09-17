import { describe, expect, test } from "bun:test";
import { getFixtureProviders } from "./sdk-fixtures/catalog";
import { isSyntheticEvmAddress } from "./sdk-fixtures/wallets";

describe("fixture catalog wiring", () => {
  test("northwind remains addressable as a seed provider id", () => {
    const northwind = getFixtureProviders().find(
      (provider) => provider.providerId === "northwind-price",
    );
    expect(northwind).toBeDefined();
    expect(isSyntheticEvmAddress(northwind?.payTo ?? "")).toBe(true);
    expect(northwind?.hasCustomerFacts).toBe(true);
  });
});
