// Bake a single GEO data file by fusing the Pay.sh atlas snapshot already
// embedded in `apps/bff/fixtures/generated/analytics.json` with the MPP
// services registry capture at `tmp/mpp-provider-catalog.json`.
//
// The output (`apps/frontend/data/geo-providers.json`) is the only data file
// the GEO page reads at runtime. Frontend looks up the active provider via
// `lookupKeys` (serviceId / brandKey / payTo / nameToken) so the page works
// even when the live BFF (DB-backed) returns providerIds that don't match
// any internal catalog id.

import fs from "node:fs";
import path from "node:path";
import { writeAtomically } from "./io";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..", "..");
const DEFAULT_ANALYTICS_PATH = path.join(
  REPO_ROOT,
  "apps",
  "bff",
  "fixtures",
  "generated",
  "analytics.json",
);
const DEFAULT_ATLAS_PATH = path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md");
const DEFAULT_MPP_PATH = path.join(REPO_ROOT, "tmp", "mpp-provider-catalog.json");
const DEFAULT_OUTPUT_PATH = path.join(REPO_ROOT, "apps", "frontend", "data", "geo-providers.json");

type CliOptions = {
  analyticsPath: string;
  atlasPath: string;
  mppPath: string;
  outputPath: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    analyticsPath: process.env.GEO_BAKE_ANALYTICS_PATH ?? DEFAULT_ANALYTICS_PATH,
    atlasPath: process.env.GEO_BAKE_ATLAS_PATH ?? DEFAULT_ATLAS_PATH,
    mppPath: process.env.GEO_BAKE_MPP_PATH ?? DEFAULT_MPP_PATH,
    outputPath: process.env.GEO_BAKE_OUTPUT ?? DEFAULT_OUTPUT_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--analytics") options.analyticsPath = next() ?? options.analyticsPath;
    else if (arg === "--atlas") options.atlasPath = next() ?? options.atlasPath;
    else if (arg === "--mpp") options.mppPath = next() ?? options.mppPath;
    else if (arg === "--output") options.outputPath = next() ?? options.outputPath;
  }
  return options;
};

// --- Pay.sh atlas markdown parser (description / use case / offers) -----
// Mirrors the previous frontend-side parser closely so the baked JSON
// reproduces what `getGeoSpec` used to compute at runtime.

type AtlasEntry = {
  fqn: string;
  title: string;
  category: string;
  serviceUrl: string;
  description: string;
  useCase: string;
  endpointCount: number;
  priceRangeUsd: { min: number; max: number } | null;
  offers: GeoOffer[];
};

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
};

const stripBackticks = (value: string): string => value.replace(/^`|`$/g, "").trim();

const stripAngleUrl = (value: string): string => {
  const match = value.match(/^<(.+)>$/);
  return match ? (match[1] as string) : value;
};

const parsePriceRange = (raw: string): { min: number; max: number } | null => {
  if (!raw || raw === "—" || raw === "-") return null;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const dashSplit = cleaned.split(/\s*[–-]\s*/);
  const parsed = dashSplit.map((token) => Number.parseFloat(token));
  if (parsed.some((n) => Number.isNaN(n))) return null;
  if (parsed.length === 1 && typeof parsed[0] === "number") {
    return { min: parsed[0], max: parsed[0] };
  }
  return { min: Math.min(...parsed), max: Math.max(...parsed) };
};

