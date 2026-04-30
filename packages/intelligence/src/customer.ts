import {
  type CdpResource,
  type CustomerIntelligenceResponse,
  type CustomerIntelligenceScope,
  type CustomerOutgoingTransferFact,
  type DeFiPosition,
  type EvidenceLabel,
  type PayToActivity,
  type PortfolioSourceResult,
  type SourceCoverage,
  type X402ServiceCandidate,
  normalizeAsset,
  normalizeNetwork,
  normalizePayTo,
  paymentIdentityKey,
  validateCustomerIntelligenceResponse,
} from "contracts";

export type MatchedPayToActivity = {
  activity: PayToActivity;
  resources: CdpResource[];
};

const onchainReason: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "customer outgoing transfer fact",
  sourceFields: ["customerAddress", "payTo", "amountAtomic", "txHash", "timestamp"],
};

const derivedReason = (label: string): EvidenceLabel => ({ provenance: "derived_insight", label });

const isInWindow = (transfer: CustomerOutgoingTransferFact, scope: CustomerIntelligenceScope) => {
  const timestamp = Date.parse(transfer.timestamp);
  return (
    transfer.customerAddress === scope.address &&
    normalizeNetwork(transfer.network) === normalizeNetwork(scope.network) &&
    normalizeAsset(transfer.asset) === normalizeAsset(scope.asset) &&
    timestamp >= Date.parse(scope.timeWindow.from) &&
    timestamp <= Date.parse(scope.timeWindow.to)
  );
};

export const aggregatePayToActivities = (
  transfers: CustomerOutgoingTransferFact[],
  scope: CustomerIntelligenceScope,
): PayToActivity[] => {
  const grouped = new Map<string, CustomerOutgoingTransferFact[]>();
  for (const transfer of transfers.filter((item) => isInWindow(item, scope))) {
    const key = paymentIdentityKey({
      network: transfer.network,
      asset: transfer.asset,
      payTo: transfer.payTo,
    });
    grouped.set(key, [...(grouped.get(key) ?? []), transfer]);
  }

  return [...grouped.values()]
    .map((items) => {
      const ordered = [...items].sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp),
      );
      const first = ordered[0];
      if (!first) throw new Error("cannot aggregate empty payTo activity");
      const txHashes = ordered.map((item) => item.txHash);
      return {
        payTo: first.payTo,
        network: normalizeNetwork(first.network),
        asset: normalizeAsset(first.asset),
        transactionCount: ordered.length,
        totalAmountAtomic: ordered
          .reduce((sum, item) => sum + BigInt(item.amountAtomic), 0n)
          .toString(),
        latestTimestamp: ordered[0]?.timestamp,
        txHashes,
        provenance: "onchain_fact",
        provenanceByField: {
          payTo: "onchain_fact",
          network: "onchain_fact",
          asset: "onchain_fact",
          transactionCount: "onchain_fact",
          totalAmountAtomic: "onchain_fact",
          latestTimestamp: "onchain_fact",
        },
        evidence: [{ provenance: "onchain_fact", label: "Bitquery outgoing transfer", txHashes }],
      } satisfies PayToActivity;
    })
    .sort((left, right) => right.transactionCount - left.transactionCount);
};

export const matchPayToToPaymentOptions = (
  activities: PayToActivity[],
  resources: CdpResource[],
): MatchedPayToActivity[] => {
  const byPaymentIdentity = new Map<string, CdpResource[]>();
  for (const resource of resources) {
    for (const option of resource.paymentOptions) {
      const key = paymentIdentityKey(option);
      byPaymentIdentity.set(key, [...(byPaymentIdentity.get(key) ?? []), resource]);
    }
  }

  return activities.map((activity) => ({
    activity,
    resources: byPaymentIdentity.get(paymentIdentityKey(activity)) ?? [],
  }));
};

