import {
  type PhaseBCustomerListResponse,
  type PhaseBCustomerUpsellExplanationResponse,
  type PhaseBCustomerProfileResponse,
  type ProviderCatalogResponse,
  type WalletUsageGraphResponse,
  normalizePaymentRecipientAddress,
} from "contracts";
import type {
  CustomerInsightSeverity,
  CustomerListItemDto,
  CustomerProfileDto,
  CustomerProviderUsageDto,
  CustomerUpsellExplanationDto,
  CustomerTimelineEventType,
  PaymentObservationDto,
  ProviderCatalogItemDto,
  ReportSummaryDto,
  WalletUsageGraphDto,
} from "./types";

// Pure adapters from validated contract DTOs to frontend view models. Keep any
// UI-only shape changes here so contract DTOs do not drift into component code.

const DEFAULT_TIMESTAMP = 0;

function toTimestamp(value: string | undefined): number {
  if (!value) return DEFAULT_TIMESTAMP;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? DEFAULT_TIMESTAMP : Math.floor(timestamp / 1000);
}

function timelineEventType(
  eventType: PhaseBCustomerProfileResponse["profile"]["timeline"][number]["eventType"],
): CustomerTimelineEventType {
  switch (eventType) {
    case "payment":
      return "payment";
    case "co_usage":
      return "provider_usage";
    case "activation":
      return "growth";
    case "insight":
      return "upsell_signal";
    case "other":
      return "provider_usage";
  }
}

function insightSeverity(
  classification: PhaseBCustomerProfileResponse["profile"]["insights"][number]["classification"],
): CustomerInsightSeverity {
  switch (classification) {
    case "upsell":
      return "opportunity";
    case "retention":
      return "warning";
    case "partnership":
      return "info";
  }
}

function minTimestamp(left: number, right: number): number {
  if (left === DEFAULT_TIMESTAMP) return right;
  if (right === DEFAULT_TIMESTAMP) return left;
  return Math.min(left, right);
}

function aggregateProviderUsage(
  providers: PhaseBCustomerProfileResponse["profile"]["providers"],
): CustomerProviderUsageDto[] {
  const byProvider = new Map<string, CustomerProviderUsageDto>();

  for (const provider of providers) {
    const key = `${provider.providerId}:${normalizePaymentRecipientAddress(provider.payToWallet)}`;
    const current = byProvider.get(key);
    const next: CustomerProviderUsageDto = {
      providerId: provider.providerId,
      name: provider.providerName ?? provider.name,
      payToWallet: provider.payToWallet,
      spendAtomic: provider.spendAtomic,
      transactionCount: provider.txCount ?? provider.transactionCount,
      firstSeenAt: toTimestamp(provider.firstSeenAt),
      lastSeenAt: toTimestamp(provider.lastSeenAt),
      ...(provider.apiPaths?.length ? { apiPaths: provider.apiPaths } : {}),
    };

    if (!current) {
      byProvider.set(key, next);
      continue;
    }

    byProvider.set(key, {
      ...current,
      name: current.name || next.name,
      spendAtomic: (BigInt(current.spendAtomic) + BigInt(next.spendAtomic)).toString(),
      transactionCount: current.transactionCount + next.transactionCount,
      firstSeenAt: minTimestamp(current.firstSeenAt, next.firstSeenAt),
      lastSeenAt: Math.max(current.lastSeenAt, next.lastSeenAt),
      apiPaths: Array.from(new Set([...(current.apiPaths ?? []), ...(next.apiPaths ?? [])])),
    });
  }

  return Array.from(byProvider.values());
}

export function adaptCustomerList(response: PhaseBCustomerListResponse): CustomerListItemDto[] {
  return response.customers.map((customer) => {
    const { evidence: _evidence, lastSeenAt, reasons, ...item } = customer;
    return {
      ...item,
      lastSeenAt: toTimestamp(lastSeenAt),
      provenanceByField: customer.provenanceByField ?? {},
      reasons: reasons ?? [],
    } satisfies CustomerListItemDto;
  });
}

