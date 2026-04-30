import { randomUUID } from "node:crypto";
import {
  type CdpPaymentOption,
  type CdpQuality,
  type CdpResource,
  SourceProvenanceSchema,
  normalizeAsset,
  normalizeNetwork,
  normalizePayTo,
  validateCdpPaymentOption,
  validateCdpResource,
} from "contracts";
import type { FetchLike } from "./transport";

const DEFAULT_CDP_ENDPOINT = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources";
const DEFAULT_PAGE_SIZE = 50;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

const asStringOrUndefined = (value: unknown): string | undefined => {
  const next = asString(value);
  return next === null || next.length === 0 ? undefined : next;
};

const asRecordOrUndefined = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
};

const toRequiredString = (value: unknown, path: string): string => {
  const parsed = asStringOrUndefined(value);
  if (!parsed) throw new Error(`cdp discovery missing required field: ${path}`);
  return parsed;
};

const isValidSourceUrl = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeQuality = (value: unknown): CdpQuality | undefined =>
  value == null || typeof value !== "object" ? undefined : (value as CdpQuality);

const buildProvenance = (source: string, endpoint: string) => {
  const provenance = SourceProvenanceSchema.parse({
    sourceKind: "cdp_discovery",
    sourceName: source,
    sourceUrl: endpoint,
    sourceId: randomUUID(),
    fetchedAt: new Date().toISOString(),
  });
  return provenance;
};

const buildSourceProvenance = (endpoint: string, raw: unknown) => {
  const rawRecord = asRecord(raw);
  const sourceName = asStringOrUndefined(rawRecord?.sourceName) ?? "cdp";
  const sourceKind =
    asStringOrUndefined(rawRecord?.sourceKind) === "cdp_discovery" ||
    asStringOrUndefined(rawRecord?.sourceKind) === "bitquery" ||
    asStringOrUndefined(rawRecord?.sourceKind) === "derived"
      ? (asStringOrUndefined(rawRecord?.sourceKind) as "cdp_discovery" | "bitquery" | "derived")
      : "cdp_discovery";

  const sourceUrl = isValidSourceUrl(asStringOrUndefined(rawRecord?.sourceUrl) ?? "")
    ? (asStringOrUndefined(rawRecord?.sourceUrl) as string)
    : endpoint;

  return SourceProvenanceSchema.parse({
    sourceKind,
    sourceName,
    sourceUrl,
    sourceId: asStringOrUndefined(rawRecord?.sourceId) ?? randomUUID(),
    fetchedAt: new Date().toISOString(),
  });
};

const toPaymentOption = (raw: unknown, endpoint: string): CdpPaymentOption => {
  const parsed = asRecord(raw);
  if (!parsed) throw new Error("invalid payment option payload");

  const paymentOption = validateCdpPaymentOption({
    scheme: asStringOrUndefined(parsed.scheme),
    network: normalizeNetwork(
      toRequiredString(parsed.network ?? parsed.chain, "paymentOption.network"),
    ),
    asset: normalizeAsset(
      toRequiredString(parsed.asset ?? parsed.currency ?? parsed.token, "paymentOption.asset"),
    ),
    amount: toRequiredString(parsed.amount ?? parsed.maxAmountRequired, "paymentOption.amount"),
    payTo: normalizePayTo(
      toRequiredString(parsed.payTo ?? parsed.recipient, "paymentOption.payTo"),
    ),
    provenance: buildProvenance("cdp", endpoint),
    quality: normalizeQuality(parsed.quality),
    metadata: asRecordOrUndefined(parsed.metadata),
  });
  return paymentOption;
};

const toResource = (raw: unknown, endpoint: string): CdpResource => {
  const parsed = asRecord(raw);
  if (!parsed) throw new Error("invalid cdp resource payload");

  const paymentOptionsRaw = Array.isArray(parsed.paymentOptions)
    ? parsed.paymentOptions
    : Array.isArray(parsed.accepts)
      ? parsed.accepts
      : [];
  if (paymentOptionsRaw.length === 0) throw new Error("cdp resource missing paymentOptions");

  const paymentOptions = paymentOptionsRaw.map((item) => toPaymentOption(item, endpoint));

  const provenance = buildSourceProvenance(endpoint, parsed.provenance);
  return validateCdpResource({
    resourceId: parsed.resourceId ?? parsed.id ?? parsed.resource,
    resource: toRequiredString(parsed.resource, "resource.resource"),
    provider: asStringOrUndefined(parsed.provider),
    service: asStringOrUndefined(parsed.service),
    paymentOptions,
    quality: normalizeQuality(parsed.quality),
    provenance,
    metadata: asRecordOrUndefined(parsed.metadata),
  });
};

