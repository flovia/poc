// GEO spec データ源。サーバー側で
//   1) docs/research/pay-skills-payment-atlas.md (provider description / offer 単価)
//   2) apps/bff/fixtures/generated/analytics.json (catalog 行 / 観測された API パス)
// を読み合成する。Atlas は per-endpoint の単価を持たないため、
// path 一覧は customer の x402Services から逆引きし、料金は per-offer probe price
// (chain × asset × payTo) のみを表示する。

import fs from "node:fs";
import path from "node:path";

export type GeoOffer = {
  protocol: "x402" | "MPP";
  chain: string;
  asset: string;
  payTo: string;
  probePriceUsd: number;
};

export type GeoEndpoint = {
  resource: string;
  description?: string;
  method?: string;
  lastUpdated?: string;
  x402Version?: number;
  l30DaysUniquePayers?: number;
  networks: string[];
  assets: string[];
  transactionCount: number;
  totalAmountAtomic: string;
};

/**
 * Endpoint declared in the MPP services registry, with the registry's payment
 * metadata. Unlike `GeoEndpoint` (observed on-chain), these are catalog
 * declarations: each row has a path, an intent (charge or session), a unit
 * type when known, a dynamic flag for runtime-priced calls (e.g. LLM tokens),
 * and a fixed atomic amount for charge-style endpoints.
 */
export type MppRegistryEndpoint = {
  resource: string;
  method?: string;
  description?: string;
  intent?: "charge" | "session";
  unitType?: string;
  dynamic?: boolean;
  amountAtomic?: string;
  decimals?: number;
  asset?: string;
  network?: string;
};

export type GeoSpec = {
  serviceId: string;
  serviceUrl: string | null;
  title: string | null;
  category: string | null;
  description: string | null;
  /**
   * Description published by the MPP services registry. Rendered separately
   * from `description` (Pay.sh atlas) on the GEO page so each catalog source
   * can be attributed independently.
   */
  mppDescription: string | null;
  useCase: string | null;
  endpointCount: number | null;
  hasMetering: boolean | null;
  hasFreeTier: boolean | null;
  providerSha: string | null;
  registryVersion: string | null;
  registryGeneratedAt: string | null;
  registrySourceUrl: string | null;
  priceRangeUsd: { min: number; max: number } | null;
  offers: GeoOffer[];
  observedEndpoints: GeoEndpoint[];
  /**
   * MPP services registry が宣言する各 paid endpoint と料金体系。
   * Pay.sh の "API paths observed" と同形式の表で描画する。
   * MPP 由来でない provider では空配列。
   */
  mppEndpoints: MppRegistryEndpoint[];
  // atlas に該当 provider が見つからなかったときに true。
  // 観測データのみで GEO まとまりは空表示になる。
  atlasMissing: boolean;
};

// `apps/frontend/` (Next 起動時) でも repo root (CLI / smoke test) でも動くよう、
// cwd と "ひとつ上のディレクトリを 2 段" の両候補を試す。
const findRepoRoot = (): string => {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "..", "..")];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "docs", "research", "pay-skills-payment-atlas.md"))) {
      return c;
    }
  }
  return cwd;
};
const REPO_ROOT = findRepoRoot();
const ATLAS_PATH = path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md");
const ANALYTICS_PATH = path.join(
  REPO_ROOT,
  "apps",
  "bff",
  "fixtures",
  "generated",
  "analytics.json",
);

type AtlasProviderDesc = {
  fqn: string;
  title: string;
  category: string;
  serviceUrl: string;
  description: string;
  useCase: string;
  endpointCount: number;
  priceRangeUsd: { min: number; max: number } | null;
  hasMetering?: boolean | null;
  hasFreeTier?: boolean | null;
  providerSha?: string | null;
  registryVersion?: string | null;
  registryGeneratedAt?: string | null;
  registrySourceUrl?: string | null;
};

type AtlasProvider = AtlasProviderDesc & {
  offers: GeoOffer[];
};

type AnalyticsCatalogRow = {
  providerId: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  mppDescription?: string | null;
  useCase?: string | null;
  category?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceUrl?: string | null;
  endpointCount?: number | null;
  hasMetering?: boolean | null;
  hasFreeTier?: boolean | null;
  providerSha?: string | null;
  registryVersion?: string | null;
  registryGeneratedAt?: string | null;
  registrySourceUrl?: string | null;
  priceRangeUsd?: { min: number; max: number } | null;
  offers?: GeoOffer[];
  payTo: string;
  network: string;
  asset: string;
  resources?: GeoSpecProviderHint["resources"];
};

