import {
  type ProviderCatalogResponse,
  type ProviderCatalogRow,
  type ProvenanceByField,
  validateProviderCatalogResponse,
} from "contracts";
import type { FetchLike } from "./transport";

const DEFAULT_MPP_SERVICES_ENDPOINT = "https://mpp.dev/api/services";

export type MppEndpointPayment = {
  intent: string;
  method: string;
  currency: string;
  decimals?: number;
  description?: string;
  amount?: string;
  unitType?: string;
  dynamic?: boolean;
  amountHint?: string;
};

export type MppEndpoint = {
  method: string;
  path: string;
  description?: string;
  payment: MppEndpointPayment | null;
};

export type MppService = {
  id: string;
  name: string;
  url: string;
  serviceUrl: string;
  description?: string;
  categories?: string[];
  integration?: string;
  tags?: string[];
  status?: string;
  docs?: Record<string, unknown>;
  methods?: Record<string, unknown>;
  realm?: string;
  provider?: { name?: string; url?: string };
  endpoints: MppEndpoint[];
  icon?: string;
};

export type MppServicesRegistry = {
  version: number;
  services: MppService[];
};

export type MppPaymentChallenge = {
  scheme: "Payment";
  id?: string;
  realm?: string;
  method?: string;
  intent?: string;
  description?: string;
  expires?: string;
  request?: MppPaymentRequest;
  raw: Record<string, string>;
};

export type MppPaymentRequest = {
  amount?: string;
  currency?: string;
  recipient?: string;
  unitType?: string;
  expires?: string;
  methodDetails?: {
    chainId?: number;
    networkId?: string;
    escrowContract?: string;
    paymentMethodTypes?: string[];
  } & Record<string, unknown>;
  extra?: Record<string, unknown>;
} & Record<string, unknown>;

export type X402AcceptEntry = {
  scheme?: string;
  network?: string;
  amount?: string;
  payTo?: string;
  asset?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
};

export type X402PaymentRequiredPayload = {
  x402Version?: number;
  error?: string;
  accepts?: X402AcceptEntry[];
  resource?: { url?: string; description?: string; mimeType?: string };
  extensions?: Record<string, unknown>;
};

export type MppProbeSuccess = {
  skipped: false;
  endpoint: { method: string; path: string; description?: string };
  url: string;
  status: number;
  headers: Record<string, string>;
  challenges: MppPaymentChallenge[];
  paymentRequired: X402PaymentRequiredPayload | null;
  body: unknown;
  capturedAt: string;
};

export type MppProbeSkipped = {
  skipped: true;
  skipReason: "no_paid_endpoint";
};

export type MppProbeError = {
  skipped: false;
  endpoint: { method: string; path: string; description?: string };
  url: string;
  status: null;
  errorMessage: string;
  capturedAt: string;
};

export type MppProbeResult = MppProbeSuccess | MppProbeSkipped | MppProbeError;

export type MppOffer = {
  source: "www-authenticate" | "payment-required";
  method?: string;
  intent?: string;
  network?: string;
  chainId?: number;
  payTo?: string;
  asset?: string;
  assetSymbol?: string;
  amountAtomic?: string;
  unitType?: string;
  scheme?: string;
  extra?: Record<string, unknown>;
};

export type MppCaptureRecord = {
  serviceId: string;
  serviceName: string;
  providerName?: string;
  realm?: string;
  serviceUrl: string;
  description?: string;
  categories: string[];
  integration?: string;
  status?: string;
  endpointCount: number;
  paidEndpointCount: number;
  /**
   * Full list of registry-declared paid endpoints (one entry per `payment !== null`
   * endpoint). Used to render the same per-path / per-price table that Pay.sh
   * providers expose, without having to probe each endpoint individually.
   */
  paidEndpoints?: MppEndpoint[];
  registryAssets: string[];
  registryMethods: string[];
  probe: {
    method?: string;
    intent?: string;
    chainId?: number;
    payTo?: string;
    asset?: string;
    amountAtomic?: string;
    unitType?: string;
    network?: string;
    paidEndpointPath?: string;
    capturedAt?: string;
    skipReason?: string;
    offerCount?: number;
  } | null;
  offers: MppOffer[];
  source: {
    registryUrl: string;
    probeUrl?: string;
    capturedAt?: string;
  };
};

const ensureFetch = (fetchFn: FetchLike | undefined): FetchLike =>
  fetchFn ?? ((url, init) => fetch(url, init));

export const fetchMppServices = async (
  options: { endpoint?: string; fetchFn?: FetchLike } = {},
): Promise<MppServicesRegistry> => {
  const fetchFn = ensureFetch(options.fetchFn);
  const endpoint = options.endpoint ?? DEFAULT_MPP_SERVICES_ENDPOINT;
  const response = await fetchFn(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`MPP services request failed: ${response.status}`);
  }
  const payload = (await response.json()) as MppServicesRegistry;
  if (!Array.isArray(payload?.services)) {
    throw new Error("MPP services response missing services[]");
  }
  return payload;
};