export function adaptProviderCatalog(response: ProviderCatalogResponse): ProviderCatalogItemDto[] {
  const adapted = response.providers.map((provider, originalIndex) => ({
    item: toProviderCatalogItem(provider),
    originalIndex,
  }));

  // Stable-sort: pinned providers first (in PINNED_PROVIDER_MARKS order), then
  // everything else in the order the BFF returned (= atlas / skills.json
  // appearance order).
  adapted.sort((left, right) => {
    const leftRank = pinnedRank(left.item);
    const rightRank = pinnedRank(right.item);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.originalIndex - right.originalIndex;
  });
  return adapted.map((entry) => entry.item);
}

function toProviderCatalogItem(
  provider: ProviderCatalogResponse["providers"][number],
): ProviderCatalogItemDto {
  const { mappingPattern: _mappingPattern, reasons, ...item } = provider;
  return {
    ...item,
    provenanceByField: provider.provenanceByField ?? {},
    reasons: reasons ?? [],
  } satisfies ProviderCatalogItemDto;
}

const PINNED_PROVIDER_MARKS = ["nansen", "coingecko"] as const;

function pinnedRank(provider: ProviderCatalogItemDto): number {
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return i;
  }
  return PINNED_PROVIDER_MARKS.length;
}

export function adaptCustomerProfile(response: PhaseBCustomerProfileResponse): CustomerProfileDto {
  const { profile } = response;

  return {
    customer: {
      address: profile.identity.address,
      label: profile.identity.label,
      network: profile.identity.network,
      role: "payer_wallet",
      identityBasis: "wallet_address",
      caveat: profile.identity.caveat ?? "Payer wallet identity is inferred from demo data.",
    },
    metrics: {
      spendAtomic: profile.metrics.spendAtomic,
      activityGrowth: profile.metrics.activityGrowth,
      freeTierProgress: profile.metrics.freeTierProgress,
      entryPointRatio: profile.metrics.entryPointRatio,
      upsellOpportunity: profile.metrics.upsellOpportunity,
    },
    providers: aggregateProviderUsage(profile.providers),
    timeline: profile.timeline.map((event) => ({
      date: event.at,
      timestamp: toTimestamp(event.at),
      type: timelineEventType(event.eventType),
      title: event.eventType.replace(/_/g, " "),
      description: event.description,
      amountAtomic: event.amountAtomic,
      providerId: event.relatedProviderId,
    })),
    insights: profile.insights.map((insight) => ({
      severity: insightSeverity(insight.classification),
      title: insight.title,
      description: `${insight.summary} Confidence: ${Math.round(insight.confidence * 100)}%.`,
    })),
  };
}

export function adaptCustomerUpsellExplanation(
  response: PhaseBCustomerUpsellExplanationResponse,
): CustomerUpsellExplanationDto {
  return {
    generatedAt: response.generatedAt,
    address: response.address,
    modelId: response.model.modelId,
    summary: response.explanation.summary,
    reasons: response.explanation.reasons,
    recommendedAction: response.explanation.recommendedAction,
    caution: response.explanation.caution,
  };
}