export type GeoSpecProviderHint = {
  providerId: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  mppDescription?: string | null;
  useCase?: string | null;
  category?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceUrl?: string | null;
  payTo: string;
  network: string;
  asset: string;
  endpointCount?: number | null;
  hasMetering?: boolean | null;
  hasFreeTier?: boolean | null;
  providerSha?: string | null;
  registryVersion?: string | null;
  registryGeneratedAt?: string | null;
  registrySourceUrl?: string | null;
  priceRangeUsd?: { min: number; max: number } | null;
  offers?: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payToAddress: string;
    probePriceUsd?: number;
  }>;
  resources?: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    description?: string;
    method?: string;
    inputSchema?: unknown;
    lastUpdated?: string;
    x402Version?: number;
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    transactionCount?: number;
    totalAmountAtomic?: string;
    // MPP-registry-only payment metadata (carried through ProviderResourceSchema).
    intent?: "charge" | "session";
    unitType?: string;
    dynamic?: boolean;
    decimals?: number;
  }>;
};

type AnalyticsX402Service = {
  payTo?: string | null;
  resource?: string | null;
  network?: string | null;
  asset?: string | null;
  transactionCount?: number | null;
  totalAmountAtomic?: string | null;
};

type AnalyticsFile = {
  providers?: { providers?: AnalyticsCatalogRow[] };
  intelligenceByAddress?: Record<string, { x402Services?: AnalyticsX402Service[] }>;
};

const EVM_ADDRESS_PATTERN = /0x[0-9a-f]{40}/gi;

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

const parseDescriptionTable = (md: string): Map<string, AtlasProviderDesc> => {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## Provider descriptions"));
  if (start === -1) return new Map();
  const map = new Map<string, AtlasProviderDesc>();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.startsWith("---") || line.startsWith("## ")) break;
    const cells = splitTableRow(line);
    if (cells.length !== 8) continue;
    const fqn = stripBackticks(cells[0] as string);
    if (!fqn || fqn === "Provider (fqn)" || fqn.startsWith("---")) continue;
    map.set(fqn, {
      fqn,
      title: cells[1] as string,
      category: cells[2] as string,
      serviceUrl: stripAngleUrl(cells[3] as string),
      description: cells[4] as string,
      useCase: cells[5] as string,
      endpointCount: Number.parseInt((cells[6] as string) || "0", 10) || 0,
      priceRangeUsd: parsePriceRange((cells[7] as string) || ""),
    });
  }
  return map;
};

const parsePaymentTable = (md: string): Map<string, GeoOffer[]> => {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## Per-provider payment table"));
  if (start === -1) return new Map();
  const map = new Map<string, GeoOffer[]>();
  for (let i = start + 1; i < lines.length; i++) {
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
    const list = map.get(fqn) ?? [];
    list.push(offer);
    map.set(fqn, list);
  }
  return map;
};

let atlasCache: AtlasProvider[] | null = null;

const loadAtlas = (): AtlasProvider[] => {
  if (atlasCache) return atlasCache;
  if (!fs.existsSync(ATLAS_PATH)) {
    atlasCache = [];
    return atlasCache;
  }
  const md = fs.readFileSync(ATLAS_PATH, "utf8");
  const descriptions = parseDescriptionTable(md);
  const offersByFqn = parsePaymentTable(md);
  const out: AtlasProvider[] = [];
  for (const [fqn, desc] of descriptions) {
    const offers = offersByFqn.get(fqn);
    if (!offers || offers.length === 0) continue;
    out.push({ ...desc, offers });
  }
  atlasCache = out;
  return atlasCache;
};

let analyticsCache: AnalyticsFile | null = null;

const loadAnalytics = (): AnalyticsFile => {
  if (analyticsCache) return analyticsCache;
  if (!fs.existsSync(ANALYTICS_PATH)) {
    analyticsCache = {};
    return analyticsCache;
  }
  analyticsCache = JSON.parse(fs.readFileSync(ANALYTICS_PATH, "utf8")) as AnalyticsFile;
  return analyticsCache;
};

const hostnameOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const apexLabelOf = (host: string): string | null => {
  // For api.nansen.ai → "nansen". For pro-api.coingecko.com → "coingecko".
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  return labels[labels.length - 2]!;
};