export const pickProbeEndpoint = (service: MppService): MppEndpoint | null => {
  const candidates = pickProbeEndpointCandidates(service);
  return candidates[0] ?? null;
};

export const pickProbeEndpointCandidates = (service: MppService): MppEndpoint[] => {
  const paid = (service.endpoints ?? []).filter((e) => e.payment);
  // GET first (no body needed; less likely to fail input validation before payment check)
  return [...paid.filter((e) => e.method.toUpperCase() === "GET"), ...paid.filter((e) => e.method.toUpperCase() !== "GET")];
};

// Strict base64 to avoid silently accepting truncated/garbage input.
// Buffer.from(_, "base64") tolerates trailing junk; we want to reject it.
const STRICT_BASE64_RE = /^[A-Za-z0-9+/_-]+={0,2}$/;

const decodeBase64Json = (value: string): unknown => {
  const trimmed = value.trim();
  if (!STRICT_BASE64_RE.test(trimmed)) {
    throw new Error("invalid base64 payload");
  }
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(normalized, "base64");
  // Round-trip check: re-encode and compare to detect partial decode.
  const reencoded = buffer
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const stripped = trimmed.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (reencoded !== stripped) {
    throw new Error("base64 payload failed round-trip");
  }
  return JSON.parse(buffer.toString("utf8"));
};

// Split a WWW-Authenticate header into Payment-only segments.
// Stops a Payment segment when a different scheme (Bearer/Basic/Digest/etc.) appears at top level,
// so unrelated challenges cannot leak attributes (e.g. realm) into the Payment record.
const SCHEME_TOKEN_RE = /^[A-Za-z][A-Za-z0-9._-]*$/;
const NON_PAYMENT_SCHEME_RE = /^(Basic|Bearer|Digest|Negotiate|Mutual|SCRAM-[A-Za-z0-9-]+)$/i;

const findTopLevelSchemeIndices = (header: string): Array<{ index: number; token: string }> => {
  const matches: Array<{ index: number; token: string }> = [];
  let inQuotes = false;
  let tokenStart = 0;
  let inToken = false;
  for (let i = 0; i <= header.length; i += 1) {
    const ch = header[i] ?? "";
    if (ch === '"' && header[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      inToken = false;
      continue;
    }
    if (inQuotes) continue;
    const atBoundary = i === 0 || /[\s,]/.test(header[i - 1] ?? "");
    if (!inToken && atBoundary && /[A-Za-z]/.test(ch)) {
      tokenStart = i;
      inToken = true;
      continue;
    }
    if (inToken && (ch === "" || /[\s,=]/.test(ch))) {
      const token = header.slice(tokenStart, i);
      if (ch !== "=" && SCHEME_TOKEN_RE.test(token)) {
        matches.push({ index: tokenStart, token });
      }
      inToken = false;
    }
  }
  return matches;
};

const splitTopLevelChallenges = (header: string): string[] => {
  const tokens = findTopLevelSchemeIndices(header);
  if (tokens.length === 0) return [];
  const groups: string[] = [];
  for (let g = 0; g < tokens.length; g += 1) {
    const start = tokens[g];
    if (!/^Payment$/i.test(start.token)) continue;
    const next = tokens[g + 1];
    const endIndex = next ? next.index : header.length;
    let segment = header.slice(start.index, endIndex).trim();
    while (segment.endsWith(",")) segment = segment.slice(0, -1).trim();
    groups.push(segment);
  }
  return groups;
};

const ATTRIBUTE_PATTERN = /([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,]+))/g;

const parseChallengeAttributes = (segment: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const body = segment.replace(/^Payment\s*/i, "");
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(body)) !== null) {
    const [, name, quoted, bare] = match;
    attrs[name.toLowerCase()] = (quoted ?? bare ?? "").replace(/\\(.)/g, "$1").trim();
  }
  return attrs;
};

export const parseWwwAuthenticatePayment = (
  header: string | undefined | null,
): MppPaymentChallenge[] => {
  if (!header) return [];
  if (!/Payment\s/i.test(header)) return [];
  const segments = splitTopLevelChallenges(header);
  const challenges: MppPaymentChallenge[] = [];
  for (const segment of segments) {
    if (!/^Payment\b/i.test(segment)) continue;
    const attrs = parseChallengeAttributes(segment);
    let request: MppPaymentRequest | undefined;
    if (typeof attrs.request === "string" && attrs.request.length > 0) {
      try {
        request = decodeBase64Json(attrs.request) as MppPaymentRequest;
      } catch {
        request = undefined;
      }
    }
    challenges.push({
      scheme: "Payment",
      id: attrs.id,
      realm: attrs.realm,
      method: attrs.method,
      intent: attrs.intent,
      description: attrs.description,
      expires: attrs.expires,
      request,
      raw: attrs,
    });
  }
  return challenges;
};