export type CdpDiscoveryOptions = {
  endpoint?: string;
  pageSize?: number;
  limit?: number | null;
  fetchFn?: FetchLike;
  timeoutMs?: number;
};

export type CdpDiscoveryResult = {
  resources: CdpResource[];
  fetchedCount: number;
  pageCount: number;
  nextCursor: string | null;
  skippedCount: number;
};

export const makeCdpDiscoveryUrl = (endpoint: string, cursor: string | null, limit: number) => {
  const url = new URL(endpoint);
  url.searchParams.set("type", "http");
  const offset = cursor === null ? 0 : Number(cursor);
  if (Number.isFinite(offset)) {
    url.searchParams.set("offset", String(offset));
  } else {
    url.searchParams.set("cursor", cursor ?? "");
  }
  url.searchParams.set("limit", String(limit));
  return url.toString();
};

export const makeCdpDiscoveryBody = (cursor: string | null, limit: number) => ({
  query: "query_discovery_page",
  variables: {
    after: cursor,
    first: limit,
  },
});

const ensureFetch = (fetchFn: FetchLike | undefined): FetchLike =>
  fetchFn ?? ((url, init) => fetch(url, init));

export const fetchCdpDiscoveryPage = async (
  options: CdpDiscoveryOptions & { cursor?: string | null },
): Promise<{
  resources: CdpResource[];
  hasNextPage: boolean;
  nextCursor: string | null;
  rawItemCount: number;
  skippedCount: number;
}> => {
  const fetchFn = ensureFetch(options.fetchFn);
  const endpoint = options.endpoint ?? DEFAULT_CDP_ENDPOINT;
  const pageLimit = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const cursor = options.cursor ?? null;
  const requestUrl = makeCdpDiscoveryUrl(endpoint, cursor, pageLimit);

  const response = await fetchFn(requestUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) throw new Error(`CDP discovery request failed: ${response.status}`);
  const payload = await response.json();
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.resources)
      ? data.resources
      : [];
  const pageInfo = asRecord(data?.pageInfo);
  const pagination = asRecord(data?.pagination);

  let skippedCount = 0;
  const resources = items.flatMap((item) => {
    try {
      return [toResource(item, endpoint)];
    } catch {
      skippedCount += 1;
      return [];
    }
  });
  const total = typeof pagination?.total === "number" ? pagination.total : null;
  const cursorOffset = cursor === null ? 0 : Number(cursor);
  const responseOffset =
    typeof pagination?.offset === "number"
      ? pagination.offset
      : Number.isFinite(cursorOffset)
        ? cursorOffset
        : 0;
  const responseLimit = typeof pagination?.limit === "number" ? pagination.limit : pageLimit;
  const hasNextPage =
    typeof pageInfo?.hasNextPage === "boolean"
      ? pageInfo.hasNextPage
      : total === null
        ? false
        : responseOffset + responseLimit < total;
  const endCursor =
    typeof pageInfo?.endCursor === "string"
      ? pageInfo.endCursor
      : hasNextPage
        ? String(responseOffset + responseLimit)
        : null;

  return {
    resources,
    hasNextPage,
    nextCursor: endCursor,
    rawItemCount: items.length,
    skippedCount,
  };
};

export const fetchCdpDiscoveryResources = async (
  options: CdpDiscoveryOptions = {},
): Promise<CdpDiscoveryResult> => {
  const fetchFn = ensureFetch(options.fetchFn);
  const endpoint = options.endpoint ?? DEFAULT_CDP_ENDPOINT;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const requestLimit = options.limit ?? null;
  const target = requestLimit === null ? Number.POSITIVE_INFINITY : requestLimit;

  const resources: CdpResource[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let skippedCount = 0;

  while (resources.length < target) {
    const remaining = target - resources.length;
    const currentLimit = Math.min(pageSize, Math.max(1, remaining));
    pageCount += 1;

    const result = await fetchCdpDiscoveryPage({
      endpoint,
      fetchFn,
      pageSize: currentLimit,
      cursor,
    });

    resources.push(...result.resources);
    skippedCount += result.skippedCount;

    if (!result.hasNextPage || resources.length >= target) {
      break;
    }

    cursor = result.nextCursor;
    if (cursor === null || result.rawItemCount === 0) break;
  }

  return {
    resources,
    fetchedCount: resources.length,
    pageCount,
    nextCursor: cursor,
    skippedCount,
  };
};

export const cdpDiscoveryPageFingerprint = (resources: CdpResource[]) =>
  resources.length + ":" + resources.map((resource) => resource.paymentOptions.length).join(",");
