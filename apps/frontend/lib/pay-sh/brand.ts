// Resolve a Pay.sh provider to a likely "brand" favicon domain.
// The Pay.sh atlas (skills.json) only carries `fqn` and `service_url`. Most
// service_url hosts are x402 wrappers (e.g. *.gateway-402.com,
// *.x402.paysponge.com) that share favicons across unrelated brands, so we
// need to map them back to the underlying provider domain by hand.

const BRAND_DOMAIN_BY_KEY: Record<string, string> = {
  // solana-foundation / google / *
  google: "google.com",
  // solana-foundation / alibaba / *
  alibaba: "alibaba.com",
  // paysponge / *
  "2captcha": "2captcha.com",
  fal: "fal.ai",
  perplexity: "perplexity.ai",
  wolframalpha: "wolframalpha.com",
  rentcast: "rentcast.io",
  screenshotone: "screenshotone.com",
  tripadvisor: "tripadvisor.com",
  coingecko: "coingecko.com",
  reducto: "reducto.ai",
  textbelt: "textbelt.com",
  // merit-systems / stable* / *
  stablecrypto: "stablecrypto.dev",
  stabledomains: "stabledomains.dev",
  stableemail: "stableemail.dev",
  stableenrich: "stableenrich.dev",
  stablemerch: "stablemerch.dev",
  stablephone: "stablephone.dev",
  stablesocial: "stablesocial.dev",
  stablestudio: "stablestudio.dev",
  stableupload: "stableupload.dev",
  // top-level brands (single-segment fqn)
  agentmail: "agentmail.to",
  crushrewards: "crushrewards.dev",
  dtelecom: "dtelecom.org",
  purch: "purch.xyz",
  quicknode: "quicknode.com",
  socialintel: "socialintel.dev",
  paysponge: "paysponge.com",
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
  // 2-segment fqn: either <brand>/<service> (agentmail/email) or
  // <publisher>/<brand> (paysponge/fal). Try both, preferring the inner
  // segment because publisher namespaces tend to be the more curated key.
  return [segs[1]!, segs[0]!];
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
  reason: "curated" | "direct-host" | "fqn-fallback" | "none";
};

/**
 * Best-effort favicon domain for a Pay.sh provider.
 *
 * Priority:
 *   1. Curated map keyed by the brand segment of `fqn` (handles wrapper hosts
 *      like *.gateway-402.com / *.x402.paysponge.com whose subdomain labels
 *      match a known brand even when the apex domain doesn't).
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
    if (BRAND_DOMAIN_BY_KEY[key]) {
      return { domain: BRAND_DOMAIN_BY_KEY[key]!, reason: "curated" };
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