export const decodePaymentRequiredHeader = (
  header: string | undefined | null,
): X402PaymentRequiredPayload | null => {
  if (!header) return null;
  try {
    const decoded = decodeBase64Json(header.trim()) as X402PaymentRequiredPayload;
    if (decoded && typeof decoded === "object") return decoded;
    return null;
  } catch {
    return null;
  }
};

const collectHeaders = (response: Response): Record<string, string> => {
  const result: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
};

const safeReadBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const probeOnce = async (input: {
  service: MppService;
  endpoint: MppEndpoint;
  fetchFn: FetchLike;
  now: string;
  timeoutMs?: number;
}): Promise<MppProbeSuccess | MppProbeError> => {
  const { service, endpoint, fetchFn, now } = input;
  const url = new URL(
    endpoint.path.replace(/^\/+/, ""),
    `${service.serviceUrl.replace(/\/+$/, "")}/`,
  ).toString();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = input.timeoutMs
    ? setTimeout(() => controller.abort(), input.timeoutMs)
    : null;
  const clearTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  try {
    const response = await fetchFn(url, {
      method: endpoint.method,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: endpoint.method.toUpperCase() === "GET" ? undefined : "{}",
      signal: controller.signal,
    });
    // Headers are already on the wire; do not let a slow body trigger the timeout
    // and discard a 402 we already extracted challenges from.
    clearTimer();
    const headers = collectHeaders(response);
    const challenges = parseWwwAuthenticatePayment(headers["www-authenticate"]);
    const paymentRequired = decodePaymentRequiredHeader(headers["payment-required"]);
    let body: unknown = null;
    try {
      body = await safeReadBody(response);
    } catch {
      body = null;
    }
    return {
      skipped: false,
      endpoint: { method: endpoint.method, path: endpoint.path, description: endpoint.description },
      url,
      status: response.status,
      headers,
      challenges,
      paymentRequired,
      body,
      capturedAt: now,
    };
  } catch (error) {
    return {
      skipped: false,
      endpoint: { method: endpoint.method, path: endpoint.path, description: endpoint.description },
      url,
      status: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      capturedAt: now,
    };
  } finally {
    clearTimer();
  }
};

const isAcceptableProbe = (probe: MppProbeSuccess | MppProbeError): boolean =>
  probe.status === 402 || (probe.status !== null && (probe as MppProbeSuccess).challenges?.length > 0);

export const captureMppServiceProbe = async (options: {
  service: MppService;
  fetchFn?: FetchLike;
  now?: () => Date;
  timeoutMs?: number;
  maxAttempts?: number;
}): Promise<MppProbeResult> => {
  const candidates = pickProbeEndpointCandidates(options.service);
  if (candidates.length === 0) {
    return { skipped: true, skipReason: "no_paid_endpoint" };
  }

  const fetchFn = ensureFetch(options.fetchFn);
  const now = (options.now?.() ?? new Date()).toISOString();
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, candidates.length));

  let lastResult: MppProbeSuccess | MppProbeError | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const endpoint = candidates[attempt];
    const result = await probeOnce({
      service: options.service,
      endpoint,
      fetchFn,
      now,
      timeoutMs: options.timeoutMs,
    });
    lastResult = result;
    if (isAcceptableProbe(result)) return result;
  }
  return lastResult ?? { skipped: true, skipReason: "no_paid_endpoint" };
};

const challengeToOffer = (challenge: MppPaymentChallenge): MppOffer => {
  const md = challenge.request?.methodDetails;
  return {
    source: "www-authenticate",
    method: challenge.method,
    intent: challenge.intent,
    chainId: md?.chainId,
    payTo: challenge.request?.recipient,
    asset: challenge.request?.currency,
    amountAtomic: challenge.request?.amount,
    unitType: challenge.request?.unitType,
    extra: challenge.request?.extra,
  };
};

const acceptToOffer = (accept: X402AcceptEntry): MppOffer => ({
  source: "payment-required",
  method: undefined,
  intent: undefined,
  network: accept.network,
  payTo: accept.payTo,
  asset: accept.asset,
  assetSymbol: typeof accept.extra?.name === "string" ? (accept.extra.name as string) : undefined,
  amountAtomic: accept.amount,
  scheme: accept.scheme,
  extra: accept.extra,
});

const collectOffers = (probe: MppProbeSuccess): MppOffer[] => {
  const offers: MppOffer[] = [];
  for (const challenge of probe.challenges ?? []) offers.push(challengeToOffer(challenge));
  for (const accept of probe.paymentRequired?.accepts ?? []) offers.push(acceptToOffer(accept));
  return offers;
};

