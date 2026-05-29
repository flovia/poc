import { afterEach, describe, expect, test } from "bun:test";
import { getProviderRanking } from "./data-source";

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

describe("data source", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });

  test("falls back to an empty provider ranking when the live BFF is unavailable", async () => {
    globalThis.fetch = (() => Promise.reject(new Error("connect timeout"))) as unknown as typeof fetch;
    console.warn = (() => {}) as typeof console.warn;

    const ranking = await getProviderRanking("settledAmount", 100);

    expect(ranking).toMatchObject({
      generatedFrom: "frontend-fallback:provider-ranking",
      population: "observed_providers",
      sort: "settledAmount",
      limit: 100,
      providerCount: 0,
      totalProviderCount: 0,
      providers: [],
      provenance: "demo_label",
    });
  });
});
