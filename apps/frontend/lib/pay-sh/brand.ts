// Resolve a Pay.sh provider to a likely "brand" favicon domain.
// The Pay.sh atlas (skills.json) only carries `fqn` and `service_url`. Most
// service_url hosts are x402 wrappers (e.g. *.gateway-402.com,
// *.x402.paysponge.com) that share favicons across unrelated brands, so we
// need to map them back to the underlying provider domain by hand.

type BrandEntry = {
  domain: string;
  // Direct icon URL override. Used when a Google favicon API lookup against
  // `domain` returns a generic globe (e.g. nansen.ai's icons are hosted on
  // framerusercontent.com and the favicon resolver fails to follow them).
  iconUrl?: string;
};

const BRAND_BY_KEY: Record<string, BrandEntry> = {
  // solana-foundation / google / *
  google: { domain: "google.com" },
  // solana-foundation / alibaba / *
  alibaba: { domain: "alibaba.com" },
  // paysponge / *
  "2captcha": { domain: "2captcha.com" },
  fal: { domain: "fal.ai" },
  perplexity: { domain: "perplexity.ai" },
  wolframalpha: { domain: "wolframalpha.com" },
  rentcast: { domain: "rentcast.io" },
  screenshotone: { domain: "screenshotone.com" },
  tripadvisor: { domain: "tripadvisor.com" },
  coingecko: { domain: "coingecko.com" },
  reducto: { domain: "reducto.ai" },
  textbelt: { domain: "textbelt.com" },
  // merit-systems / stable* / *
  stablecrypto: { domain: "stablecrypto.dev" },
  stabledomains: { domain: "stabledomains.dev" },
  stableemail: { domain: "stableemail.dev" },
  stableenrich: { domain: "stableenrich.dev" },
  stablemerch: { domain: "stablemerch.dev" },
  stablephone: { domain: "stablephone.dev" },
  stablesocial: { domain: "stablesocial.dev" },
  stablestudio: { domain: "stablestudio.dev" },
  stableupload: { domain: "stableupload.dev" },
  // top-level brands (single-segment fqn)
  agentmail: { domain: "agentmail.to" },
  crushrewards: { domain: "crushrewards.dev" },
  dtelecom: { domain: "dtelecom.org" },
  nansen: {
    domain: "nansen.ai",
    iconUrl: "https://framerusercontent.com/images/X6PAJXo4BDwSFLJcxI2JZNWsQ.png",
  },
  purch: { domain: "purch.xyz" },
  quicknode: { domain: "quicknode.com" },
  socialintel: { domain: "socialintel.dev" },
  paysponge: { domain: "paysponge.com" },
};

const INFRA_PREFIXES = new Set(["x402", "api", "www", "pro-api"]);

function brandKeyCandidatesFromFqn(fqn: string | undefined): string[] {
  if (!fqn) return [];
  const segs = fqn.split("/").filter(Boolean).map((s) => s.toLowerCase());
  if (segs.length === 0) return [];
  if (segs.length >= 3) {
    // 3-segment fqn (solana-foundation/<brand>/<service>, merit-systems/<brand>/<service>)
    // → middle segment is the brand. The leading namespace (solana-foundation,
    // merit-systems) is a publisher, not a brand.
    return [segs[1]!];
  }
  if (segs.length >= 2) {
    // 2-segment fqn: either <brand>/<service> (agentmail/email) or
    // <publisher>/<brand> (paysponge/fal). Try both, preferring the inner
    // segment because publisher namespaces tend to be the more curated key.
    return [segs[1]!, segs[0]!];
  }
  // Single segment. The catalog row may be using a hostname here (e.g.
  // "api.nansen.ai") instead of an atlas-style fqn. Pull the apex label out
  // so we can still match a curated brand key.
  const only = segs[0]!;
  if (only.includes(".")) {
    const labels = only.split(".").filter(Boolean);
    // For api.nansen.ai → labels = [api, nansen, ai] → second-to-last = "nansen".
    if (labels.length >= 2) return [labels[labels.length - 2]!];
  }
  return [only];
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isWrapperHost(host: string): boolean {
  return (
    host.endsWith(".gateway-402.com")
    || host.endsWith(".x402.paysponge.com")
    || host.endsWith(".run.app")
  );
}

function stripInfraPrefix(host: string): string {
  const labels = host.split(".");
  while (labels.length > 2 && INFRA_PREFIXES.has(labels[0]!.toLowerCase())) {
    labels.shift();
  }
  return labels.join(".");
}

export type BrandResolution = {
  domain: string | null;
  /** Direct icon URL when the brand entry overrides Google favicon resolution. */
  iconUrl?: string;
  reason: "curated" | "direct-host" | "fqn-fallback" | "none";
};

/**
 * Best-effort favicon domain for a Pay.sh provider.
 *
 * Priority:
 *   1. Curated map keyed by the brand segment of `fqn` (handles wrapper hosts
 *      like *.gateway-402.com / *.x402.paysponge.com whose subdomain labels
 *      match a known brand even when the apex domain doesn't). May also
 *      provide a direct iconUrl override.
 *   2. Direct brand host (api.purch.xyz → purch.xyz, x402.quicknode.com →
 *      quicknode.com) by stripping infra prefixes.
 *   3. Curated map keyed only by `fqn` segment when the host doesn't help.
 *   4. Give up; caller should fall back to the monogram avatar.
 */
export function inferBrandDomain({
  fqn,
  serviceUrl,
}: {
  fqn?: string;
  serviceUrl?: string;
}): BrandResolution {
  const candidates = brandKeyCandidatesFromFqn(fqn);
  for (const key of candidates) {
    const entry = BRAND_BY_KEY[key];
    if (entry) {
      return { domain: entry.domain, iconUrl: entry.iconUrl, reason: "curated" };
    }
  }

  if (serviceUrl) {
    const u = safeUrl(serviceUrl);
    if (u && u.hostname) {
      const host = u.hostname.toLowerCase();
      if (!isWrapperHost(host)) {
        const stripped = stripInfraPrefix(host);
        if (stripped.includes(".")) {
          return { domain: stripped, reason: "direct-host" };
        }
      }
    }
  }

  if (candidates.length > 0) {
    return { domain: null, reason: "fqn-fallback" };
  }
  return { domain: null, reason: "none" };
}