export const buildMppCaptureRecord = (input: {
  service: MppService;
  probe: MppProbeResult;
  registryUrl?: string;
}): MppCaptureRecord => {
  const { service } = input;
  const endpoints = service.endpoints ?? [];
  const paidEndpointCount = endpoints.filter((e) => e.payment).length;
  const methods = service.methods ?? {};
  const registryMethods = Object.keys(methods);
  const registryAssets: string[] = [];
  for (const method of registryMethods) {
    const detail = methods[method];
    if (detail && typeof detail === "object" && Array.isArray((detail as { assets?: unknown }).assets)) {
      for (const asset of (detail as { assets: unknown[] }).assets) {
        if (typeof asset === "string") registryAssets.push(asset);
      }
    }
  }

  let probeProjection: MppCaptureRecord["probe"] = null;
  let offers: MppOffer[] = [];
  if (input.probe.skipped === true) {
    probeProjection = { skipReason: input.probe.skipReason };
  } else if (input.probe.status === null) {
    probeProjection = {
      paidEndpointPath: input.probe.endpoint.path,
      capturedAt: input.probe.capturedAt,
      skipReason: "probe_failed",
    };
  } else {
    const success = input.probe;
    offers = collectOffers(success);
    const primary = offers[0];
    const acceptOffer = offers.find((o) => o.source === "payment-required");
    probeProjection = {
      method: primary?.method,
      intent: primary?.intent,
      chainId: primary?.chainId,
      payTo: primary?.payTo ?? acceptOffer?.payTo,
      asset: primary?.asset ?? acceptOffer?.asset,
      amountAtomic: primary?.amountAtomic ?? acceptOffer?.amountAtomic,
      unitType: primary?.unitType,
      network: primary?.network ?? acceptOffer?.network,
      paidEndpointPath: success.endpoint.path,
      capturedAt: success.capturedAt,
      offerCount: offers.length,
    };
  }

  return {
    serviceId: service.id,
    serviceName: service.name,
    providerName: service.provider?.name,
    realm: service.realm,
    serviceUrl: service.serviceUrl,
    description: service.description,
    categories: service.categories ?? [],
    integration: service.integration,
    status: service.status,
    endpointCount: endpoints.length,
    paidEndpointCount,
    paidEndpoints: endpoints.filter((e): e is MppEndpoint & { payment: MppEndpointPayment } => e.payment !== null),
    registryAssets,
    registryMethods,
    probe: probeProjection,
    offers,
    source: {
      registryUrl: input.registryUrl ?? DEFAULT_MPP_SERVICES_ENDPOINT,
      probeUrl: !input.probe.skipped ? input.probe.url : undefined,
      capturedAt: !input.probe.skipped ? input.probe.capturedAt : undefined,
    },
  };
};

// ---------------------------------------------------------------------------
// Normalization: MPP capture -> ProviderCatalogRow
// ---------------------------------------------------------------------------

const TEMPO_USDC_ASSET_LOWER = "0x20c000000000000000000000b9537d11c60e8b50";
const BASE_USDC_ASSET_LOWER = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const TEMPO_USDC_DECIMALS = 6;
const BASE_USDC_DECIMALS = 6;

const isLikelyEvmAddress = (value: string | undefined): boolean =>
  !!value && /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const toLowerAddress = (value: string | undefined): string | undefined =>
  value ? value.trim().toLowerCase() : undefined;

const networkFromOffer = (
  primary: MppOffer | undefined,
  fallbackChainId: number | undefined,
): string => {
  if (primary?.network) {
    if (primary.network === "eip155:8453") return "base";
    return primary.network;
  }
  if (fallbackChainId !== undefined) return `tempo:${fallbackChainId}`;
  return "tempo";
};

const assetSymbolForOffer = (offer: MppOffer | undefined): string | undefined => {
  if (!offer) return undefined;
  // Address-based detection wins over server-supplied display names ("USD Coin" -> "USDC").
  const lower = offer.asset?.toLowerCase();
  if (lower === TEMPO_USDC_ASSET_LOWER || lower === BASE_USDC_ASSET_LOWER) return "USDC";
  if (offer.assetSymbol) {
    if (offer.assetSymbol === "USD Coin") return "USDC";
    return offer.assetSymbol;
  }
  return undefined;
};

const normalizedAssetForRow = (offer: MppOffer | undefined, fallback: string | undefined): string => {
  const symbol = assetSymbolForOffer(offer);
  if (symbol) return symbol;
  return offer?.asset ?? fallback ?? "unknown";
};

const decimalsForAsset = (offer: MppOffer | undefined): number | undefined => {
  const lower = offer?.asset?.toLowerCase();
  if (lower === TEMPO_USDC_ASSET_LOWER) return TEMPO_USDC_DECIMALS;
  if (lower === BASE_USDC_ASSET_LOWER) return BASE_USDC_DECIMALS;
  return undefined;
};

