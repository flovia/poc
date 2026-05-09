// Resolve a Pay.sh provider to a likely "brand" favicon domain.
// The Pay.sh atlas (skills.json) only carries `fqn` and `service_url`. Most
// service_url hosts are x402 wrappers (e.g. *.gateway-402.com,
// *.x402.paysponge.com) that share favicons across unrelated brands, so we
// need to map them back to the underlying provider domain by hand.

type BrandEntry = {
  domain: string;
  displayName?: string;
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
    displayName: "Nansen",
    iconUrl: "https://framerusercontent.com/images/X6PAJXo4BDwSFLJcxI2JZNWsQ.png",
  },
  purch: { domain: "purch.xyz" },
  quicknode: { domain: "quicknode.com" },
  socialintel: { domain: "socialintel.dev" },
  paysponge: { domain: "paysponge.com" },
};

// MPP gateway brand map. Keyed by the leading subdomain label of an MPP
// wrapper host (e.g. `openai.mpp.tempo.xyz` -> "openai") OR by the bare
// MPP serviceId returned by `https://mpp.dev/api/services`. This map is
// intentionally separate from BRAND_BY_KEY so generic fqn lookups
// (e.g. `quicknode/rpc`) don't accidentally hit MPP-specific entries
// like `rpc -> tempo.xyz`.
const MPP_BRAND_BY_SERVICE: Record<string, BrandEntry> = {
  agentmail: { domain: "agentmail.to" },
  alchemy: { domain: "alchemy.com" },
  allium: { domain: "allium.so" },
  anthropic: { domain: "anthropic.com" },
  aviationstack: { domain: "aviationstack.com" },
  browserbase: { domain: "browserbase.com" },
  codestorage: { domain: "tempo.xyz" }, // Tempo-internal service, no public homepage
  deepl: { domain: "deepl.com" },
  deepseek: { domain: "deepseek.com" },
  doma: { domain: "doma.xyz" },
  dune: { domain: "dune.com" },
  exa: { domain: "exa.ai" },
  fal: { domain: "fal.ai" },
  firecrawl: { domain: "firecrawl.dev" },
  flightapi: { domain: "flightapi.io" },
  gemini: { domain: "gemini.google.com" },
  goflightlabs: { domain: "goflightlabs.com" },
  googlemaps: { domain: "maps.google.com" },
  govlaws: { domain: "govlaws.ai" },
  groq: { domain: "groq.com" },
  hunter: { domain: "hunter.io" },
  kicksdb: { domain: "kicks.dev" },
  "martin-estate": { domain: "martinestate.com" },
  modal: { domain: "modal.com" },
  moltycash: { domain: "molty.cash" },
  nansen: { domain: "nansen.ai" },
  openai: { domain: "openai.com" },
  openrouter: { domain: "openrouter.ai" },
  oxylabs: { domain: "oxylabs.io" },
  parallel: { domain: "parallel.ai" },
  pinata: { domain: "pinata.cloud" },
  rentcast: { domain: "rentcast.io" },
  rpc: { domain: "tempo.xyz" }, // Tempo-internal RPC service
  serpapi: { domain: "serpapi.com" },
  spyfu: { domain: "spyfu.com" },
  stableemail: { domain: "stableemail.dev" },
  stableenrich: { domain: "stableenrich.dev" },
  stablephone: { domain: "stablephone.dev" },
  stablesocial: { domain: "stablesocial.dev" },
  stabletravel: { domain: "stabletravel.dev" },
  storage: { domain: "tempo.xyz" }, // Tempo-internal storage service
  tako: { domain: "tako.com" },
  twocaptcha: { domain: "2captcha.com" },
};

const INFRA_PREFIXES = new Set(["x402", "api", "www", "pro-api", "mpp"]);

function brandKeyCandidatesFromFqn(fqn: string | undefined): string[] {
  if (!fqn) return [];
  const segs = fqn
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());
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
    host.endsWith(".gateway-402.com") ||
    host.endsWith(".x402.paysponge.com") ||
    host.endsWith(".run.app")
  );
}

// MPP gateway suffixes that wrap third-party brand APIs. The leading subdomain
// label of the host is the brand id (e.g. `openai.mpp.tempo.xyz` -> `openai`).
// The wrapper apex domain itself (tempo.xyz, paywithlocus.com) is NOT a useful
// favicon target for the wrapped brand.
const MPP_WRAPPER_SUFFIXES = [".mpp.tempo.xyz", ".mpp.paywithlocus.com"] as const;

/**
 * Resolve a `<brand>.mpp.<wrapper>` host to a favicon-bearing domain.
 *
 * Priority:
 *   1. Curated `BRAND_BY_KEY[brand]` (preferred — Google's favicon resolver
 *      reliably has the icon and we know the brand's true homepage).
 *   2. `<brand>.com` as a best-effort guess for unmapped brands.
 *
 * Returns null when the host is not an MPP wrapper or has no brand label.
 */
