// On-chain only (BFF) と SDK connected (fixture) の data source dispatcher.
// dynamic import で sdk モジュールを on-chain only モード時に評価しないようにし,
// production build で別チャンクに分離する.

import { getServerDashboardMode } from "./data-mode";
import * as live from "./api/client";
import type {
  CustomerListItemDto,
  CustomerProfileDto,
  PaymentObservationDto,
  ProviderCatalogItemDto,
  ReportSummaryDto,
  WalletUsageGraphDto,
} from "./api/types";
import type { SdkExtras, SdkForceNetwork } from "./sdk-fixtures/types";

// 主役 wallet の正規アドレス. wallet/[address]/page.tsx の redirect で使う.
export const SDK_PROTAGONIST_ADDRESS = "0x7A91...C4E8";

async function sdkModule() {
  return import("./sdk-fixtures");
}

export async function getProviders(): Promise<ProviderCatalogItemDto[]> {
  const mode = await getServerDashboardMode();
  if (mode === "sdkConnected") return [];
  return live.getProviders();
}

export type GetCustomersFilter = { payTo?: string; serviceId?: string };

export async function getCustomers(
  filter?: string | GetCustomersFilter,
): Promise<CustomerListItemDto[]> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return live.getCustomers(filter);
  const v = await sdkModule();
  return v.getCustomers();
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return live.getCustomerProfile(address);
  const v = await sdkModule();
  return v.getCustomerProfile(address);
}

export async function getObservations(): Promise<PaymentObservationDto[]> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return live.getObservations();
  const v = await sdkModule();
  return v.getObservations();
}

export async function getSummary(filter?: string | GetCustomersFilter): Promise<ReportSummaryDto> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return live.getSummary(filter);
  const v = await sdkModule();
  return v.getSummary();
}

export async function getSdkExtras(address: string): Promise<SdkExtras | null> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return null;
  const v = await sdkModule();
  return v.getExtras(address);
}

export async function getSdkExtrasMap(): Promise<Map<string, SdkExtras>> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return new Map();
  const v = await sdkModule();
  return v.getExtrasMap();
}

export async function getSdkForceNetwork(address: string): Promise<SdkForceNetwork | null> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return null;
  const v = await sdkModule();
  return v.getForceNetwork(address);
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto | null> {
  const mode = await getServerDashboardMode();
  if (mode === "onChainOnly") return live.getWalletUsageGraph();
  const v = await sdkModule();
  return v.getWalletUsageGraph();
}

// freshness indicator (撤去済) を再導入する際のヘルパー。
// on-chain only / sdk いずれの summary 形状でも同一の選択ロジックで動く。
// 詳細は docs/future-work.md "Data freshness indicator" を参照。
export { pickLatestObservationUnixSec } from "./api/client";
