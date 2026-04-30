// Phase 7-8 sdk-fixtures: 公開 API. data-source.ts から dynamic import で読まれる.

import "./_assert"; // 起動時 assert (副作用 import)

import type {
  CustomerListItemDto,
  CustomerProfileDto,
  PaymentObservationDto,
  ReportSummaryDto,
  WalletUsageGraphDto,
} from "@/lib/api/types";
import type {
  SdkExtras,
  SdkForceNetwork,
  SdkRetentionByAgentRow,
  SdkWorkflowCluster,
} from "./types";
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
import {
  SDK_RETENTION_BY_AGENT,
  SDK_WORKFLOW_CLUSTERS,
  buildSdkObservations,
  buildSdkSummary,
  buildSdkWalletUsageGraph,
} from "./patterns";
import { PROTAGONIST_ADDRESS } from "./shared";

export async function getCustomers(): Promise<CustomerListItemDto[]> {
  return [PROTAGONIST_LIST_ITEM, ...SECONDARY_LIST_ITEMS];
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_PROFILE;
  return getSecondaryProfile(address);
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto> {
  return buildSdkWalletUsageGraph();
}

export async function getObservations(): Promise<PaymentObservationDto[]> {
  return buildSdkObservations();
}

export async function getSummary(): Promise<ReportSummaryDto> {
  return buildSdkSummary();
}

export async function getExtras(address: string): Promise<SdkExtras | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_EXTRAS;
  return getSecondaryExtras(address);
}

export async function getExtrasMap(): Promise<Map<string, SdkExtras>> {
  const map = new Map<string, SdkExtras>();
  map.set(PROTAGONIST_ADDRESS, PROTAGONIST_EXTRAS);
  for (const s of SECONDARIES) {
    const ex = getSecondaryExtras(s.address);
    if (ex) map.set(s.address, ex);
  }
  return map;
}

export async function getWorkflowClusters(): Promise<SdkWorkflowCluster[]> {
  return SDK_WORKFLOW_CLUSTERS;
}

export async function getRetentionByAgent(): Promise<SdkRetentionByAgentRow[]> {
  return SDK_RETENTION_BY_AGENT;
}

export async function getForceNetwork(address: string): Promise<SdkForceNetwork | null> {
  if (address === PROTAGONIST_ADDRESS) return PROTAGONIST_NETWORK;
  return null;
}
