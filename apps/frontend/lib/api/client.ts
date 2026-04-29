import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";
import { adaptCustomerList, adaptCustomerProfile, adaptWalletUsageGraph } from "./adapters";
import type {
  CustomerListItemDto,
  CustomerProfileDto,
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