// Phase B BFF は /observations を提供しないため、validate 済みの
// /wallet-usage-graph レスポンスから payer x recipient の first/last 観測を
// PaymentObservationDto 列に合成する。Patterns 画面の retention 判定 (14 日比較)
// で使う合成データなので、観測の網羅性は元レスポンス次第。
export function adaptObservationsFromGraph(
  response: WalletUsageGraphResponse,
): PaymentObservationDto[] {
  let nextId = 1;
  const out: PaymentObservationDto[] = [];

  for (const provider of response.graph.providerWallets) {
    const recipient = provider.payToWallet;
    for (const wallet of provider.payerWallets) {
      const payer = wallet.address;
      for (const observation of wallet.observations) {
        const buildAt = (timeIso: string): PaymentObservationDto => ({
          observationId: nextId++,
          chainId: 8453,
          txHash: `${observation.providerId}:${payer}:${timeIso}`,
          blockNumber: 0,
          blockTimestamp: toTimestamp(timeIso),
          relayerWallet: "",
          payerWallet: payer,
          recipientWallet: recipient,
          tokenAddress: "",
          amountAtomic: observation.sharedSpendAtomic,
          method: "",
          topLevelSelector: "",
          caseId: observation.providerId,
          stableHash: `${payer}:${recipient}:${timeIso}`,
        });
        const firstSeen = observation.firstSeenAt;
        const lastSeen = observation.lastSeenAt;
        if (firstSeen) out.push(buildAt(firstSeen));
        if (lastSeen && lastSeen !== firstSeen) out.push(buildAt(lastSeen));
      }
    }
  }

  return out;
}

// Phase B BFF は /summary を提供しないため、validate 済みの /customers
// レスポンスから TopBar の "Updated Xm ago" 用に最低限の ReportSummaryDto を
// 合成する。pickLatestObservationUnixSec は observations[].blockTimestamp の
// max を使うので、各 customer の lastSeenAt から 1 件ずつ詰めれば十分。
export function adaptSummaryFromCustomers(response: PhaseBCustomerListResponse): ReportSummaryDto {
  const observations: PaymentObservationDto[] = response.customers.map((customer, index) => ({
    observationId: index + 1,
    chainId: 8453,
    txHash: `customers-summary:${customer.address}`,
    blockNumber: 0,
    blockTimestamp: toTimestamp(customer.lastSeenAt),
    relayerWallet: "",
    payerWallet: customer.address,
    recipientWallet: "",
    tokenAddress: "",
    amountAtomic: customer.spendAtomic,
    method: "",
    topLevelSelector: "",
    caseId: "customers-summary",
    stableHash: `customers-summary:${customer.address}`,
  }));

  return {
    generatedAt: response.generatedAt,
    counts: {
      observations: observations.length,
      attributionCandidates: 0,
      dailyMetrics: 0,
      payerWalletProfiles: response.customers.length,
      recipientSummaries: 0,
      relayerSummaries: 0,
      walletUsageGraphProviderWallets: 0,
    },
    scopeNote: "Synthetic summary derived from customer data.",
    observations,
    dailyMetrics: [],
  };
}

export function adaptWalletUsageGraph(response: WalletUsageGraphResponse): WalletUsageGraphDto {
  return {
    generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates",
    payerWalletLanguage: true,
    identityFieldsExcluded: response.graph.identityFieldsExcluded,
    providerWallets: response.graph.providerWallets.map((provider) => ({
      payTo: provider.payToWallet,
      claimIds: [provider.providerName, provider.name].filter(
        (value, index, values) => Boolean(value) && values.indexOf(value) === index,
      ),
      payerWallets: provider.payerWallets.map((wallet) => ({
        wallet: wallet.address,
        observations: wallet.observations.map((observation) => ({
          caseId: observation.providerId,
          txHash: `${observation.providerId}:${wallet.address}:${observation.lastSeenAt}`,
          evidenceRefs:
            observation.evidence?.map((evidence) => evidence.label) ??
            observation.reasons?.map((reason) => reason.label) ??
            [],
        })),
        otherServiceCandidates: wallet.otherServiceCandidates.map((candidate) => ({
          caseId: candidate.providerId,
          candidateType: candidate.serviceName,
          entityId: candidate.payToWallet ?? null,
          confidence: candidate.confidence,
          reasons: candidate.reasons?.map((reason) => reason.label) ?? [],
          evidenceRefs: candidate.evidence?.map((evidence) => evidence.label) ?? [],
          providerId: candidate.providerId,
          providerName: candidate.providerName,
          serviceName: candidate.serviceName,
          coUsageCount: candidate.coUsageCount,
          payToWallet: candidate.payToWallet ?? null,
        })),
      })),
    })),
  };
}
