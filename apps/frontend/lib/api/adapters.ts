import type {
  PhaseBCustomerListResponse,
  PhaseBCustomerProfileResponse,
  WalletUsageGraphResponse,
} from "contracts";
import type {
  CustomerInsightSeverity,
  CustomerListItemDto,
  CustomerProfileDto,
  CustomerProviderUsageDto,
  CustomerTimelineEventType,
  WalletUsageGraphDto,
} from "./types";

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
    const key = `${provider.providerId}:${provider.payToWallet.toLowerCase()}`;
    const current = byProvider.get(key);
    const next: CustomerProviderUsageDto = {
      providerId: provider.providerId,
      name: provider.providerName ?? provider.name,
      payToWallet: provider.payToWallet,
      spendAtomic: provider.spendAtomic,
      transactionCount: provider.txCount ?? provider.transactionCount,
      firstSeenAt: toTimestamp(provider.firstSeenAt),
      lastSeenAt: toTimestamp(provider.lastSeenAt),
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
    });
  }

  return Array.from(byProvider.values());
}

export function adaptCustomerList(response: PhaseBCustomerListResponse): CustomerListItemDto[] {
  return response.customers.map((customer) => ({
    address: customer.address,
    label: customer.label,
    observationCount: customer.observationCount,
    spendAtomic: customer.spendAtomic,
    providerCount: customer.providerCount,
    lastSeenAt: toTimestamp(customer.lastSeenAt),
    activityGrowth: customer.activityGrowth,
    upsellOpportunity: customer.upsellOpportunity,
  }));
}

export function adaptCustomerProfile(response: PhaseBCustomerProfileResponse): CustomerProfileDto {
  const { profile } = response;

  return {
    customer: {
      address: profile.identity.address,
      label: profile.identity.label,
      role: "payer_wallet",
      identityBasis: "wallet_address",
      caveat:
        profile.identity.caveat ?? "Payer wallet identity is inferred from BFF demo projection.",
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
        })),
      })),
    })),
  };
}
