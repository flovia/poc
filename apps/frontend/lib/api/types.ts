// Frontend API models are derived from contracts at the BFF boundary. Shapes
// that intentionally differ from contract DTOs are marked as view models below.

import type {
  EvidenceLabel,
  PhaseBCustomerListResponse,
  PhaseBCustomerProfileResponse,
  PhaseBCustomerUpsellExplanationResponse,
  ProviderCatalogResponse,
  WalletUsageGraphResponse,
} from "contracts";

export type { DataProvenance, EvidenceLabel, ProviderCatalogSource } from "contracts";

type ContractCustomerListItem = PhaseBCustomerListResponse["customers"][number];
type ContractProviderCatalogItem = ProviderCatalogResponse["providers"][number];
type ContractCustomerProfile = PhaseBCustomerProfileResponse["profile"];
type ContractCustomerProfileProvider = ContractCustomerProfile["providers"][number];
type ContractCustomerTimelineEvent = ContractCustomerProfile["timeline"][number];
type ContractCustomerInsight = ContractCustomerProfile["insights"][number];
type ContractWalletUsageGraph = WalletUsageGraphResponse["graph"];
type ContractWalletProvider = ContractWalletUsageGraph["providerWallets"][number];
type ContractWalletPayer = ContractWalletProvider["payerWallets"][number];
type ContractWalletObservation = ContractWalletPayer["observations"][number];
type ContractWalletOtherServiceCandidate = ContractWalletPayer["otherServiceCandidates"][number];

export type UpsellOpportunity = ContractCustomerListItem["upsellOpportunity"];

// View model: contract customer list item with ISO datetime converted to a unix timestamp.
export type CustomerListItemDto = Omit<
  ContractCustomerListItem,
  "evidence" | "lastSeenAt" | "reasons"
> & {
  lastSeenAt: number;
  reasons: EvidenceLabel[];
};

// Derived frontend model: provider catalog item with frontend-only evidence aliases removed
// and reasons normalized to an array by the adapter.
export type ProviderCatalogItemDto = Omit<
  ContractProviderCatalogItem,
  "evidence" | "mappingPattern" | "reasons"
> & {
  reasons: EvidenceLabel[];
};

// View model: compact identity used by legacy UI copy.
export type CustomerIdentityDto = Pick<ContractCustomerProfile["identity"], "address" | "label"> & {
  network?: ContractCustomerProfile["identity"]["network"];
  role: "payer_wallet";
  identityBasis: "wallet_address";
  caveat: string;
};

export type CustomerMetricsDto = Pick<
  ContractCustomerProfile["metrics"],
  "activityGrowth" | "entryPointRatio" | "freeTierProgress" | "spendAtomic" | "upsellOpportunity"
>;

// View model: profile provider usage aggregated by provider/payTo and timestamp-normalized.
export type CustomerProviderUsageDto = Pick<
  ContractCustomerProfileProvider,
  "apiPaths" | "payToWallet" | "providerId" | "spendAtomic" | "transactionCount"
> & {
  name: ContractCustomerProfileProvider["name"];
  firstSeenAt: number;
  lastSeenAt: number;
};

export type CustomerTimelineEventType = "payment" | "provider_usage" | "growth" | "upsell_signal";

// View model: contract timeline event mapped to legacy UI event labels and timestamp.
export type CustomerTimelineEventDto = {
  date: ContractCustomerTimelineEvent["at"];
  timestamp: number;
  type: CustomerTimelineEventType;
  title: string;
  description: ContractCustomerTimelineEvent["description"];
  amountAtomic?: ContractCustomerTimelineEvent["amountAtomic"];
  providerId?: ContractCustomerTimelineEvent["relatedProviderId"];
  txHash?: string;
};

export type CustomerInsightSeverity = "info" | "opportunity" | "warning";

// View model: contract insight classification mapped to legacy UI severity.
export type CustomerInsightDto = {
  severity: CustomerInsightSeverity;
  title: ContractCustomerInsight["title"];
  description: string;
};

export type CustomerProfileDto = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
  providers: CustomerProviderUsageDto[];
  timeline: CustomerTimelineEventDto[];
  insights: CustomerInsightDto[];
};

// View model: flattens the contract explanation response for the legacy panel.
export type CustomerUpsellExplanationDto = Pick<
  PhaseBCustomerUpsellExplanationResponse,
  "address" | "generatedAt"
> &
  Pick<
    PhaseBCustomerUpsellExplanationResponse["explanation"],
    "caution" | "reasons" | "recommendedAction" | "summary"
  > & {
    modelId: PhaseBCustomerUpsellExplanationResponse["model"]["modelId"];
  };

// View model: legacy graph shape derived from the contract wallet usage graph.
export type WalletUsageGraphDto = {
  generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates";
  payerWalletLanguage: true;
  identityFieldsExcluded: ContractWalletUsageGraph["identityFieldsExcluded"];
  providerWallets: Array<{
    payTo: ContractWalletProvider["payToWallet"];
    claimIds: string[];
    payerWallets: Array<{
      wallet: ContractWalletPayer["address"];
      observations: Array<{
        caseId: ContractWalletObservation["providerId"];
        txHash: string;
        evidenceRefs: string[];
      }>;
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
        confidence: ContractWalletOtherServiceCandidate["confidence"];
        reasons: string[];
        evidenceRefs: string[];
        providerId: ContractWalletOtherServiceCandidate["providerId"];
        providerName: ContractWalletOtherServiceCandidate["providerName"];
        serviceName: ContractWalletOtherServiceCandidate["serviceName"];
        coUsageCount: ContractWalletOtherServiceCandidate["coUsageCount"];
        payToWallet: ContractWalletOtherServiceCandidate["payToWallet"] | null;
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
