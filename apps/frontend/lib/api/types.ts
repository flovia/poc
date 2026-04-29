// BFF DTO 型のフロント側ミラー。`apps/bff/src/api/customer-dto.ts` および
// `apps/cli/lib/api/dto.ts` の export と一対一で対応する。BFF が拡張された
// ときはここも合わせて更新する。

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

export type CustomerInsightSeverity = "info" | "opportunity" | "warning";

export type CustomerInsightDto = {
  severity: CustomerInsightSeverity;
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

export type WalletUsageGraphDto = {
  generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates";
  payerWalletLanguage: true;
  identityFieldsExcluded: string[];
  providerWallets: Array<{
    payTo: string;
    claimIds: string[];
    payerWallets: Array<{
      wallet: string;
      observations: Array<{ caseId: string; txHash: string; evidenceRefs: string[] }>;
      otherServiceCandidates: Array<{
        caseId: string;
        candidateType: string;
        entityId: string | null;
        confidence: number;
        reasons: string[];
        evidenceRefs: string[];
      }>;
    }>;
  }>;
};