const parseAtlas = (md: string): Map<string, AtlasEntry> => {
  const lines = md.split("\n");
  const entries = new Map<string, AtlasEntry>();
  // Provider descriptions
  const descStart = lines.findIndex((l) => l.startsWith("## Provider descriptions"));
  if (descStart !== -1) {
    for (let i = descStart + 1; i < lines.length; i++) {
      const line = lines[i] as string;
      if (line.startsWith("---") || line.startsWith("## ")) break;
      const cells = splitTableRow(line);
      if (cells.length !== 8) continue;
      const fqn = stripBackticks(cells[0] as string);
      if (!fqn || fqn === "Provider (fqn)" || fqn.startsWith("---")) continue;
      entries.set(fqn, {
        fqn,
        title: cells[1] as string,
        category: cells[2] as string,
        serviceUrl: stripAngleUrl(cells[3] as string),
        description: cells[4] as string,
        useCase: cells[5] as string,
        endpointCount: Number.parseInt((cells[6] as string) || "0", 10) || 0,
        priceRangeUsd: parsePriceRange((cells[7] as string) || ""),
        offers: [],
      });
    }
  }
  // Per-provider payment table (offers)
  const payStart = lines.findIndex((l) => l.startsWith("## Per-provider payment table"));
  if (payStart !== -1) {
    for (let i = payStart + 1; i < lines.length; i++) {
      const line = lines[i] as string;
      if (line.startsWith("---") || line.startsWith("## ")) break;
      const cells = splitTableRow(line);
      if (cells.length !== 8) continue;
      const fqn = stripBackticks(cells[0] as string);
      if (!fqn || fqn === "Provider (fqn)" || fqn.startsWith("---")) continue;
      const protocol = cells[3] as string;
      const payToRaw = stripBackticks(cells[6] as string);
      if (protocol === "—" || payToRaw.startsWith("_no challenge")) continue;
      if (protocol !== "x402" && protocol !== "MPP") continue;
      const probe = Number.parseFloat((cells[7] as string) || "");
      const offer: GeoOffer = {
        protocol,
        chain: cells[4] as string,
        asset: cells[5] as string,
        payTo: payToRaw,
        probePriceUsd: Number.isNaN(probe) ? 0 : probe,
      };
      const entry = entries.get(fqn);
      if (entry) entry.offers.push(offer);
    }
  }
  return entries;
};

type ProviderResource = {
  resource: string;
  network?: string;
  asset?: string;
  amountAtomic?: string;
  description?: string;
  method?: string;
  intent?: "charge" | "session";
  unitType?: string;
  dynamic?: boolean;
  decimals?: number;
};

type CatalogRow = {
  providerId: string;
  name: string;
  serviceId?: string;
  serviceName?: string;
  network: string;
  asset: string;
  payTo: string;
  protocol?: "x402" | "MPP";
  chain?: string;
  assetSymbol?: string;
  catalogSource?: string;
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceUrl?: string;
  hasMetering?: boolean;
  hasFreeTier?: boolean;
  providerSha?: string;
  registryVersion?: string;
  registryGeneratedAt?: string;
  registrySourceUrl?: string;
  endpointCount?: number;
  priceRangeUsd?: { min: number; max: number };
  resources?: ProviderResource[];
  mppDescription?: string;
};

type GeoOffer = {
  protocol: "x402" | "MPP";
  chain: string;
  asset: string;
  payTo: string;
  probePriceUsd: number;
};

type ObservedEndpoint = {
  resource: string;
  description?: string;
  method?: string;
  networks: string[];
  assets: string[];
  transactionCount: number;
  totalAmountAtomic: string;
};

type AnalyticsX402Service = {
  payTo?: string | null;
  resource?: string | null;
  network?: string | null;
  asset?: string | null;
  transactionCount?: number | null;
  totalAmountAtomic?: string | null;
};

type BakedGeoProvider = {
  id: string;
  lookupKeys: {
    brandKey?: string;
    serviceIds: string[];
    payTos: string[];
    nameTokens: string[];
  };
  title: string | null;
  category: string | null;
  serviceUrl: string | null;
  endpointCount: number | null;
  hasMetering: boolean | null;
  hasFreeTier: boolean | null;
  providerSha: string | null;
  registryVersion: string | null;
  registryGeneratedAt: string | null;
  registrySourceUrl: string | null;
  priceRangeUsd: { min: number; max: number } | null;
  paySh: {
    description: string | null;
    useCase: string | null;
    offers: GeoOffer[];
    observedEndpoints: ObservedEndpoint[];
  } | null;
  mpp: {
    description: string | null;
    endpoints: ProviderResource[];
  } | null;
};

type BakedGeoFile = {
  version: 1;
  generatedAt: string;
  providers: BakedGeoProvider[];
};