function mppWrapperBrandHost(host: string): string | null {
  const suffix = MPP_WRAPPER_SUFFIXES.find((s) => host.endsWith(s));
  if (!suffix) return null;
  const labels = host.slice(0, -suffix.length).split(".");
  // For `<brand>.mpp.<wrapper>` we expect a single brand label here.
  // For `<brand>.<sub>.mpp.<wrapper>` we still take the leading label.
  const brand = labels[0]?.toLowerCase();
  if (!brand) return null;
  const mpp = MPP_BRAND_BY_SERVICE[brand];
  if (mpp) return mpp.domain;
  const curated = BRAND_BY_KEY[brand];
  if (curated) return curated.domain;
  return `${brand}.com`;
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

function findCuratedBrandEntry(fqn: string | undefined): BrandEntry | undefined {
  const candidates = brandKeyCandidatesFromFqn(fqn);
  for (const key of candidates) {
    const entry = BRAND_BY_KEY[key];
    if (entry) return entry;
  }
  return undefined;
}

export function inferBrandDisplayName({ fqn }: { fqn?: string }): string | null {
  return findCuratedBrandEntry(fqn)?.displayName ?? null;
}

/**
 * Reduce a Pay.sh / MPP-style serviceId down to a single "brand key" so that
 * rows describing the same provider on different catalogs (or different
 * networks) can be deduplicated for display.
 *
 * - `agentmail/email` → `agentmail`
 * - `merit-systems/stablesocial/social-data` → `stablesocial`
 * - `pro-api.coingecko.com` → `coingecko`
 * - `api.nansen.ai` → `nansen`
 * - `agentmail` → `agentmail`
 *
 * Returns null when no usable key can be extracted (undefined / empty input).
 */
export function extractBrandKey(serviceId: string | undefined | null): string | null {
  if (!serviceId) return null;
  const trimmed = serviceId.trim();
  if (trimmed.length === 0) return null;
  const segs = trimmed
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  if (segs.length === 0) {
    return brandKeyCandidatesFromFqn(trimmed)[0] ?? null;
  }

  // Single-segment serviceIds (`agentmail`, `api.nansen.ai`, `rpc`) — defer
  // to the fqn helper which knows how to peel hostname labels.
  if (segs.length === 1) {
    const candidates = brandKeyCandidatesFromFqn(trimmed);
    for (const key of candidates) {
      if (BRAND_BY_KEY[key] || MPP_BRAND_BY_SERVICE[key]) return key;
    }
    return candidates[0] ?? null;
  }

  // Multi-segment Pay.sh fqns: the brand position depends on whether the
  // leading segment is a known publisher namespace (solana-foundation,
  // merit-systems, paysponge → brand is the second segment) or the brand
  // itself (agentmail/email, quicknode/rpc → brand is the first segment).
  // We must NOT fall back to MPP_BRAND_BY_SERVICE on the trailing segment
  // here — that map is keyed on single-segment MPP serviceIds (`rpc`,
  // `email`, ...) and would wrongly collapse `quicknode/rpc` into the
  // Tempo `rpc` brand, mixing unrelated catalog sources on the picker card.
  const leading = segs[0]!;
  if (segs.length >= 3) {
    return segs[1] ?? leading;
  }
  if (KNOWN_PUBLISHERS.has(leading)) {
    return segs[1] ?? leading;
  }
  return leading;
}

// Publisher namespaces whose leading fqn segment is metadata, not a brand.
// Mirrors `bake-geo-providers.ts#KNOWN_PUBLISHERS` so the frontend lookup
// keys agree with the baked GEO data.
const KNOWN_PUBLISHERS = new Set(["solana-foundation", "merit-systems", "paysponge"]);

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
  // MPP serviceId lookup. Done after BRAND_BY_KEY (so curated `quicknode/rpc`
  // wins over MPP `rpc -> tempo.xyz`) but before serviceUrl host parsing (so
  // `martin-estate` -> `martinestate.com` overrides `agents.martinestate.com`).
  for (const key of candidates) {
    const entry = MPP_BRAND_BY_SERVICE[key];
    if (entry) {
      return { domain: entry.domain, iconUrl: entry.iconUrl, reason: "curated" };
    }
  }

  if (serviceUrl) {
    const u = safeUrl(serviceUrl);
    if (u && u.hostname) {
      const host = u.hostname.toLowerCase();
      // MPP gateway wrapper hosts (`<brand>.mpp.tempo.xyz`,
      // `<brand>.mpp.paywithlocus.com`). Stripping infra prefixes alone would
      // yield the wrapper apex (tempo.xyz / paywithlocus.com), whose favicon
      // is the gateway's, not the wrapped brand's. Resolve via the leading
      // brand label, preferring the curated map over a `<brand>.com` guess.
      const wrapperBrand = mppWrapperBrandHost(host);
      if (wrapperBrand) {
        return { domain: wrapperBrand, reason: "direct-host" };
      }
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