const computePriceRangeUsd = (
  amount: string | undefined,
  decimals: number | undefined,
): { min: number; max: number } | undefined => {
  if (!amount || decimals === undefined) return undefined;
  if (!/^\d+$/.test(amount)) return undefined;
  const denom = 10 ** decimals;
  const value = Number(amount) / denom;
  if (!Number.isFinite(value)) return undefined;
  return { min: value, max: value };
};

// Rows produced by the MPP registry capture path are always tagged as MPP, even
// when the wire-level rail happens to be x402-compatible (some MPP gateways
// expose an x402 v2 `payment-required` header alongside or instead of a
// `www-authenticate` challenge — that's an implementation detail of the gateway,
// not a different listing). The bare offer-based protocol guess only applies
// when the row was not produced from the registry path at all.
const protocolForMppRow = (): "x402" | "MPP" => "MPP";

const buildProviderId = (
  serviceId: string,
  network: string,
  asset: string,
  payTo: string,
): string => `mpp:${serviceId}::${network}::${asset}::${payTo}`;

const REGISTRY_PROVENANCE_FIELDS: Array<keyof ProviderCatalogRow> = [
  "providerId",
  "name",
  "serviceId",
  "serviceName",
  "network",
  "asset",
  "payTo",
  "endpointCount",
  "resourceCount",
  "title",
  "description",
  "category",
  "serviceUrl",
  "registryVersion",
  "registrySourceUrl",
  "protocol",
  "chain",
  "assetSymbol",
  "priceRangeUsd",
  "catalogSource",
  "endpointAttributionStatus",
  "mappingPattern",
];

// Fields the schema requires us to set, but the MPP registry alone cannot prove.
// We tag them as derived_insight so consumers can distinguish "registry says so"
// vs "we filled this in to satisfy the schema with no on-chain measurement".
const DERIVED_PLACEHOLDER_FIELDS = [
  "transactionCount",
  "uniqueSenderCount",
  "totalVolumeAtomic",
  "hasCustomerFacts",
  "customerFactCount",
  "attributionConfidence",
] as const;

export type MppNormalizationOptions = {
  registryVersion?: string | number;
  registrySourceUrl?: string;
};

// Pick the payment-required accept entry that matches the probe's hinted network/chain.
// We avoid blindly using accepts[0] because servers may return multiple unordered networks.
const selectAcceptOffer = (
  offers: MppOffer[],
  probeChainId: number | undefined,
): MppOffer | undefined => {
  const accepts = offers.filter((o) => o.source === "payment-required");
  if (accepts.length === 0) return undefined;

  // 1) Prefer accept entry whose CAIP-2 network encodes the probe's chainId.
  if (probeChainId !== undefined) {
    const byChain = accepts.find((o) => o.network === `eip155:${probeChainId}`);
    if (byChain) return byChain;
  }
  // 2) Otherwise prefer Base (eip155:8453) since it's the common settlement chain in this PoC.
  const base = accepts.find((o) => o.network === "eip155:8453");
  if (base) return base;
  // 3) Fall back to the first EVM-addressable entry.
  const evm = accepts.find((o) => isLikelyEvmAddress(o.payTo));
  return evm ?? accepts[0];
};

