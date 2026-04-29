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

export type RetentionCohortDto = {
  cohortDate: string;
  cohortSize: number;
  retainedCount: number;
  retentionRate: number;
};

export type RetentionMetricDto = {
  metric: "d14_retention";
  retentionDays: 14;
  cohortBasis: "first_paid_at";
  retainedBasis: "last_paid_at_at_or_after_d14";
  cohortSize: number;
  retainedCount: number;
  retentionRate: number;
  cohorts: RetentionCohortDto[];
  caveat: string;
};
