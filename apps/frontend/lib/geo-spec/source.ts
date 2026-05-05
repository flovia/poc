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
  networks: string[];
  assets: string[];
  transactionCount: number;
  totalAmountAtomic: string;
};

export type GeoSpec = {
  serviceId: string;
  serviceUrl: string | null;
  title: string | null;
  category: string | null;
  description: string | null;
  useCase: string | null;
  endpointCount: number | null;
  priceRangeUsd: { min: number; max: number } | null;
  offers: GeoOffer[];
  observedEndpoints: GeoEndpoint[];
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
};

type AtlasProvider = AtlasProviderDesc & {
  offers: GeoOffer[];
};

type AnalyticsCatalogRow = {
  providerId: string;
  serviceId?: string | null;
  serviceUrl?: string | null;
  payTo: string;
  network: string;
  asset: string;
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

const matchesAtlas = (atlas: AtlasProvider, serviceId: string, serviceUrl: string | null) => {
  const sidLower = serviceId.toLowerCase();
  const atlasHost = hostnameOf(atlas.serviceUrl);
  if (atlasHost && atlasHost === sidLower) return true;
  if (serviceUrl) {
    const sUrlHost = hostnameOf(serviceUrl);
    if (sUrlHost && atlasHost && sUrlHost === atlasHost) return true;
  }
  // fallback: serviceId が atlas serviceUrl に含まれる、または逆
  if (atlas.serviceUrl.toLowerCase().includes(sidLower)) return true;
  if (atlas.fqn.toLowerCase().includes(sidLower.split(".")[0] ?? "")) return true;
  return false;
};

export const getGeoSpec = (providerId: string): GeoSpec | null => {
  const analytics = loadAnalytics();
  const rows = analytics.providers?.providers ?? [];
  const row = rows.find((r) => r.providerId === providerId);
  if (!row) return null;

  const serviceId = (row.serviceId ?? "").trim();
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

  const offers: GeoOffer[] = matched?.offers ?? [];

  return {
    serviceId,
    serviceUrl: matched?.serviceUrl ?? row.serviceUrl ?? null,
    title: matched?.title ?? null,
    category: matched?.category ?? null,
    description: matched?.description ?? null,
    useCase: matched?.useCase ?? null,
    endpointCount: matched?.endpointCount ?? null,
    priceRangeUsd: matched?.priceRangeUsd ?? null,
    offers,
    observedEndpoints,
    atlasMissing: matched === null,
  };
};