const matchesAtlas = (atlas: AtlasProvider, serviceId: string, serviceUrl: string | null) => {
  const sidLower = serviceId.toLowerCase();
  const atlasHost = hostnameOf(atlas.serviceUrl);
  if (atlasHost && atlasHost === sidLower) return true;
  if (serviceUrl) {
    const sUrlHost = hostnameOf(serviceUrl);
    if (sUrlHost && atlasHost && sUrlHost === atlasHost) return true;
  }
  // fallback 1: full serviceId substring inside atlas serviceUrl.
  if (atlas.serviceUrl.toLowerCase().includes(sidLower)) return true;
  // fallback 2: brand-segment match. Take the apex label of a hostname-style
  // serviceId (api.nansen.ai → "nansen") and compare it to each `/`-separated
  // segment of the atlas fqn. We require an exact segment hit so generic
  // labels like "api" can't accidentally collide with atlas fqns that simply
  // contain the substring (e.g. solana-foundation/alibaba/ocr-api).
  if (sidLower.includes(".")) {
    const apex = apexLabelOf(sidLower);
    if (apex && apex.length >= 3) {
      const fqnSegments = atlas.fqn.toLowerCase().split("/").filter(Boolean);
      if (fqnSegments.includes(apex)) return true;
    }
  }
  return false;
};

const payToFromProviderRouteId = (providerId: string): string | null => {
  const matches = providerId.match(EVM_ADDRESS_PATTERN);
  return matches?.at(-1)?.toLowerCase() ?? null;
};

const findAnalyticsRow = (
  rows: AnalyticsCatalogRow[],
  providerId: string,
): AnalyticsCatalogRow | null => {
  const normalizedProviderId = providerId.toLowerCase();
  const exact = rows.find((row) => row.providerId.toLowerCase() === normalizedProviderId);
  if (exact) return exact;

  const routePayTo = payToFromProviderRouteId(providerId);
  if (!routePayTo) return null;
  return rows.find((row) => row.payTo.toLowerCase() === routePayTo) ?? null;
};

const rowFromHint = (hint: GeoSpecProviderHint | null | undefined): AnalyticsCatalogRow | null => {
  if (!hint) return null;
  return {
    providerId: hint.providerId,
    name: hint.name,
    title: hint.title,
    description: hint.description,
    mppDescription: hint.mppDescription,
    useCase: hint.useCase,
    category: hint.category,
    serviceId: hint.serviceId ?? hint.serviceName ?? hint.name ?? hint.providerId,
    serviceName: hint.serviceName ?? hint.name ?? hint.serviceId ?? hint.providerId,
    serviceUrl: hint.serviceUrl ?? null,
    endpointCount: hint.endpointCount ?? null,
    hasMetering: hint.hasMetering ?? null,
    hasFreeTier: hint.hasFreeTier ?? null,
    providerSha: hint.providerSha ?? null,
    registryVersion: hint.registryVersion ?? null,
    registryGeneratedAt: hint.registryGeneratedAt ?? null,
    registrySourceUrl: hint.registrySourceUrl ?? null,
    priceRangeUsd: hint.priceRangeUsd ?? null,
    offers: (hint.offers ?? []).map((offer) => ({
      protocol: offer.protocol,
      chain: offer.chain,
      asset: offer.asset,
      payTo: offer.payToAddress,
      probePriceUsd: offer.probePriceUsd ?? 0,
    })),
    payTo: hint.payTo,
    network: hint.network,
    asset: hint.asset,
    resources: hint.resources,
  };
};