// Brand-key extraction (mirrors apps/frontend/lib/pay-sh/brand.ts behavior
// closely enough that the frontend's runtime extractor will find a match).
const KNOWN_PUBLISHERS = new Set([
  "solana-foundation",
  "merit-systems",
  "paysponge",
]);

const extractBrandKey = (serviceId: string | undefined): string | null => {
  if (!serviceId) return null;
  const trimmed = serviceId.trim();
  if (!trimmed) return null;
  // hostname-style: api.nansen.ai → "nansen"
  if (!trimmed.includes("/") && trimmed.includes(".")) {
    const labels = trimmed.split(".").filter(Boolean);
    if (labels.length >= 2) return labels[labels.length - 2]!.toLowerCase();
  }
  const segs = trimmed
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  if (segs.length >= 3) return segs[1] ?? segs[0]!;
  if (segs.length === 2) {
    // <publisher>/<brand> when the leading segment is a known publisher;
    // otherwise <brand>/<service>.
    if (KNOWN_PUBLISHERS.has(segs[0]!)) return segs[1]!;
    return segs[0]!;
  }
  return segs[0]!;
};

const isPaySh = (row: CatalogRow): boolean =>
  row.catalogSource !== "mpp_registry" && !row.providerId.startsWith("mpp:");

const normalizePayTo = (payTo: string): string => payTo.trim().toLowerCase();

const buildOffer = (row: CatalogRow): GeoOffer => ({
  protocol: row.protocol ?? "x402",
  chain: row.chain ?? row.network,
  asset: row.assetSymbol ?? row.asset,
  payTo: row.payTo,
  probePriceUsd: row.priceRangeUsd ? row.priceRangeUsd.max : 0,
});

const dedupOffers = (offers: GeoOffer[]): GeoOffer[] => {
  const seen = new Map<string, GeoOffer>();
  for (const o of offers) {
    const key = [o.protocol, o.chain, o.asset, normalizePayTo(o.payTo)].join("::");
    if (!seen.has(key)) seen.set(key, o);
  }
  return Array.from(seen.values());
};

const groupKeyOf = (row: CatalogRow): string => {
  const brand = extractBrandKey(row.serviceId);
  if (brand) return `brand:${brand}`;
  // Hostname-style without a brand-key: fall back to display name.
  const fallback = (row.name ?? row.serviceId ?? row.providerId).trim().toLowerCase();
  return `name:${fallback}`;
};

const hostnameOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

// Mirrors apps/frontend/lib/geo-spec/source.ts target host extraction so the
// observed endpoints bucket lines up exactly with what the previous runtime
// path used to produce.
const targetHostFor = (winner: CatalogRow): string => {
  const host = hostnameOf(winner.serviceUrl) ?? hostnameOf(winner.serviceId ?? null);
  if (host) return host;
  return (winner.serviceId ?? winner.name ?? "").toLowerCase();
};