export const scoreServiceCandidates = (matches: MatchedPayToActivity[]): X402ServiceCandidate[] =>
  matches.flatMap(({ activity, resources }) => {
    const matchedResources = resources.length > 0 ? resources : [null];
    return matchedResources.map((resource) => {
      const hasResource = resource !== null;
      const option = resource?.paymentOptions.find(
        (item) => paymentIdentityKey(item) === paymentIdentityKey(activity),
      );
      return {
        candidateId: hasResource
          ? `${resource.resourceId}::${paymentIdentityKey(activity)}`
          : `unresolved::${paymentIdentityKey(activity)}`,
        payTo: activity.payTo,
        providerName: resource?.provider ?? null,
        serviceName: resource?.service ?? null,
        resource: resource?.resource ?? null,
        network: activity.network,
        asset: activity.asset,
        transactionCount: activity.transactionCount,
        totalAmountAtomic: activity.totalAmountAtomic,
        confidence: hasResource ? Math.min(0.95, 0.65 + activity.transactionCount * 0.05) : 0.35,
        provenance: "derived_insight",
        provenanceByField: {
          payTo: "onchain_fact",
          transactionCount: "onchain_fact",
          totalAmountAtomic: "onchain_fact",
          providerName: hasResource ? "derived_insight" : "future_sdk_field",
          serviceName: hasResource ? "derived_insight" : "future_sdk_field",
        },
        evidence: [
          ...activity.evidence,
          ...(option
            ? [
                {
                  provenance: "derived_insight" as const,
                  label: "matched CDP payment option",
                  sourceFields: ["network", "asset", "payTo"],
                },
              ]
            : [
                {
                  provenance: "derived_insight" as const,
                  label: "unresolved payTo activity",
                  sourceFields: ["payTo"],
                },
              ]),
        ],
        reasons: [
          hasResource
            ? derivedReason("payTo matched CDP payment option")
            : derivedReason("service metadata unresolved"),
        ],
      };
    });
  });

export const classifyDefiActivity = (portfolio: PortfolioSourceResult) => {
  const positions = portfolio.positions ?? [];
  const sourceCoverage = portfolio.sourceCoverage;
  return {
    portfolioSummary: {
      totalValueUsd: portfolio.summary?.totalValueUsd ?? null,
      tokenCount: portfolio.summary?.tokenCount ?? 0,
      sourceCoverage,
      provenance: "derived_insight",
      provenanceByField: { sourceCoverage: "derived_insight" },
      reasons: [
        sourceCoverage.status === "available"
          ? derivedReason(
              portfolio.summary?.chains?.length
                ? `portfolio source captured wallet-wide chains: ${portfolio.summary.chains.join(", ")}`
                : "portfolio source captured",
            )
          : derivedReason(sourceCoverage.unavailableReason ?? "portfolio source unavailable"),
      ],
    },
    defiPositions: positions.map(
      (position) =>
        ({
          ...position,
          network: normalizeNetwork(position.network),
          provenance: "onchain_fact",
          provenanceByField: { protocol: "onchain_fact", valueUsd: "onchain_fact" },
          reasons: position.reasons,
          evidence: position.evidence,
        }) satisfies DeFiPosition,
    ),
    isDefiActive: positions.length > 0,
  };
};

export const buildCustomerIntelligence = (input: {
  scope: CustomerIntelligenceScope;
  transfers: CustomerOutgoingTransferFact[];
  resources: CdpResource[];
  portfolio: PortfolioSourceResult;
  generatedAt?: string;
  generatedFrom?: string;
}): CustomerIntelligenceResponse => {
  const activities = aggregatePayToActivities(input.transfers, input.scope);
  const matches = matchPayToToPaymentOptions(activities, input.resources);
  const x402Services = scoreServiceCandidates(matches);
  const { portfolioSummary, defiPositions, isDefiActive } = classifyDefiActivity(input.portfolio);

  return validateCustomerIntelligenceResponse({
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    generatedFrom: input.generatedFrom ?? "customer-intelligence-capture",
    customerAddress: input.scope.address,
    scope: input.scope,
    x402Services,
    payToActivities: activities,
    portfolioSummary,
    defiPositions,
    insights:
      x402Services.length > 0 || isDefiActive
        ? [
            {
              key: isDefiActive ? "defi-active" : "external-x402-activity",
              title: isDefiActive ? "DeFi active customer" : "External x402 activity candidate",
              summary: isDefiActive
                ? "Portfolio positions indicate DeFi activity."
                : "Outgoing payments indicate external x402 service activity candidates.",
              classification: isDefiActive ? "defi_activity" : "partnership",
              confidence: x402Services.length > 0 ? 0.75 : 0.6,
              provenance: "derived_insight",
              provenanceByField: { summary: "derived_insight" },
              reasons: [
                isDefiActive ? derivedReason("portfolio positions observed") : onchainReason,
              ],
            },
          ]
        : [],
    sourceCoverage: [
      { source: "bitquery", status: "available" },
      { source: "cdp_discovery", status: "available" },
      input.portfolio.sourceCoverage,
    ],
    provenance: "derived_insight",
    provenanceByField: {
      customerAddress: "onchain_fact",
      payToActivities: "onchain_fact",
      x402Services: "derived_insight",
      portfolioSummary: "derived_insight",
      insights: "derived_insight",
    },
    evidence: activities.flatMap((activity) => activity.evidence),
    reasons: [
      activities.length > 0
        ? onchainReason
        : derivedReason("source queried with no outgoing transfers observed"),
    ],
  });
};
