import { describe, expect, test } from "bun:test";
import type { StoredProvider } from "@/lib/types";
import {
  DEFAULT_PROVIDER_FILTER,
  chainsOfProvider,
  collectAvailableChains,
  filterProviders,
  type ProviderClassifierContext,
} from "./filter";
import { orderProvidersPinnedFirst } from "./order";

const make = (
  overrides: Partial<StoredProvider> & { providerId: string; name: string },
): StoredProvider =>
  ({
    mode: "simple",
    payTo: "0xabc",
    createdAt: 0,
    ...overrides,
  }) as StoredProvider;

const ctx = (demoIds: string[] = []): ProviderClassifierContext => ({
  demoOpted: demoIds.length > 0,
  userIds: new Set<string>(),
  demoIds: new Set(demoIds),
});

describe("filterProviders", () => {
  const providers: StoredProvider[] = [
    make({
      providerId: "quicknode",
      name: "QuickNode",
      source: "generated",
      catalogSource: "pay_sh_curated",
      serviceId: "quicknode/rpc",
      networks: ["base", "solana", "x-layer"],
      protocols: ["x402", "MPP"],
    }),
    make({
      providerId: "coingecko",
      name: "CoinGecko Pro",
      source: "generated",
      serviceId: "pro-api.coingecko.com",
      networks: ["base"],
    }),
    make({
      providerId: "nansen",
      name: "Nansen",
      source: "generated",
      serviceId: "api.nansen.ai",
      networks: ["base"],
    }),
    make({
      providerId: "northwind-price",
      name: "Northwind Price API",
      source: "demo",
      networks: [],
    }),
    make({
      providerId: "user-1",
      name: "Acme Internal API",
      source: "user",
      serviceId: "internal.acme.io",
      networks: ["base"],
    }),
  ];

  test("query matches name (case-insensitive)", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, query: "quick" }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode"]);
  });

  test("query matches serviceId", () => {
    const r = filterProviders(
      providers,
      { ...DEFAULT_PROVIDER_FILTER, query: "coingecko.com" },
      ctx(),
    );
    expect(r.map((p) => p.providerId)).toEqual(["coingecko"]);
  });

  test("source 'pay-sh' excludes preserved base generated rows and demo/user rows", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, source: "pay-sh" }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode"]);
  });

  test("source 'pay-sh' excludes generated raw x402 rows", () => {
    const r = filterProviders(
      [
        ...providers,
        make({
          providerId: "raw-x402",
          name: "High Tx Raw Endpoint",
          source: "generated",
          catalogSource: "raw_x402",
          serviceId: "raw.example.com",
        }),
      ],
      { ...DEFAULT_PROVIDER_FILTER, source: "pay-sh" },
      ctx(),
    );

    expect(r.map((p) => p.providerId)).toEqual(["quicknode"]);
  });

  test("source 'demo' uses the precomputed demoIds set", () => {
    const r = filterProviders(
      providers,
      { ...DEFAULT_PROVIDER_FILTER, source: "demo" },
      ctx(["northwind-price"]),
    );
    expect(r.map((p) => p.providerId)).toEqual(["northwind-price"]);
  });

  test("source 'real' returns user providers only (not generated, not demo)", () => {
    const r = filterProviders(
      providers,
      { ...DEFAULT_PROVIDER_FILTER, source: "real" },
      ctx(["northwind-price"]),
    );
    expect(r.map((p) => p.providerId)).toEqual(["user-1"]);
  });

  test("chains filter is OR across selected chains", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, chains: ["solana"] }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode"]);
  });

  test("chains filter excludes providers with no chains", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, chains: ["base"] }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode", "coingecko", "nansen", "user-1"]);
  });

  test("protocol 'x402' includes any provider whose protocols contain x402", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, protocol: "x402" }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode", "coingecko", "nansen"]);
  });

  test("protocol 'MPP' excludes x402-only providers", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, protocol: "MPP" }, ctx());
    expect(r.map((p) => p.providerId)).toEqual(["quicknode"]);
  });

  test("protocol filter excludes providers with no protocol info", () => {
    const r = filterProviders(providers, { ...DEFAULT_PROVIDER_FILTER, protocol: "x402" }, ctx());
    expect(r.map((p) => p.providerId)).not.toContain("user-1");
    expect(r.map((p) => p.providerId)).not.toContain("northwind-price");
  });

  test("filters compose with AND", () => {
    const r = filterProviders(
      providers,
      { query: "api", source: "pay-sh", protocol: "all", chains: ["base"] },
      ctx(),
    );
    // QuickNode's name doesn't include "api" → empty.
    expect(r.map((p) => p.providerId)).toEqual([]);
  });
});

describe("chainsOfProvider", () => {
  test("places 'other' after named chains regardless of input order", () => {
    const p = make({
      providerId: "x",
      name: "X",
      networks: ["eip155:99999", "base", "solana"],
    });
    expect(chainsOfProvider(p)).toEqual(["base", "solana", "other"]);
  });
});

describe("collectAvailableChains", () => {
  test("returns the unique normalized chains across all providers", () => {
    const providers: StoredProvider[] = [
      make({ providerId: "a", name: "A", networks: ["base", "solana"] }),
      make({ providerId: "b", name: "B", networks: ["solana", "x-layer"] }),
      make({ providerId: "c", name: "C", network: "Polygon" }),
    ];
    const chains = collectAvailableChains(providers);
    expect(new Set(chains)).toEqual(new Set(["base", "solana", "x-layer", "polygon"]));
  });

  test("returns empty array when no providers expose chain info", () => {
    const providers: StoredProvider[] = [make({ providerId: "a", name: "A" })];
    expect(collectAvailableChains(providers)).toEqual([]);
  });
});

describe("orderProvidersPinnedFirst", () => {
  test("places CoinGecko and Nansen first while preserving the rest", () => {
    const providers: StoredProvider[] = [
      make({ providerId: "quicknode", name: "QuickNode", serviceId: "quicknode/rpc" }),
      make({ providerId: "static-pro-api-coingecko-com", name: "CoinGecko Pro", serviceId: "pro-api.coingecko.com" }),
      make({ providerId: "stripe", name: "Stripe", serviceId: "api.stripe.com" }),
      make({ providerId: "static-api-nansen-ai", name: "Nansen", serviceId: "api.nansen.ai" }),
    ];

    expect(orderProvidersPinnedFirst(providers).map((p) => p.providerId)).toEqual([
      "static-pro-api-coingecko-com",
      "static-api-nansen-ai",
      "quicknode",
      "stripe",
    ]);
  });
});