export const getGeoSpec = (
  providerId: string,
  providerHint?: GeoSpecProviderHint | null,
): GeoSpec | null => {
  const analytics = loadAnalytics();
  const rows = analytics.providers?.providers ?? [];
  // Priority:
  //   1. providerHint — the BFF already resolved providerId via
  //      findProviderByRouteId, so the hint represents THE row the user is
  //      looking at (incl. MPP rows that aren't in the static analytics.json).
  //   2. analytics.json lookup — fallback for cases where no hint is provided
  //      (older callers or test fixtures without live data).
  // Without this ordering, the analytics.json payTo-fallback can return a
  // Pay.sh row that shares a payTo with an MPP row, masking the MPP data.
  const row = rowFromHint(providerHint) ?? findAnalyticsRow(rows, providerId);
  if (!row) return null;

  const serviceId = (row.serviceId ?? row.serviceName ?? row.name ?? "").trim();
  if (!serviceId) return null;

  const atlas = loadAtlas();
  const matched = atlas.find((a) => matchesAtlas(a, serviceId, row.serviceUrl ?? null)) ?? null;

  // 観測 endpoints: intelligenceByAddress[*].x402Services から resource を集約。
  // resource を hostname にして、provider 側の "正規 host" と一致する slot を採用する。
  // 正規 host は serviceUrl があればその hostname、無ければ serviceId そのもの (= coingecko)。
  const targetHost = (
    hostnameOf(matched?.serviceUrl ?? row.serviceUrl ?? null) ?? serviceId.toLowerCase()
  ).toLowerCase();
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
  const intel = analytics.intelligenceByAddress ?? {};
  for (const entry of Object.values(intel)) {
    for (const slot of entry.x402Services ?? []) {
      if (!slot.resource) continue;
      const host = hostnameOf(slot.resource);
      if (!host || host !== targetHost) continue;
      const existing = endpointsMap.get(slot.resource);
      const tx = typeof slot.transactionCount === "number" ? slot.transactionCount : 0;
      const atomic = (() => {
        try {
          return BigInt(slot.totalAmountAtomic ?? "0");
        } catch {
          return 0n;
        }
      })();
      if (!existing) {
        endpointsMap.set(slot.resource, {
          resource: slot.resource,
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
  const observedEndpoints: GeoEndpoint[] = Array.from(endpointsMap.values())
    .map((e) => ({
      resource: e.resource,
      networks: Array.from(e.networks).sort(),
      assets: Array.from(e.assets).sort(),
      transactionCount: e.tx,
      totalAmountAtomic: e.totalAtomic.toString(),
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount);
  const liveResourceEndpoints: GeoEndpoint[] = (row.resources ?? []).map((resource) => ({
    resource: resource.resource,
    description: resource.description,
    method: resource.method,
    lastUpdated: resource.lastUpdated,
    x402Version: resource.x402Version,
    l30DaysUniquePayers: resource.l30DaysUniquePayers,
    networks: resource.network ? [resource.network] : [],
    assets: resource.asset ? [resource.asset] : [],
    transactionCount: resource.transactionCount ?? resource.l30DaysTotalCalls ?? 0,
    totalAmountAtomic: resource.totalAmountAtomic ?? resource.amountAtomic ?? "0",
  }));

  const offers: GeoOffer[] = matched?.offers ?? row.offers ?? [];

  // MPP-registry endpoints: derived from `row.resources` when the row carries
  // MPP-flavored payment metadata (intent / dynamic / decimals). We only emit
  // these when the row was produced by the MPP capture path; otherwise the
  // resources[] either don't have these fields or aren't a registry projection.
  const mppEndpoints: MppRegistryEndpoint[] = (row.resources ?? [])
    .filter(
      (r) =>
        r.intent !== undefined ||
        r.dynamic !== undefined ||
        r.decimals !== undefined ||
        r.unitType !== undefined,
    )
    .map((r) => ({
      resource: r.resource,
      method: r.method,
      description: r.description,
      intent: r.intent,
      unitType: r.unitType,
      dynamic: r.dynamic,
      amountAtomic: r.amountAtomic,
      decimals: r.decimals,
      asset: r.asset,
      network: r.network,
    }));

  return {
    serviceId,
    serviceUrl: matched?.serviceUrl ?? row.serviceUrl ?? null,
    title: matched?.title ?? row.title ?? row.name ?? null,
    category: matched?.category ?? row.category ?? null,
    // description / useCase は Pay.sh atlas (matched) にヒットしたときだけ
    // 値を返す。ヒットしないときは null にして、GEO ページの
    // 「Description (Pay.sh)」/「Use case (Pay.sh)」カードを非表示にする。
    // (`row.description` には MPP-only プロバイダの場合 MPP registry 由来の
    // テキストが入っているため、Pay.sh ラベルで出すのは誤情報になる。)
    description: matched?.description ?? null,
    mppDescription: row.mppDescription ?? null,
    useCase: matched?.useCase ?? null,
    endpointCount: matched?.endpointCount ?? row.resources?.length ?? null,
    hasMetering: row.hasMetering ?? null,
    hasFreeTier: row.hasFreeTier ?? null,
    providerSha: row.providerSha ?? null,
    registryVersion: row.registryVersion ?? null,
    registryGeneratedAt: row.registryGeneratedAt ?? null,
    registrySourceUrl: row.registrySourceUrl ?? null,
    priceRangeUsd: matched?.priceRangeUsd ?? row.priceRangeUsd ?? null,
    offers,
    observedEndpoints: observedEndpoints.length ? observedEndpoints : liveResourceEndpoints,
    mppEndpoints,
    atlasMissing: matched === null,
  };
};
