import { describe, expect, test } from "bun:test";
import type { CustomerProviderUsageDto } from "@/lib/api/types";
import { extractHost, extractPath, groupProvidersByHost } from "./co-usage";

function provider(
  partial: Partial<CustomerProviderUsageDto> & { name: string; providerId: string },
): CustomerProviderUsageDto {
  return {
    payToWallet: "0xabc",
    spendAtomic: "0",
    transactionCount: 0,
    firstSeenAt: 0,
    lastSeenAt: 0,
    ...partial,
  };
}

describe("extractHost", () => {
  test("returns host for full URL", () => {
    expect(extractHost("https://pro-api.coingecko.com/api/v3/foo")).toBe("pro-api.coingecko.com");
  });

  test("returns host for http URL", () => {
    expect(extractHost("http://x402.storyverselab.ai/script/1/purchase")).toBe(
      "x402.storyverselab.ai",
    );
  });

  test("falls back to leading segment when not a URL", () => {
    expect(extractHost("pro-api.coingecko.com/path")).toBe("pro-api.coingecko.com");
  });

  test("returns input when no slash", () => {
    expect(extractHost("pro-api.coingecko.com")).toBe("pro-api.coingecko.com");
  });

  test("handles empty string", () => {
    expect(extractHost("")).toBe("(unknown)");
  });
});

describe("extractPath", () => {
  test("returns path with query for URL", () => {
    expect(extractPath("https://api.example.com/foo?x=1")).toBe("/foo?x=1");
  });

  test("returns root for bare host URL", () => {
    expect(extractPath("https://api.example.com")).toBe("/");
  });

  test("returns path portion for non-URL", () => {
    expect(extractPath("api.example.com/foo/bar")).toBe("/foo/bar");
  });
});

describe("groupProvidersByHost", () => {
  test("groups multiple endpoints under one host", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
        spendAtomic: "100",
        transactionCount: 5,
        firstSeenAt: 100,
        lastSeenAt: 200,
      }),
      provider({
        providerId: "b",
        name: "https://pro-api.coingecko.com/api/v3/x402/onchain/networks/eth/token_price",
        spendAtomic: "200",
        transactionCount: 3,
        firstSeenAt: 50,
        lastSeenAt: 250,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].host).toBe("pro-api.coingecko.com");
    expect(groups[0].endpoints).toHaveLength(2);
    expect(groups[0].transactionCount).toBe(8);
    expect(groups[0].spendAtomic).toBe("300");
    expect(groups[0].firstSeenAt).toBe(50);
    expect(groups[0].lastSeenAt).toBe(250);
  });

  test("sorts hosts by transaction count desc", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://small.example.com/foo",
        transactionCount: 1,
      }),
      provider({
        providerId: "b",
        name: "https://big.example.com/foo",
        transactionCount: 10,
      }),
      provider({
        providerId: "c",
        name: "https://medium.example.com/foo",
        transactionCount: 5,
      }),
    ]);

    expect(groups.map((g) => g.host)).toEqual([
      "big.example.com",
      "medium.example.com",
      "small.example.com",
    ]);
  });

  test("sorts endpoints within group by transaction count desc", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://api.example.com/quiet",
        transactionCount: 1,
      }),
      provider({
        providerId: "b",
        name: "https://api.example.com/busy",
        transactionCount: 9,
      }),
    ]);

    expect(groups[0].endpoints.map((e) => e.path)).toEqual(["/busy", "/quiet"]);
  });

  test("preserves single-endpoint hosts as singletons", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://only.example.com/x",
        transactionCount: 4,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].endpoints).toHaveLength(1);
    expect(groups[0].transactionCount).toBe(4);
  });

  test("handles empty input", () => {
    expect(groupProvidersByHost([])).toEqual([]);
  });

  test("groups by host even when payToWallet differs", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://api.example.com/v1/foo",
        payToWallet: "0x111",
        transactionCount: 3,
      }),
      provider({
        providerId: "b",
        name: "https://api.example.com/v2/foo",
        payToWallet: "0x222",
        transactionCount: 2,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].endpoints).toHaveLength(2);
    expect(groups[0].endpoints.map((e) => e.payToWallet).sort()).toEqual(["0x111", "0x222"]);
    expect(groups[0].transactionCount).toBe(5);
  });

  test("handles very large spendAtomic without precision loss", () => {
    const groups = groupProvidersByHost([
      provider({
        providerId: "a",
        name: "https://api.example.com/x",
        spendAtomic: "9007199254740993",
        transactionCount: 1,
      }),
      provider({
        providerId: "b",
        name: "https://api.example.com/y",
        spendAtomic: "9007199254740993",
        transactionCount: 1,
      }),
    ]);

    expect(groups[0].spendAtomic).toBe("18014398509481986");
  });

  test("groups empty-name providers under (unknown)", () => {
    const groups = groupProvidersByHost([
      provider({ providerId: "a", name: "", transactionCount: 4 }),
      provider({ providerId: "b", name: "", transactionCount: 2 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].host).toBe("(unknown)");
    expect(groups[0].endpoints).toHaveLength(2);
    expect(groups[0].transactionCount).toBe(6);
  });
});
