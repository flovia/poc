import { describe, expect, test } from "bun:test";
import { resolveProviderLabel } from "./provider-label";

describe("resolveProviderLabel", () => {
  test("returns host name for canonical providerId hit", () => {
    const nameByProviderId = new Map([
      ["coingecko-search", "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools"],
    ]);
    expect(resolveProviderLabel("coingecko-search", nameByProviderId, new Map())).toBe(
      "pro-api.coingecko.com",
    );
  });

  test("falls back to host via payToWallet when rawId looks like an address", () => {
    const hostByPayToWallet = new Map([
      ["0x110cdbba7fe6434ec4ce3464cc523942ad6fb784", "pro-api.coingecko.com"],
    ]);
    expect(
      resolveProviderLabel(
        "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
        new Map(),
        hostByPayToWallet,
      ),
    ).toBe("pro-api.coingecko.com");
  });

  test("matches address case-insensitively", () => {
    const hostByPayToWallet = new Map([
      ["0xabcdef0123456789abcdef0123456789abcdef01", "host.example.com"],
    ]);
    expect(
      resolveProviderLabel(
        "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
        new Map(),
        hostByPayToWallet,
      ),
    ).toBe("host.example.com");
  });

  test("returns short address fallback when address has no provider mapping", () => {
    expect(
      resolveProviderLabel("0x1234567890abcdef1234567890abcdef12345678", new Map(), new Map()),
    ).toBe("0x1234567890abcdef1234567890abcdef12345678");
  });

  test("returns host for URL-shaped providerId not in map", () => {
    expect(resolveProviderLabel("https://api.example.com/foo", new Map(), new Map())).toBe(
      "api.example.com",
    );
  });

  test("returns null for null/undefined input", () => {
    expect(resolveProviderLabel(null, new Map(), new Map())).toBe(null);
    expect(resolveProviderLabel(undefined, new Map(), new Map())).toBe(null);
  });
});
