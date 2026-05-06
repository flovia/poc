// GEO spec データ源。
//
// Frontend は単一の baked JSON (`apps/frontend/data/geo-providers.json`) を
// import して GEO ページに表示する。`apps/cli` の `bun run geo:bake` で
// (Pay.sh atlas を取り込んだ) `apps/bff/fixtures/generated/analytics.json`
// と `tmp/mpp-provider-catalog.json` を融合させて生成する。
//
// 本番では BFF が DB から返す providerId と内部 catalog の providerId が
// 一致しないため、live row → baked entry の lookup は serviceId / brandKey /
// payTo / nameToken を使う多段マッチを行う。

import bakedRaw from "../../data/geo-providers.json";
import { extractBrandKey } from "@/lib/pay-sh/brand";

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
  // baked JSON に該当 entry が見つからなかったときに true。
  // この場合 spec は live hint だけで構成される最小フォーマット。
  atlasMissing: boolean;
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
    intent?: "charge" | "session";
    unitType?: string;
    dynamic?: boolean;
    decimals?: number;
  }>;
};

// --- Baked JSON shapes --------------------------------------------------

type BakedObservedEndpoint = {
  resource: string;
  description?: string;
  method?: string;
  networks: string[];
  assets: string[];
  transactionCount: number;
  totalAmountAtomic: string;
};

type BakedProviderResource = {
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
    observedEndpoints: BakedObservedEndpoint[];
  } | null;
  mpp: {
    description: string | null;
    endpoints: BakedProviderResource[];
  } | null;
};

type BakedGeoFile = {
  version: 1;
  generatedAt: string;
  providers: BakedGeoProvider[];
};

// Hand-rolled shape guard. The baked JSON is the only data source for the GEO
// page, so a malformed file (truncated bundle, manual edit, mis-versioned
// import) must fail closed rather than silently produce undefined behavior.
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const isValidBakedProvider = (raw: unknown): raw is BakedGeoProvider => {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id.length === 0) return false;
  const lk = r.lookupKeys as Record<string, unknown> | undefined;
  if (!lk || typeof lk !== "object") return false;
  if (!isStringArray(lk.serviceIds)) return false;
  if (!isStringArray(lk.payTos)) return false;
  if (!isStringArray(lk.nameTokens)) return false;
  if (lk.brandKey !== undefined && typeof lk.brandKey !== "string") return false;
  return true;
};

const validateBakedFile = (raw: unknown): BakedGeoFile => {
  if (!raw || typeof raw !== "object") {
    throw new Error("geo-providers.json: root must be an object");
  }
  const root = raw as Record<string, unknown>;
  if (root.version !== 1) {
    throw new Error(`geo-providers.json: unsupported version ${String(root.version)} (expected 1)`);
  }
  if (typeof root.generatedAt !== "string") {
    throw new Error("geo-providers.json: missing or invalid generatedAt");
  }
  if (!Array.isArray(root.providers)) {
    throw new Error("geo-providers.json: providers must be an array");
  }
  for (const [index, provider] of (root.providers as unknown[]).entries()) {
    if (!isValidBakedProvider(provider)) {
      throw new Error(`geo-providers.json: providers[${index}] is malformed`);
    }
  }
  return root as unknown as BakedGeoFile;
};

const baked: BakedGeoFile = validateBakedFile(bakedRaw);

// --- Lookup -------------------------------------------------------------

const EVM_ADDRESS_PATTERN = /0x[0-9a-f]{40}/gi;

const payToFromProviderRouteId = (providerId: string): string | null => {
  const matches = providerId.match(EVM_ADDRESS_PATTERN);
  return matches?.at(-1)?.toLowerCase() ?? null;
};

