// Phase 7-8 sdk-fixtures: 公開 API. data-source.ts から dynamic import で読まれる.

import "./_assert"; // 起動時 assert (副作用 import)

import type {
  CustomerListItemDto,
  CustomerProfileDto,
  PaymentObservationDto,
  ReportSummaryDto,
  WalletUsageGraphDto,
} from "@/lib/api/types";
import type { SdkExtras, SdkForceNetwork } from "./types";
import {
  PROTAGONIST_EXTRAS,
  PROTAGONIST_LIST_ITEM,
  PROTAGONIST_NETWORK,
  PROTAGONIST_PROFILE,
} from "./protagonist";
import {
  SECONDARIES,
  SECONDARY_LIST_ITEMS,
  getSecondaryExtras,
  getSecondaryProfile,
} from "./secondaries";
import { buildSdkObservations, buildSdkSummary } from "./patterns";
import { buildSdkWalletUsageGraph } from "./graph";
import { PROTAGONIST_ADDRESS } from "./shared";
import {
  getSnapshotCustomerProfile,
  getSnapshotCustomers,
  getSnapshotExtras,
  getSnapshotExtrasMap,
} from "./snapshot-customers";

export type FixtureCustomersFilter = { payTo?: string; serviceId?: string };

export async function getCustomers(
  filter?: string | FixtureCustomersFilter,
): Promise<CustomerListItemDto[]> {
  const opts: FixtureCustomersFilter =
    typeof filter === "string" ? { payTo: filter } : (filter ?? {});
  const snapshot = getSnapshotCustomers(opts);
  if (snapshot) return snapshot;
  if (
    opts.serviceId &&
    opts.serviceId !== "northwind-price" &&
    !opts.serviceId.startsWith("northwind")
  ) {
    return [];
  }
  return [PROTAGONIST_LIST_ITEM, ...SECONDARY_LIST_ITEMS];
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_PROFILE;
  const snapshot = getSnapshotCustomerProfile(address);
  if (snapshot) return snapshot;
  return getSecondaryProfile(address);
}

export async function getObservations(): Promise<PaymentObservationDto[]> {
  return buildSdkObservations();
}

export async function getSummary(): Promise<ReportSummaryDto> {
  return buildSdkSummary();
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto> {
  return buildSdkWalletUsageGraph();
}

export async function getExtras(address: string): Promise<SdkExtras | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_EXTRAS;
  const snapshot = getSnapshotExtras(address);
  if (snapshot) return snapshot;
  return getSecondaryExtras(address);
}

export async function getExtrasMap(): Promise<Map<string, SdkExtras>> {
  const map = new Map<string, SdkExtras>(getSnapshotExtrasMap());
  map.set(PROTAGONIST_ADDRESS, PROTAGONIST_EXTRAS);
  for (const s of SECONDARIES) {
    const ex = getSecondaryExtras(s.address);
    if (ex) map.set(s.address, ex);
  }
  return map;
}

export async function getForceNetwork(address: string): Promise<SdkForceNetwork | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_NETWORK;
  return null;
}
