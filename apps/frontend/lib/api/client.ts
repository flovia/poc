import {
  type PhaseBCustomerProfileResponse,
  type RouteAnalyticsSankeyResponse,
  type RouteAnalyticsSummaryResponse,
  validatePhaseBCustomerWorkflowIntentResponse,
  type WalletUsageGraphResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateProviderCatalogResponse,
  validateRouteAnalyticsSankeyResponse,
  validateRouteAnalyticsSummaryResponse,
} from "contracts";
import {
  adaptCustomerList,
  adaptCustomerWorkflowIntent,
  adaptCustomerProfile,
  adaptCustomerUpsellExplanation,
  adaptObservationsFromGraph,
  adaptProviderCatalog,
  adaptSummaryFromCustomers,
  adaptWalletUsageGraph,
} from "./adapters";
import type {
  CustomerListItemDto,
  CustomerProfileDto,
  CustomerWorkflowIntentDto,
  CustomerUpsellExplanationDto,
  PaymentObservationDto,
  ProviderCatalogItemDto,
  ReportSummaryDto,
  WalletUsageGraphDto,
} from "./types";

const DEFAULT_BFF_URL = "http://localhost:3001";
const DEFAULT_PUBLIC_BFF_URL = "/api";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function bffBaseUrl(): string {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const url = process.env.BFF_URL ?? DEFAULT_BFF_URL;
    return stripTrailingSlash(url);
  }

  const url = process.env.NEXT_PUBLIC_BFF_URL ?? DEFAULT_PUBLIC_BFF_URL;
  return stripTrailingSlash(url);
}

async function bffFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${bffBaseUrl()}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Data request failed: ${response.status} ${response.statusText} (${path})`);
  }

  return (await response.json()) as T;
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  const raw = await getCustomerProfileRaw(address);
  if (!raw) return null;
  return adaptCustomerProfile(raw);
}

export async function getCustomerProfileRaw(
  address: string,
): Promise<PhaseBCustomerProfileResponse | null> {
  const response = await fetch(`${bffBaseUrl()}/customers/${encodeURIComponent(address)}/profile`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Data request failed: ${response.status} ${response.statusText} (/customers/${address}/profile)`,
    );
  }
  return validatePhaseBCustomerProfileResponse(await response.json());
}

export async function getCustomerUpsellExplanation(
  address: string,
): Promise<CustomerUpsellExplanationDto | null> {
  const response = await fetch(
    `${bffBaseUrl()}/customers/${encodeURIComponent(address)}/llm/upsell-explanation`,
    {
      cache: "no-store",
      headers: { accept: "application/json" },
    },
  );

  if (response.status === 404 || response.status === 503) return null;
  if (!response.ok) {
    throw new Error(
      `Data request failed: ${response.status} ${response.statusText} (/customers/${address}/llm/upsell-explanation)`,
    );
  }

  return adaptCustomerUpsellExplanation(
    validatePhaseBCustomerUpsellExplanationResponse(await response.json()),
  );
}

export async function getCustomerWorkflowIntent(
  address: string,
): Promise<CustomerWorkflowIntentDto | null> {
  const response = await fetch(
    `${bffBaseUrl()}/customers/${encodeURIComponent(address)}/llm/workflow-intent`,
    {
      cache: "no-store",
      headers: { accept: "application/json" },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Data request failed: ${response.status} ${response.statusText} (/customers/${address}/llm/workflow-intent)`,
    );
  }

  return adaptCustomerWorkflowIntent(
    validatePhaseBCustomerWorkflowIntentResponse(await response.json()),
  );
}

export async function getProviders(): Promise<ProviderCatalogItemDto[]> {
  return adaptProviderCatalog(
    validateProviderCatalogResponse(await bffFetch<unknown>("/providers")),
  );
}

export type GetCustomersFilter = { payTo?: string; serviceId?: string };

export async function getCustomers(
  filter?: string | GetCustomersFilter,
): Promise<CustomerListItemDto[]> {
  const opts: GetCustomersFilter = typeof filter === "string" ? { payTo: filter } : (filter ?? {});
  const params = new URLSearchParams();
  if (opts.serviceId) params.set("serviceId", opts.serviceId);
  else if (opts.payTo) params.set("payTo", opts.payTo);
  const query = params.toString() ? `?${params.toString()}` : "";
  return adaptCustomerList(
    validatePhaseBCustomerListResponse(await bffFetch<unknown>(`/customers${query}`)),
  );
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto> {
  return adaptWalletUsageGraph(await getWalletUsageGraphRaw());
}

export async function getWalletUsageGraphRaw(): Promise<WalletUsageGraphResponse> {
  return validatePhaseBWalletUsageGraphResponse(await bffFetch<unknown>("/wallet-usage-graph"));
}

export async function getRouteAnalyticsSummary(): Promise<RouteAnalyticsSummaryResponse> {
  return validateRouteAnalyticsSummaryResponse(
    await bffFetch<unknown>("/analytics/routes/summary"),
  );
}

export async function getRouteAnalyticsSankey(): Promise<RouteAnalyticsSankeyResponse> {
  return validateRouteAnalyticsSankeyResponse(await bffFetch<unknown>("/analytics/routes/sankey"));
}

// Phase B BFF は /observations を提供しないため、/wallet-usage-graph から合成する。
// 用途: Patterns 画面の retention 計算 (payer x recipient ごとの first/last 比較)。
export async function getObservations(): Promise<PaymentObservationDto[]> {
  return adaptObservationsFromGraph(
    validatePhaseBWalletUsageGraphResponse(await bffFetch<unknown>("/wallet-usage-graph")),
  );
}

// Phase B BFF は /summary を提供しないため、/customers から合成する。
// freshness indicator (撤去済) 再導入用のヘルパー。詳細は
// docs/future-work.md "Data freshness indicator" を参照。
export async function getSummary(filter?: string | GetCustomersFilter): Promise<ReportSummaryDto> {
  const opts: GetCustomersFilter = typeof filter === "string" ? { payTo: filter } : (filter ?? {});
  const params = new URLSearchParams();
  if (opts.serviceId) params.set("serviceId", opts.serviceId);
  else if (opts.payTo) params.set("payTo", opts.payTo);
  const query = params.toString() ? `?${params.toString()}` : "";
  return adaptSummaryFromCustomers(
    validatePhaseBCustomerListResponse(await bffFetch<unknown>(`/customers${query}`)),
  );
}

// freshness indicator (撤去済) 再導入用のヘルパー。
// summary から最新観測の unix sec を選ぶ。フォールバック順:
//   1. observations[].blockTimestamp の max (秒精度)
//   2. dailyMetrics[].day を YYYY-MM-DD として UTC 0:00 の unix sec に変換した max
//   3. どちらも空 / 0 -> undefined
export function pickLatestObservationUnixSec(summary: ReportSummaryDto): number | undefined {
  const obsMax = summary.observations.reduce<number>(
    (acc, observation) => (observation.blockTimestamp > acc ? observation.blockTimestamp : acc),
    0,
  );
  if (obsMax > 0) return obsMax;

  const dayMax = summary.dailyMetrics.reduce<number>((acc, metric) => {
    const parsed = Date.parse(`${metric.day}T00:00:00Z`);
    if (Number.isNaN(parsed)) return acc;
    const sec = Math.floor(parsed / 1000);
    return sec > acc ? sec : acc;
  }, 0);
  if (dayMax > 0) return dayMax;

  return undefined;
}