const collectObservedEndpoints = (
  intel: Record<string, { x402Services?: AnalyticsX402Service[] }> | undefined,
  targetHost: string,
): ObservedEndpoint[] => {
  if (!intel) return [];
  const endpointsMap = new Map<
    string,
    {
      resource: string;
      networks: Set<string>;
      assets: Set<string>;
      tx: number;
      totalAtomic: bigint;
    }
  >();
  for (const entry of Object.values(intel)) {
    for (const slot of entry.x402Services ?? []) {
      const resource = slot.resource ?? "";
      if (!resource) continue;
      const slotHost = hostnameOf(resource);
      if (!slotHost) continue;
      // Exact hostname match only — mirrors the previous runtime behavior in
      // apps/frontend/lib/geo-spec/source.ts. A wider apex-label match could
      // mix observations from foo.brand.com and bar.brand.com under the same
      // provider when those subdomains happen to be unrelated services.
      if (slotHost !== targetHost) continue;
      const tx = typeof slot.transactionCount === "number" ? slot.transactionCount : 0;
      const atomic = (() => {
        try {
          return BigInt(slot.totalAmountAtomic ?? "0");
        } catch {
          return 0n;
        }
      })();
      const existing = endpointsMap.get(resource);
      if (!existing) {
        endpointsMap.set(resource, {
          resource,
          networks: new Set(slot.network ? [slot.network] : []),
          assets: new Set(slot.asset ? [slot.asset] : []),
          tx,
          totalAtomic: atomic,
        });
      } else {
        if (slot.network) existing.networks.add(slot.network);
        if (slot.asset) existing.assets.add(slot.asset);
        existing.tx += tx;
        existing.totalAtomic += atomic;
      }
    }
  }
  return Array.from(endpointsMap.values())
    .map((e) => ({
      resource: e.resource,
      networks: Array.from(e.networks).sort(),
      assets: Array.from(e.assets).sort(),
      transactionCount: e.tx,
      totalAmountAtomic: e.totalAtomic.toString(),
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount);
};

const matchesAtlas = (
  entry: AtlasEntry,
  serviceId: string | undefined,
  serviceUrl: string | undefined,
): boolean => {
  if (!serviceId) return false;
  const sidLower = serviceId.toLowerCase();
  const fqn = entry.fqn.toLowerCase();
  if (sidLower === fqn) return true;
  if (fqn.includes(sidLower)) return true;
  // serviceUrl host = atlas host
  try {
    if (serviceUrl) {
      const sUrlHost = new URL(serviceUrl).hostname.toLowerCase();
      const aUrlHost = new URL(entry.serviceUrl).hostname.toLowerCase();
      if (sUrlHost === aUrlHost) return true;
    }
  } catch {
    /* ignore */
  }
  // brand-segment intersection
  const sidSegs = sidLower.split(/[/.]/).filter(Boolean);
  const fqnSegs = fqn.split(/[/]/).filter(Boolean);
  for (const seg of sidSegs) {
    if (seg.length >= 3 && fqnSegs.includes(seg)) return true;
  }
  return false;
};

const findAtlasFor = (
  atlasEntries: AtlasEntry[],
  rows: CatalogRow[],
): AtlasEntry | undefined => {
  for (const row of rows) {
    const match = atlasEntries.find((e) => matchesAtlas(e, row.serviceId, row.serviceUrl));
    if (match) return match;
  }
  return undefined;
};

const bake = (input: {
  analytics: CatalogRow[];
  mpp: CatalogRow[];
  atlas: AtlasEntry[];
  intel?: Record<string, { x402Services?: AnalyticsX402Service[] }>;
}): BakedGeoFile => {
  type Group = {
    rows: CatalogRow[];
    serviceIds: Set<string>;
    payTos: Set<string>;
    nameTokens: Set<string>;
  };
  const groups = new Map<string, Group>();
  const allRows = [...input.analytics, ...input.mpp];
  for (const row of allRows) {
    const key = groupKeyOf(row);
    let g = groups.get(key);
    if (!g) {
      g = { rows: [], serviceIds: new Set(), payTos: new Set(), nameTokens: new Set() };
      groups.set(key, g);
    }
    g.rows.push(row);
    if (row.serviceId) g.serviceIds.add(row.serviceId);
    if (row.serviceName) g.serviceIds.add(row.serviceName);
    if (row.payTo) g.payTos.add(normalizePayTo(row.payTo));
    if (row.name) g.nameTokens.add(row.name.toLowerCase());
    if (row.title) g.nameTokens.add(row.title.toLowerCase());
  }

  const providers: BakedGeoProvider[] = [];
  for (const [key, g] of groups) {
    const paySh = g.rows.filter(isPaySh);
    const mpp = g.rows.filter((r) => !isPaySh(r));
    const winner = paySh[0] ?? mpp[0] ?? g.rows[0]!;

    const brand = key.startsWith("brand:") ? key.slice("brand:".length) : undefined;

    // Pay.sh offers are one row per (protocol, chain, asset, payTo).
    const fixtureOffers = dedupOffers(paySh.map(buildOffer));

    // MPP block aggregates all MPP-side resources (one entry per paid endpoint).
    const mppResources: ProviderResource[] = [];
    for (const m of mpp) {
      for (const r of m.resources ?? []) mppResources.push(r);
    }
    const mppDescription = mpp.find((m) => m.mppDescription)?.mppDescription ?? null;

    // Atlas md is the canonical source for Pay.sh description / use case /
    // category / serviceUrl when the analytics.json row lacks them. Match by
    // serviceId/url across any Pay.sh-side row in this brand group.
    const atlasMatch = findAtlasFor(input.atlas, paySh);

    const payShDescription =
      atlasMatch?.description ??
      paySh.find((r) => r.description)?.description ??
      null;
    const payShUseCase =
      atlasMatch?.useCase ?? paySh.find((r) => r.useCase)?.useCase ?? null;
    // Atlas-published offers can be richer than fixture-derived ones (e.g.
    // they include probePriceUsd). Prefer atlas offers when matched.
    const offers = atlasMatch?.offers && atlasMatch.offers.length > 0
      ? atlasMatch.offers
      : fixtureOffers;

    const provider: BakedGeoProvider = {
      id: key,
      lookupKeys: {
        brandKey: brand,
        serviceIds: Array.from(g.serviceIds),
        payTos: Array.from(g.payTos),
        nameTokens: Array.from(g.nameTokens),
      },
      title: winner.title ?? winner.name ?? null,
      category: winner.category ?? null,
      serviceUrl: winner.serviceUrl ?? null,
      endpointCount: winner.endpointCount ?? null,
      hasMetering: winner.hasMetering ?? null,
      hasFreeTier: winner.hasFreeTier ?? null,
      providerSha: winner.providerSha ?? null,
      registryVersion: winner.registryVersion ?? null,
      registryGeneratedAt: winner.registryGeneratedAt ?? null,
      registrySourceUrl: winner.registrySourceUrl ?? null,
      priceRangeUsd: winner.priceRangeUsd ?? null,
      paySh:
        paySh.length > 0
          ? {
              description: payShDescription,
              useCase: payShUseCase,
              offers,
              observedEndpoints: collectObservedEndpoints(input.intel, targetHostFor(winner)),
            }
          : null,
      mpp:
        mpp.length > 0
          ? {
              description: mppDescription,
              endpoints: mppResources,
            }
          : null,
    };
    providers.push(provider);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    providers,
  };
};

const main = async () => {
  const options = parseArgs(Bun.argv.slice(2));
  if (!fs.existsSync(options.analyticsPath)) {
    throw new Error(`analytics file not found: ${options.analyticsPath}`);
  }
  const analyticsRaw = JSON.parse(fs.readFileSync(options.analyticsPath, "utf8"));
  const analyticsRows: CatalogRow[] = analyticsRaw.providers?.providers ?? [];
  const intel = analyticsRaw.intelligenceByAddress as
    | Record<string, { x402Services?: AnalyticsX402Service[] }>
    | undefined;

  let atlasEntries: AtlasEntry[] = [];
  if (fs.existsSync(options.atlasPath)) {
    const md = fs.readFileSync(options.atlasPath, "utf8");
    atlasEntries = Array.from(parseAtlas(md).values());
  } else {
    console.warn(
      `[bake-geo-providers] Atlas markdown not found at ${options.atlasPath} — Pay.sh descriptions may be sparse`,
    );
  }

  let mppRows: CatalogRow[] = [];
  if (fs.existsSync(options.mppPath)) {
    const mppRaw = JSON.parse(fs.readFileSync(options.mppPath, "utf8"));
    mppRows = mppRaw.providers ?? [];
  } else {
    console.warn(`[bake-geo-providers] MPP catalog not found at ${options.mppPath} — baking Pay.sh-only`);
  }

  const baked = bake({ analytics: analyticsRows, mpp: mppRows, atlas: atlasEntries, intel });
  writeAtomically(options.outputPath, `${JSON.stringify(baked, null, 2)}\n`);
  console.log(
    `[bake-geo-providers] wrote ${baked.providers.length} providers -> ${options.outputPath}`,
  );
};

if (import.meta.main) {
  await main();
}
