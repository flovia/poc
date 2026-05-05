import { describe, expect, test } from "bun:test";
import { inferBrandDomain } from "./brand";

describe("inferBrandDomain", () => {
  test("solana-foundation/google/* maps to google.com via curated map", () => {
    const r = inferBrandDomain({
      fqn: "solana-foundation/google/vision",
      serviceUrl: "https://vision.google.gateway-402.com",
    });
    expect(r).toEqual({ domain: "google.com", reason: "curated" });
  });

  test("solana-foundation/alibaba/* maps to alibaba.com", () => {
    const r = inferBrandDomain({
      fqn: "solana-foundation/alibaba/agentexplorer",
      serviceUrl: "https://agentexplorer.alibaba.gateway-402.com",
    });
    expect(r.domain).toBe("alibaba.com");
    expect(r.reason).toBe("curated");
  });

  test("paysponge/<brand> resolves the inner brand, not paysponge", () => {
    expect(inferBrandDomain({ fqn: "paysponge/fal" }).domain).toBe("fal.ai");
    expect(inferBrandDomain({ fqn: "paysponge/2captcha" }).domain).toBe("2captcha.com");
    expect(inferBrandDomain({ fqn: "paysponge/wolframalpha" }).domain).toBe("wolframalpha.com");
    expect(inferBrandDomain({ fqn: "paysponge/coingecko" }).domain).toBe("coingecko.com");
  });

  test("merit-systems/<stable-brand>/* maps each stable* to its own dev domain", () => {
    expect(inferBrandDomain({ fqn: "merit-systems/stablecrypto/market-data" }).domain).toBe(
      "stablecrypto.dev",
    );
    expect(inferBrandDomain({ fqn: "merit-systems/stableemail/email" }).domain).toBe(
      "stableemail.dev",
    );
  });

  test("single-segment fqn with curated brand resolves the brand domain", () => {
    expect(inferBrandDomain({ fqn: "agentmail/email" }).domain).toBe("agentmail.to");
    expect(inferBrandDomain({ fqn: "quicknode/rpc" }).domain).toBe("quicknode.com");
    expect(inferBrandDomain({ fqn: "dtelecom/voice" }).domain).toBe("dtelecom.org");
  });

  test("falls back to direct host when fqn brand is unknown and the url is not a wrapper", () => {
    const r = inferBrandDomain({
      fqn: "newbrand/service",
      serviceUrl: "https://api.newbrand.io",
    });
    expect(r).toEqual({ domain: "newbrand.io", reason: "direct-host" });
  });

  test("strips x402 / api / www / pro-api infra prefixes", () => {
    expect(inferBrandDomain({ fqn: "z/x", serviceUrl: "https://x402.example.com" }).domain).toBe(
      "example.com",
    );
    expect(inferBrandDomain({ fqn: "z/x", serviceUrl: "https://api.example.com" }).domain).toBe(
      "example.com",
    );
    expect(inferBrandDomain({ fqn: "z/x", serviceUrl: "https://www.example.com" }).domain).toBe(
      "example.com",
    );
    expect(inferBrandDomain({ fqn: "z/x", serviceUrl: "https://pro-api.example.com" }).domain).toBe(
      "example.com",
    );
  });

  test("does not guess from gateway-402 wrapper host when fqn is unknown", () => {
    const r = inferBrandDomain({
      fqn: "unknown-org/unknown-svc",
      serviceUrl: "https://thing.acme.gateway-402.com",
    });
    expect(r.domain).toBeNull();
  });

  test("does not guess from x402.paysponge wrapper host when fqn is unknown", () => {
    const r = inferBrandDomain({
      fqn: "unknown-org/unknown-svc",
      serviceUrl: "https://thing.x402.paysponge.com",
    });
    expect(r.domain).toBeNull();
  });

  test("hostname-style serviceId resolves to the curated brand via apex label", () => {
    // Catalog rows for preserved providers (coingecko/nansen) carry their
    // serviceId as a bare hostname rather than an atlas fqn. The apex label
    // should still hit the curated map.
    expect(inferBrandDomain({ fqn: "api.nansen.ai" }).domain).toBe("nansen.ai");
    expect(inferBrandDomain({ fqn: "api.nansen.ai" }).iconUrl).toBeDefined();
    expect(inferBrandDomain({ fqn: "pro-api.coingecko.com" }).domain).toBe("coingecko.com");
  });

  test("returns null reason 'none' when nothing is known at all", () => {
    expect(inferBrandDomain({})).toEqual({ domain: null, reason: "none" });
  });

  test("invalid serviceUrl is ignored gracefully", () => {
    const r = inferBrandDomain({ fqn: "totally/unknown", serviceUrl: "not a url" });
    expect(r.domain).toBeNull();
  });
});
