export type UpsellOpportunity = "low" | "medium" | "high";

export type CustomerListItemDto = {
  address: string;
  label: string | null;
  observationCount: number;
  spendAtomic: string;
  providerCount: number;
  lastSeenAt: number;
  activityGrowth: number;
  upsellOpportunity: UpsellOpportunity;
};

export type CustomerIdentityDto = {
  address: string;
  label: string | null;
  role: "payer_wallet";
  identityBasis: "wallet_address";
  caveat: string;
};

export type CustomerMetricsDto = {
  spendAtomic: string;
  activityGrowth: number;
  freeTierProgress: number;
  entryPointRatio: number;
  upsellOpportunity: UpsellOpportunity;
};

export type CustomerProviderUsageDto = {
  providerId: string;
  name: string;
  payToWallet: string;
  spendAtomic: string;
  transactionCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
};

export type CustomerTimelineEventType = "payment" | "provider_usage" | "growth" | "upsell_signal";

export type CustomerTimelineEventDto = {
  date: string;
  timestamp: number;
  type: CustomerTimelineEventType;
  title: string;
  description: string;
  amountAtomic?: string;
  providerId?: string;
  txHash?: string;
};

export type CustomerInsightDto = {
  severity: "info" | "opportunity" | "warning";
  title: string;
  description: string;
};

export type CustomerProfileDto = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
  providers: CustomerProviderUsageDto[];
  timeline: CustomerTimelineEventDto[];
  insights: CustomerInsightDto[];
};
