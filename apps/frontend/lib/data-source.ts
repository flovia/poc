// Server data source dispatcher. DashboardMode は UI 状態、ServerDataSource は
// SSR がどこから DTO を読むかの infra 状態として分離する.
// dynamic import で fixture モジュールを BFF モード時に評価しないようにし,
// production build で別チャンクに分離する.

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
import { resolveServerDataSource } from "./data-source-env";

// 主役 wallet の正規アドレス. wallet/[address]/page.tsx の redirect で使う.
export const SDK_PROTAGONIST_ADDRESS = "0x7A91...C4E8";

async function sdkModule() {
  return import("./sdk-fixtures");
}

function shouldUseFixture(): boolean {
  return resolveServerDataSource() === "fixture";
}

export async function getProviders(): Promise<ProviderCatalogItemDto[]> {
  if (shouldUseFixture()) return [];
  return live.getProviders();
}

export async function getCustomers(payTo?: string): Promise<CustomerListItemDto[]> {
  if (!shouldUseFixture()) return live.getCustomers(payTo);
  const v = await sdkModule();
  return v.getCustomers();
}

export async function getCustomerProfile(address: string): Promise<CustomerProfileDto | null> {
  if (!shouldUseFixture()) return live.getCustomerProfile(address);
  const v = await sdkModule();
  return v.getCustomerProfile(address);
}

export async function getObservations(): Promise<PaymentObservationDto[]> {
  if (!shouldUseFixture()) return live.getObservations();
  const v = await sdkModule();
  return v.getObservations();
}

export async function getSummary(payTo?: string): Promise<ReportSummaryDto> {
  if (!shouldUseFixture()) return live.getSummary(payTo);
  const v = await sdkModule();
  return v.getSummary();
}

export async function getSdkExtras(address: string): Promise<SdkExtras | null> {
  if (!shouldUseFixture()) return null;
  const v = await sdkModule();
  return v.getExtras(address);
}

export async function getSdkExtrasMap(): Promise<Map<string, SdkExtras>> {
  if (!shouldUseFixture()) return new Map();
  const v = await sdkModule();
  return v.getExtrasMap();
}

export async function getSdkForceNetwork(address: string): Promise<SdkForceNetwork | null> {
  if (!shouldUseFixture()) return null;
  const v = await sdkModule();
  return v.getForceNetwork(address);
}

export async function getWalletUsageGraph(): Promise<WalletUsageGraphDto | null> {
  if (!shouldUseFixture()) return live.getWalletUsageGraph();
  const v = await sdkModule();
  return v.getWalletUsageGraph();
}

// freshness indicator (撤去済) を再導入する際のヘルパー。
// on-chain only / sdk いずれの summary 形状でも同一の選択ロジックで動く。
// 詳細は docs/future-work.md "Data freshness indicator" を参照。
export { pickLatestObservationUnixSec } from "./api/client";