export const toProviderCatalogRowFromMpp = (
  record: MppCaptureRecord,
  options: MppNormalizationOptions = {},
): ProviderCatalogRow | null => {
  const probe = record.probe;
  if (!probe) return null;

  const challengeOffer = record.offers.find((o) => o.source === "www-authenticate");
  const acceptOffer = selectAcceptOffer(record.offers, probe.chainId);

  // For MPP registry rows, the tempo `www-authenticate` challenge is the
  // authoritative payment target (it's what the MPP gateway actually wants).
  // The x402-compatible `payment-required` accepts are alternative rails that
  // some gateways expose for backwards-compat with x402 wallets — useful as a
  // fallback when no challenge exists, but they should not override an
  // explicit tempo challenge.
  const primary = challengeOffer ?? acceptOffer;
  const fallback = challengeOffer ? acceptOffer : undefined;

  const rawPayTo = primary?.payTo ?? fallback?.payTo ?? probe.payTo;
  if (!rawPayTo) return null;
  const payToLower = toLowerAddress(rawPayTo);
  if (!payToLower) return null;
  // Drop rows that point at the EVM zero address (used as a placeholder by
  // some MPP demo services; not a valid payment target and downstream
  // customer/wallet lookups cannot do anything useful with it).
  if (/^0x0{40}$/.test(payToLower)) return null;
  // Solana / non-EVM addresses are kept as-is by the schema (PaymentRecipientAddressSchema accepts both).
  const payTo = isLikelyEvmAddress(rawPayTo) ? payToLower : rawPayTo;

  const network = networkFromOffer(primary, probe.chainId);
  const asset = normalizedAssetForRow(primary, probe.asset);
  const assetSymbol = assetSymbolForOffer(primary);
  const decimals = decimalsForAsset(primary);
  const amountAtomic = primary?.amountAtomic ?? fallback?.amountAtomic ?? probe.amountAtomic;
  const priceRangeUsd = computePriceRangeUsd(amountAtomic, decimals);

  const provenanceByField: NonNullable<ProvenanceByField> = {};
  for (const field of REGISTRY_PROVENANCE_FIELDS) {
    provenanceByField[field as string] = "registry_fact";
  }
  for (const field of DERIVED_PLACEHOLDER_FIELDS) {
    provenanceByField[field] = "derived_insight";
  }

  // Build per-endpoint resource entries from the MPP registry's paid endpoints.
  // We carry over the path, method, description, payment intent (charge/session),
  // unit type, and dynamic-pricing flag so the GEO page can render the same
  // path-and-price table that Pay.sh providers expose.
  const baseUrl = record.serviceUrl.replace(/\/+$/, "");
  const resources = (record.paidEndpoints ?? [])
    .map((endpoint) => {
      const payment = endpoint.payment;
      if (!payment) return null;
      // Build a fully-qualified resource URL. Schema requires `resource: z.string().url()`.
      const path = endpoint.path.startsWith("/") ? endpoint.path : `/${endpoint.path}`;
      const resourceUrl = `${baseUrl}${path}`;
      const intent = payment.intent === "session" || payment.intent === "charge"
        ? payment.intent
        : undefined;
      return {
        resource: resourceUrl,
        method: endpoint.method,
        description: payment.description ?? endpoint.description,
        // Dynamic-priced endpoints have no fixed amount.
        amountAtomic: payment.dynamic ? undefined : payment.amount,
        intent,
        unitType: payment.unitType,
        dynamic: payment.dynamic,
        decimals: payment.decimals,
        network,
        asset,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    providerId: buildProviderId(record.serviceId, network, asset, payTo),
    name: record.providerName ?? record.serviceName,
    serviceId: record.serviceId,
    serviceName: record.serviceName,
    network,
    asset,
    payTo,
    catalogSource: "mpp_registry",
    transactionCount: 0,
    uniqueSenderCount: 0,
    totalVolumeAtomic: "0",
    endpointCount: record.endpointCount,
    resourceCount: record.paidEndpointCount,
    mappingPattern:
      record.paidEndpointCount <= 1 ? "one_payto_one_endpoint" : "one_payto_many_endpoints",
    endpointAttributionStatus: "mpp_attributed_endpoint",
    attributionConfidence: 1,
    hasCustomerFacts: false,
    customerFactCount: 0,
    title: record.serviceName,
    description: record.description,
    // MPP-registry rows carry the registry-published description into a
    // dedicated field so it survives the merge with Pay.sh atlas data without
    // overwriting Pay.sh's own description.
    mppDescription: record.description,
    category: record.categories[0],
    serviceUrl: record.serviceUrl,
    protocol: protocolForMppRow(),
    chain: network,
    assetSymbol,
    priceRangeUsd,
    resources: resources.length > 0 ? resources : undefined,
    registryVersion:
      options.registryVersion === undefined ? undefined : String(options.registryVersion),
    registryGeneratedAt: undefined,
    registrySourceUrl: options.registrySourceUrl,
    provenance: "registry_fact",
    provenanceByField,
    reasons: [
      {
        provenance: "registry_fact",
        label: "MPP services registry probe",
        description: `Captured via 402 challenge from ${probe.paidEndpointPath}`,
      },
    ],
  } as ProviderCatalogRow;
};

export type MppCaptureSnapshot = {
  generatedAt: string;
  source: { registryUrl: string; registryVersion?: number };
  records: MppCaptureRecord[];
};

export const buildProviderCatalogFromMppCapture = (
  capture: MppCaptureSnapshot,
): ProviderCatalogResponse => {
  const rows: ProviderCatalogRow[] = [];
  for (const record of capture.records) {
    const row = toProviderCatalogRowFromMpp(record, {
      registryVersion: capture.source.registryVersion,
      registrySourceUrl: capture.source.registryUrl,
    });
    if (row) rows.push(row);
  }
  const response: ProviderCatalogResponse = {
    generatedAt: capture.generatedAt,
    generatedFrom: "mpp-registry-capture",
    providers: rows,
    providerCount: rows.length,
    provenance: "registry_fact",
    provenanceByField: { providers: "registry_fact" },
    reasons: [
      {
        provenance: "registry_fact",
        label: "MPP services registry",
        description: `Built from ${capture.source.registryUrl}`,
      },
    ],
  };
  return validateProviderCatalogResponse(response);
};

// Compute a normalized service-identity key independent of provider-id format.
// We include serviceId because in the MPP world a single payTo (gateway recipient)
// can fan out to many distinct services — collapsing them on (network, asset, payTo)
// alone would erase real catalog rows.
//
// payTo is normalized network-aware: EVM addresses are lower-cased (case-insensitive),
// but Solana base58 / other chains are kept verbatim because case is part of the value.
const isEvmNetworkLabel = (network: string): boolean => {
  const lower = network.trim().toLowerCase();
  if (lower === "base") return true;
  if (lower.startsWith("eip155")) return true;
  if (lower.startsWith("tempo")) return true;
  return false;
};

const normalizePayToForKey = (network: string, payTo: string): string => {
  const trimmed = payTo.trim();
  // EVM hex addresses are case-insensitive — lower-case for stable comparison.
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase();
  // EVM-labeled networks (eip155 / base / tempo) are case-insensitive even if
  // the address text didn't strictly match the 0x{40} pattern (e.g. checksum-cased,
  // padded, or otherwise non-canonical). Lower-case for the key.
  if (isEvmNetworkLabel(network)) return trimmed.toLowerCase();
  // Other chains (Solana base58, etc.) — keep case verbatim because case is part of the value.
  return trimmed;
};

const serviceIdentityKey = (row: ProviderCatalogRow): string => {
  const serviceId = (row.serviceId ?? row.providerId).trim().toLowerCase();
  const network = row.network.trim().toLowerCase();
  const asset = row.asset.trim().toLowerCase();
  const payTo = normalizePayToForKey(row.network, row.payTo);
  return `${serviceId}::${network}::${asset}::${payTo}`;
};

// Canonicalize a network label so that catalogs that label the same chain
// differently (e.g. Pay.sh atlas uses `tempo`, MPP capture uses `tempo:4217`)
// hash to the same key.
const canonicalizeNetwork = (network: string): string => {
  const lower = network.trim().toLowerCase();
  // Tempo is the only chain currently shipped under both labels; collapse it.
  if (lower === "tempo:4217" || lower === "tempo") return "tempo";
  // Base similarly appears as both `base` and `eip155:8453`.
  if (lower === "eip155:8453" || lower === "base") return "base";
  return lower;
};

// Canonicalize asset names so that the same on-chain token resolves to a
// single bucket. Pay.sh atlas writes `USD (Tempo)` for the Tempo USDC, while
// MPP capture writes the symbol `USDC` — they are the same payment asset.
const canonicalizeAsset = (network: string, asset: string): string => {
  const trimmed = asset.trim();
  const lower = trimmed.toLowerCase();
  if (canonicalizeNetwork(network) === "tempo") {
    if (lower === "usd (tempo)" || lower === "usdc" || lower === "usd") return "usdc";
  }
  if (canonicalizeNetwork(network) === "base") {
    if (lower === "usd coin" || lower === "usdc") return "usdc";
  }
  return lower;
};

// Payment identity = the on-chain target money goes to. Two rows with the same
// (network, asset, payTo) describe the same recipient, regardless of how each
// catalog labels them. Used as the merge dedup / enrich key.
const paymentIdentityKey = (row: ProviderCatalogRow): string => {
  const network = canonicalizeNetwork(row.network);
  const asset = canonicalizeAsset(row.network, row.asset);
  const payTo = normalizePayToForKey(row.network, row.payTo);
  return `${network}::${asset}::${payTo}`;
};

// Pay.sh-side fields whose values are typically on-chain measurements. These
// are NOT overwritten by MPP enrich — the registry only knows declared metadata,
// not transaction counts.
const ONCHAIN_MEASURED_FIELDS = new Set<keyof ProviderCatalogRow>([
  "transactionCount",
  "uniqueSenderCount",
  "totalVolumeAtomic",
  "hasCustomerFacts",
  "customerFactCount",
  "attributionConfidence",
  "endpointAttributionStatus",
  "mappingPattern",
]);

// Identity / display fields owned by the primary catalog. Even when MPP has a
// non-empty value we keep Pay.sh's so the user sees a consistent display name.
const PRIMARY_OWNED_FIELDS = new Set<keyof ProviderCatalogRow>([
  "providerId",
  "name",
  "serviceId",
  "serviceName",
  "title",
  "network",
  "asset",
  "payTo",
  "catalogSource",
]);

// Fields where MPP genuinely improves the row when present (registry-declared
// metadata). For each, MPP wins iff the primary value is missing OR the
// MPP value is strictly more informative (longer / non-empty) — but we keep it
// simple: take MPP only when primary is missing.
const ENRICH_CANDIDATE_FIELDS: ReadonlyArray<keyof ProviderCatalogRow> = [
  "description",
  // mppDescription is "additive" — it never collides with Pay.sh fields and is
  // always taken from the MPP side when present.
  "mppDescription",
  "useCase",
  "category",
  "serviceUrl",
  "hasMetering",
  "hasFreeTier",
  "providerSha",
  "registryVersion",
  "registryGeneratedAt",
  "registrySourceUrl",
  "offers",
  "protocol",
  "chain",
  "assetSymbol",
  "priceRangeUsd",
  "resources",
  "endpointCount",
  "resourceCount",
];

const isMissing = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.length === 0);

const enrichRow = (
  primary: ProviderCatalogRow,
  mppRow: ProviderCatalogRow,
): ProviderCatalogRow => {
  const enriched: ProviderCatalogRow = { ...primary };
  for (const key of ENRICH_CANDIDATE_FIELDS) {
    if (PRIMARY_OWNED_FIELDS.has(key)) continue;
    if (ONCHAIN_MEASURED_FIELDS.has(key)) continue;
    const mppValue = (mppRow as Record<string, unknown>)[key];
    if (isMissing(mppValue)) continue;
    const primaryValue = (primary as Record<string, unknown>)[key];
    if (!isMissing(primaryValue)) continue;
    (enriched as Record<string, unknown>)[key] = mppValue;
  }
  // endpointCount / resourceCount: MPP usually has the richer count.
  // Only override if MPP's number is strictly larger (= more endpoints surfaced).
  if (typeof mppRow.endpointCount === "number" && mppRow.endpointCount > primary.endpointCount) {
    enriched.endpointCount = mppRow.endpointCount;
  }
  if (typeof mppRow.resourceCount === "number" && mppRow.resourceCount > primary.resourceCount) {
    enriched.resourceCount = mppRow.resourceCount;
  }
  // Protocol: an MPP-listed row should always carry the MPP protocol tag.
  enriched.protocol = "MPP";
  // Provenance: append MPP's reasons so the row records both sources.
  if (mppRow.reasons && mppRow.reasons.length > 0) {
    const existing = primary.reasons ?? [];
    enriched.reasons = [...existing, ...mppRow.reasons];
  }
  return enriched;
};

// Merge an MPP-derived ProviderCatalogResponse into an existing catalog.
//
// Behavior:
// - On payment-identity (network/asset/payTo) match, keep the primary row's
//   identity / display / on-chain-measured fields, but enrich it with
//   MPP-only metadata (description, serviceUrl, category, MPP protocol tag, etc.).
// - Rows with no payment-identity match are appended as new providers.
// - Defensive secondary check: providerId collisions are also skipped.
export const mergeProviderCatalogs = (
  primary: ProviderCatalogResponse,
  mpp: ProviderCatalogResponse | null | undefined,
): ProviderCatalogResponse => {
  if (!mpp || mpp.providers.length === 0) return primary;

  // Build the primary lookup tables ONCE. MPP rows are matched only against
  // the primary catalog's payment identities; we deliberately do NOT dedup
  // across MPP rows themselves, because MPP gateways legitimately list multiple
  // distinct services under a single shared gateway payTo (e.g. Tempo's
  // Anthropic gateway fans out to 20+ service ids).
  const primaryByPaymentIdentity = new Map<string, number>();
  const seenProviderId = new Set<string>();
  primary.providers.forEach((row, idx) => {
    primaryByPaymentIdentity.set(paymentIdentityKey(row), idx);
    seenProviderId.add(row.providerId);
  });

  const enrichedRows: ProviderCatalogRow[] = primary.providers.slice();
  const additions: ProviderCatalogRow[] = [];
  let enrichedCount = 0;

  for (const mppRow of mpp.providers) {
    const key = paymentIdentityKey(mppRow);
    const existingIdx = primaryByPaymentIdentity.get(key);
    if (existingIdx !== undefined) {
      enrichedRows[existingIdx] = enrichRow(enrichedRows[existingIdx]!, mppRow);
      enrichedCount += 1;
      continue;
    }
    if (seenProviderId.has(mppRow.providerId)) continue;
    seenProviderId.add(mppRow.providerId);
    additions.push(mppRow);
    enrichedRows.push(mppRow);
  }

  if (enrichedCount === 0 && additions.length === 0) return primary;

  const merged: ProviderCatalogResponse = {
    ...primary,
    generatedFrom: `${primary.generatedFrom}+merged:mpp`,
    providers: enrichedRows,
    providerCount: enrichedRows.length,
    reasons: [
      ...(primary.reasons ?? []),
      {
        provenance: "registry_fact",
        label: "MPP catalog merge",
        description: `Enriched ${enrichedCount} primary row(s) and appended ${additions.length} MPP-only provider(s).`,
      },
    ],
  };
  return validateProviderCatalogResponse(merged);
};

export { DEFAULT_MPP_SERVICES_ENDPOINT };
