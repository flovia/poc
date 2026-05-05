// BFF DTO 型のフロント側ミラー。`apps/bff/src/api/customer-dto.ts` および
// `apps/cli/lib/api/dto.ts` の export と一対一で対応する。BFF が拡張された
// ときはここも合わせて更新する。

import type { DataProvenance, EvidenceLabel, ProviderCatalogSource } from "contracts";

export type { DataProvenance, EvidenceLabel, ProviderCatalogSource } from "contracts";

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
  chains?: string[];
  assets?: string[];
  spendByAsset?: Record<string, string>;
  tags?: string[];
  provenance: DataProvenance;
  provenanceByField: Record<string, DataProvenance>;
  reasons: EvidenceLabel[];
};

export type ProviderCatalogItemDto = {
  providerId: string;
  name: string;
  serviceId?: string;
  serviceName?: string;
  network: string;
  asset: string;
  payTo: string;
  catalogSource?: ProviderCatalogSource;
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  endpointCount: number;
  resourceCount: number;
  endpointAttributionStatus: string;
  attributionConfidence: number;
  hasCustomerFacts: boolean;
  customerFactCount: number;
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceUrl?: string;
  hasMetering?: boolean;
  hasFreeTier?: boolean;
  providerSha?: string;
  registryVersion?: string;
  registryGeneratedAt?: string;
  registrySourceUrl?: string;
  offers?: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payToAddress: string;
    probePriceUsd?: number;
  }>;
  protocol?: "x402" | "MPP";
  chain?: string;
  assetSymbol?: string;
  priceRangeUsd?: { min: number; max: number };
  resources?: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    description?: string;
    method?: string;
    inputSchema?: unknown;
    lastUpdated?: string;
    x402Version?: number;
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    transactionCount?: number;
    totalAmountAtomic?: string;
  }>;
  provenance: DataProvenance;
  provenanceByField: Record<string, DataProvenance>;
  reasons: EvidenceLabel[];
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

export type CustomerUpsellExplanationDto = {
  generatedAt: string;
  address: string;
  modelId: string;
  summary: string;
  reasons: string[];
  recommendedAction: string;
  caution: string;
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
        // Legacy aliases kept for backward compatibility with the original
        // patterns view model. New consumers should prefer the explicit
        // providerId / serviceName / payToWallet fields below.
        /** @deprecated use providerId */
        caseId: string;
        /** @deprecated use serviceName */
        candidateType: string;
        /** @deprecated use payToWallet */
        entityId: string | null;
        confidence: number;
        reasons: string[];
        evidenceRefs: string[];
        providerId: string;
        providerName: string;
        serviceName: string;
        coUsageCount: number;
        payToWallet: string | null;
      }>;
    }>;
  }>;
};

// Phase B BFF は /observations と /summary を提供しないため、フロント側で
// /wallet-usage-graph と /customers から合成した同型 DTO を扱う。
// 用途:
//   - ReportSummaryDto: TopBar の "Updated Xm ago" ラベル
//   - PaymentObservationDto: Patterns 画面の retention 計算 (payer x recipient
//     ごとの first/last 期間幅)

export type PaymentObservationDto = {
  observationId: number;
  chainId: number;
  txHash: string;
  blockNumber: number;
  blockTimestamp: number;
  relayerWallet: string;
  payerWallet: string;
  recipientWallet: string;
  tokenAddress: string;
  amountAtomic: string;
  method: string;
  topLevelSelector: string;
  caseId: string;
  stableHash: string;
};

export type DailyMetricDto = {
  day: string;
  observationCount: number;
  candidateCount: number;
  uniquePayers: number;
  uniqueRecipients: number;
  uniqueRelayers: number;
  totalAmountAtomic: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportSummaryDto = {
  generatedAt: string;
  counts: {
    observations: number;
    attributionCandidates: number;
    dailyMetrics: number;
    payerWalletProfiles: number;
    recipientSummaries: number;
    relayerSummaries: number;
    walletUsageGraphProviderWallets: number;
  };
  scopeNote: string;
  observations: PaymentObservationDto[];
  dailyMetrics: DailyMetricDto[];
};
