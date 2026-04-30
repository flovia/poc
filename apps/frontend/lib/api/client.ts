import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";
import {
  adaptCustomerList,
  adaptCustomerProfile,
  adaptObservationsFromGraph,
  adaptSummaryFromCustomers,
  adaptWalletUsageGraph,
} from "./adapters";
import type {
  CustomerListItemDto,
  CustomerProfileDto,
  PaymentObservationDto,
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
    throw new Error(`BFF request failed: ${response.status} ${response.statusText} (${path})`);
  }

  return (await response.json()) as T;
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  const response = await fetch(`${bffBaseUrl()}/customers/${encodeURIComponent(address)}/profile`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `BFF request failed: ${response.status} ${response.statusText} (/customers/${address}/profile)`,
    );
  }
  return adaptCustomerProfile(validatePhaseBCustomerProfileResponse(await response.json()));
}

export async function getCustomers(): Promise<CustomerListItemDto[]> {
  return adaptCustomerList(
    validatePhaseBCustomerListResponse(await bffFetch<unknown>("/customers")),
  );
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto> {
  return adaptWalletUsageGraph(
    validatePhaseBWalletUsageGraphResponse(await bffFetch<unknown>("/wallet-usage-graph")),
  );
}

// Phase B BFF は /observations を提供しないため、/wallet-usage-graph から合成する。
// 用途: Patterns 画面の retention 計算 (payer x recipient ごとの first/last 比較)。
export async function getObservations(): Promise<PaymentObservationDto[]> {
  return adaptObservationsFromGraph(
    validatePhaseBWalletUsageGraphResponse(await bffFetch<unknown>("/wallet-usage-graph")),
  );
}

// Phase B BFF は /summary を提供しないため、/customers から合成する。
// 用途: TopBar の "Updated Xm ago" ラベル。
export async function getSummary(): Promise<ReportSummaryDto> {
  return adaptSummaryFromCustomers(
    validatePhaseBCustomerListResponse(await bffFetch<unknown>("/customers")),
  );
}

// TopBar の "Updated …" に渡す unix sec を summary から導出する。
// フォールバック順:
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