const findBakedProvider = (
  providerId: string,
  hint?: GeoSpecProviderHint | null,
): BakedGeoProvider | null => {
  const candidateServiceIds = new Set<string>();
  if (hint?.serviceId) candidateServiceIds.add(hint.serviceId.toLowerCase());
  if (hint?.serviceName) candidateServiceIds.add(hint.serviceName.toLowerCase());

  // 1) serviceId direct match (exact lower-cased)
  for (const p of baked.providers) {
    for (const sid of p.lookupKeys.serviceIds) {
      if (candidateServiceIds.has(sid.toLowerCase())) return p;
    }
  }

  // 2) brand-key match (live hint serviceId reduced)
  const hintBrand = hint?.serviceId ? extractBrandKey(hint.serviceId) : null;
  if (hintBrand) {
    const match = baked.providers.find((p) => p.lookupKeys.brandKey === hintBrand);
    if (match) return match;
  }

  // 3) payTo match — but ONLY when the candidate payTo uniquely identifies
  //    a baked entry. MPP gateways legitimately share a single payTo across
  //    many distinct services (e.g. Tempo's Anthropic gateway is reused by
  //    20+ entries), so a naive "first row whose payTos[] contains hint.payTo"
  //    would silently route every gateway hit to whichever brand happens to
  //    sit first in the baked file. Falling back here only when the hit is
  //    unambiguous prevents that class of cross-brand leak.
  const candidatePayTos = new Set<string>();
  if (hint?.payTo) candidatePayTos.add(hint.payTo.toLowerCase());
  const routePayTo = payToFromProviderRouteId(providerId);
  if (routePayTo) candidatePayTos.add(routePayTo);
  if (candidatePayTos.size > 0) {
    const matchesByPayTo = baked.providers.filter((p) =>
      p.lookupKeys.payTos.some((pt) => candidatePayTos.has(pt)),
    );
    if (matchesByPayTo.length === 1) return matchesByPayTo[0]!;
    // If the payTo is ambiguous, try to disambiguate with the hint's name
    // token. Pure payTo + ambiguous → give up rather than guess.
    if (matchesByPayTo.length > 1 && hint?.name) {
      const lowered = hint.name.toLowerCase();
      const byName = matchesByPayTo.filter((p) => p.lookupKeys.nameTokens.includes(lowered));
      if (byName.length === 1) return byName[0]!;
    }
  }

  // 4) name-token fallback (last resort). Only honored when the match is
  //    unambiguous (single baked entry has the lowered display name).
  if (hint?.name) {
    const lowered = hint.name.toLowerCase();
    const byName = baked.providers.filter((p) => p.lookupKeys.nameTokens.includes(lowered));
    if (byName.length === 1) return byName[0]!;
  }

  return null;
};

// --- Public API ---------------------------------------------------------

const toGeoEndpoint = (e: BakedObservedEndpoint): GeoEndpoint => ({
  resource: e.resource,
  description: e.description,
  method: e.method,
  networks: e.networks,
  assets: e.assets,
  transactionCount: e.transactionCount,
  totalAmountAtomic: e.totalAmountAtomic,
});

const toMppEndpoint = (r: BakedProviderResource): MppRegistryEndpoint => ({
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
});

// MPP-flavored resources from a hint (used when the live row carries MPP
// resources but baked JSON has no entry — e.g. brand new MPP providers).
const mppEndpointsFromHint = (hint: GeoSpecProviderHint | null | undefined): MppRegistryEndpoint[] => {
  if (!hint?.resources) return [];
  return hint.resources
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
};

export const getGeoSpec = (
  providerId: string,
  hint?: GeoSpecProviderHint | null,
): GeoSpec | null => {
  const entry = findBakedProvider(providerId, hint);

  if (entry) {
    return {
      serviceId: entry.lookupKeys.brandKey ?? entry.lookupKeys.serviceIds[0] ?? entry.id,
      serviceUrl: entry.serviceUrl ?? hint?.serviceUrl ?? null,
      title: entry.title ?? hint?.title ?? hint?.name ?? null,
      category: entry.category ?? hint?.category ?? null,
      description: entry.paySh?.description ?? null,
      mppDescription: entry.mpp?.description ?? hint?.mppDescription ?? null,
      useCase: entry.paySh?.useCase ?? null,
      endpointCount: entry.endpointCount ?? hint?.endpointCount ?? null,
      hasMetering: entry.hasMetering ?? hint?.hasMetering ?? null,
      hasFreeTier: entry.hasFreeTier ?? hint?.hasFreeTier ?? null,
      providerSha: entry.providerSha ?? hint?.providerSha ?? null,
      registryVersion: entry.registryVersion ?? hint?.registryVersion ?? null,
      registryGeneratedAt: entry.registryGeneratedAt ?? hint?.registryGeneratedAt ?? null,
      registrySourceUrl: entry.registrySourceUrl ?? hint?.registrySourceUrl ?? null,
      priceRangeUsd: entry.priceRangeUsd ?? hint?.priceRangeUsd ?? null,
      offers: entry.paySh?.offers ?? [],
      observedEndpoints: (entry.paySh?.observedEndpoints ?? []).map(toGeoEndpoint),
      mppEndpoints: (entry.mpp?.endpoints ?? []).map(toMppEndpoint),
      // baked entry was found, so atlas/MPP data IS present.
      atlasMissing: !entry.paySh,
    };
  }

  // No baked entry. Build a minimal spec from the live hint so the page
  // doesn't 404 — but Pay.sh-side (description/useCase) stays null so the
  // GEO renderer can hide that section.
  if (!hint) return null;
  return {
    serviceId: hint.serviceId ?? hint.serviceName ?? hint.name ?? hint.providerId,
    serviceUrl: hint.serviceUrl ?? null,
    title: hint.title ?? hint.name ?? null,
    category: hint.category ?? null,
    description: null,
    mppDescription: hint.mppDescription ?? null,
    useCase: null,
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
    observedEndpoints: [],
    mppEndpoints: mppEndpointsFromHint(hint),
    atlasMissing: true,
  };
};
