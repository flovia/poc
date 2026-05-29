import { describe, expect, test } from "bun:test";
import {
  extractBrandKey,
  inferBrandDisplayName,
  inferBrandDomain,
  inferProviderDisplayName,
} from "./brand";

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

  test("raw host-only providers resolve a usable favicon domain", () => {
    expect(inferBrandDomain({ fqn: "x402.lucyos.ai" }).domain).toBe("lucyos.ai");
    expect(inferBrandDomain({ fqn: "public.zapper.xyz" }).domain).toBe("zapper.xyz");
    expect(inferBrandDomain({ fqn: "blockrun-web-vbsbhh7lea-uc.a.run.app" }).domain).toBe(
      "blockrun-web-vbsbhh7lea-uc.a.run.app",
    );
  });

  test("hostname-style serviceId resolves to a curated display name", () => {
    expect(inferBrandDisplayName({ fqn: "api.nansen.ai" })).toBe("Nansen");
    expect(inferBrandDisplayName({ fqn: "nansen" })).toBe("Nansen");
    expect(inferBrandDisplayName({ fqn: "unknown.example" })).toBeNull();
  });

  test("returns null reason 'none' when nothing is known at all", () => {
    expect(inferBrandDomain({})).toEqual({ domain: null, reason: "none" });
  });

  test("invalid serviceUrl is ignored gracefully", () => {
    const r = inferBrandDomain({ fqn: "totally/unknown", serviceUrl: "not a url" });
    expect(r.domain).toBeNull();
  });

  describe("extractBrandKey", () => {
    test("collapses Pay.sh and MPP serviceIds for the same brand to the same key", () => {
      // AgentMail: Pay.sh atlas uses `agentmail/email`, MPP uses bare `agentmail`.
      expect(extractBrandKey("agentmail/email")).toBe("agentmail");
      expect(extractBrandKey("agentmail")).toBe("agentmail");
    });

    test("Merit Systems stable* brands: Pay.sh `merit-systems/stableX/Y` ≡ MPP `stableX`", () => {
      expect(extractBrandKey("merit-systems/stablesocial/social-data")).toBe("stablesocial");
      expect(extractBrandKey("stablesocial")).toBe("stablesocial");
      expect(extractBrandKey("merit-systems/stablephone/calls")).toBe("stablephone");
      expect(extractBrandKey("stablephone")).toBe("stablephone");
    });

    test("hostname-style serviceIds reduce to apex brand label", () => {
      expect(extractBrandKey("api.nansen.ai")).toBe("nansen");
      expect(extractBrandKey("pro-api.coingecko.com")).toBe("coingecko");
    });

    test("two-segment fqns favor the leading brand segment over the trailing service noun", () => {
      // Regression: `quicknode/rpc` used to collapse into the Tempo `rpc` brand
      // because MPP_BRAND_BY_SERVICE has an `rpc` entry. That mixed Tempo's
      // mpp_registry catalogSource into the QuickNode picker card, which then
      // showed an "MPP Official" badge despite QuickNode being x402-only.
      expect(extractBrandKey("quicknode/rpc")).toBe("quicknode");
    });

    test("undefined / empty input returns null", () => {
      expect(extractBrandKey(undefined)).toBeNull();
      expect(extractBrandKey("")).toBeNull();
    });
  });

  describe("MPP wrapper hosts", () => {
    test("strips 'mpp' infra prefix to reach the brand apex", () => {
      // mpp.firecrawl.dev -> firecrawl.dev (mpp is the infra label)
      expect(
        inferBrandDomain({ fqn: "firecrawl-host", serviceUrl: "https://mpp.firecrawl.dev" }).domain,
      ).toBe("firecrawl.dev");
      // mpp.browserbase.com -> browserbase.com (also curated as fqn match)
      expect(
        inferBrandDomain({ fqn: "browserbase-host", serviceUrl: "https://mpp.browserbase.com" })
          .domain,
      ).toBe("browserbase.com");
    });

    test("looks up *.mpp.tempo.xyz subdomain in curated brand map first", () => {
      // openrouter.mpp.tempo.xyz -> openrouter.ai via curated map (NOT openrouter.com)
      expect(
        inferBrandDomain({ fqn: "openrouter", serviceUrl: "https://openrouter.mpp.tempo.xyz" })
          .domain,
      ).toBe("openrouter.ai");
      // exa.mpp.tempo.xyz -> exa.ai via curated map (NOT exa.com)
      expect(inferBrandDomain({ fqn: "exa", serviceUrl: "https://exa.mpp.tempo.xyz" }).domain).toBe(
        "exa.ai",
      );
      // firecrawl.mpp.tempo.xyz -> firecrawl.dev via curated map (NOT firecrawl.com)
      expect(
        inferBrandDomain({ fqn: "firecrawl", serviceUrl: "https://firecrawl.mpp.tempo.xyz" })
          .domain,
      ).toBe("firecrawl.dev");
    });

    test("fixes mis-mapped Tempo wrapper brands (FlightAPI, 2Captcha, KicksDB)", () => {
      // flightapi.mpp.tempo.xyz -> flightapi.io (NOT flightapi.com which 404s)
      expect(
        inferBrandDomain({ fqn: "flightapi", serviceUrl: "https://flightapi.mpp.tempo.xyz" })
          .domain,
      ).toBe("flightapi.io");
      // twocaptcha.mpp.tempo.xyz -> 2captcha.com (NOT twocaptcha.com)
      expect(
        inferBrandDomain({ fqn: "twocaptcha", serviceUrl: "https://twocaptcha.mpp.tempo.xyz" })
          .domain,
      ).toBe("2captcha.com");
      // kicksdb.mpp.tempo.xyz -> kicks.dev (NOT kicksdb.com)
      expect(
        inferBrandDomain({ fqn: "kicksdb", serviceUrl: "https://kicksdb.mpp.tempo.xyz" }).domain,
      ).toBe("kicks.dev");
    });

    test("Tempo internal services (rpc, storage, codestorage) resolve to tempo.xyz", () => {
      expect(inferBrandDomain({ fqn: "rpc", serviceUrl: "https://rpc.mpp.tempo.xyz" }).domain).toBe(
        "tempo.xyz",
      );
      expect(
        inferBrandDomain({ fqn: "storage", serviceUrl: "https://storage.mpp.tempo.xyz" }).domain,
      ).toBe("tempo.xyz");
      expect(
        inferBrandDomain({ fqn: "codestorage", serviceUrl: "https://codestorage.mpp.tempo.xyz" })
          .domain,
      ).toBe("tempo.xyz");
    });

    test("falls back to <brand>.com for unknown *.mpp.tempo.xyz subdomains", () => {
      // A future Tempo wrapper for an unmapped brand should still resolve to a
      // best-effort `<brand>.com` rather than the Tempo apex.
      const r = inferBrandDomain({
        fqn: "unknown-future-brand",
        serviceUrl: "https://unknown-future-brand.mpp.tempo.xyz",
      });
      expect(r.domain).toBe("unknown-future-brand.com");
      expect(r.reason).toBe("direct-host");
    });

    test("MPP serviceId resolves directly even for non-wrapper hosts (martin-estate)", () => {
      // martin-estate uses agents.martinestate.com directly (not an MPP wrapper).
      // Its agents-subdomain has no favicon, but martinestate.com (apex) does.
      // The MPP map should win over the direct-host strip-infra-prefix guess.
      const r = inferBrandDomain({
        fqn: "martin-estate",
        serviceUrl: "https://agents.martinestate.com",
      });
      expect(r.domain).toBe("martinestate.com");
    });

    test("recognizes *.mpp.paywithlocus.com as a wrapper and uses curated brand", () => {
      expect(
        inferBrandDomain({ fqn: "deepl", serviceUrl: "https://deepl.mpp.paywithlocus.com" }).domain,
      ).toBe("deepl.com");
      expect(
        inferBrandDomain({ fqn: "groq", serviceUrl: "https://groq.mpp.paywithlocus.com" }).domain,
      ).toBe("groq.com");
      expect(
        inferBrandDomain({ fqn: "hunter", serviceUrl: "https://hunter.mpp.paywithlocus.com" })
          .domain,
      ).toBe("hunter.io");
    });
  });

  describe("inferProviderDisplayName", () => {
    test("turns raw host-only x402 services into human display names", () => {
      expect(inferProviderDisplayName({ serviceId: "x402.lucyos.ai" })).toBe("LucyOS");
      expect(inferProviderDisplayName({ serviceId: "public.zapper.xyz" })).toBe("Zapper");
      expect(inferProviderDisplayName({ serviceId: "orbisapi.com" })).toBe("Orbis API");
      expect(inferProviderDisplayName({ serviceId: "x402-secure-api.t54.ai" })).toBe("T54 AI");
      expect(inferProviderDisplayName({ serviceId: "x402.clashofcoins.com" })).toBe(
        "Clash of Coins",
      );
    });

    test("uses deployment slug when only a platform host is available", () => {
      expect(inferProviderDisplayName({ serviceId: "blockrun-web-vbsbhh7lea-uc.a.run.app" })).toBe(
        "Blockrun",
      );
      expect(inferProviderDisplayName({ serviceId: "basehub-alpha.vercel.app" })).toBe("Basehub");
      expect(
        inferProviderDisplayName({ serviceId: "x402-gateway-production.up.railway.app" }),
      ).toBe("X402 Gateway");
    });

    test("preserves non-host fallback names", () => {
      expect(
        inferProviderDisplayName({ serviceId: "quicknode/rpc", fallbackName: "QuickNode" }),
      ).toBe("QuickNode");
    });
  });
});
