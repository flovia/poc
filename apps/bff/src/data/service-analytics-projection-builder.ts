import {
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  type CustomerIntelligenceFixture,
  type EvidenceLabel,
  type ServiceAnalyticsComparisonResponse,
  type ServiceAnalyticsQuadrantResponse,
  type ServiceAnalyticsSummaryResponse,
} from "contracts";

import type { JoinedProjectionRecord } from "./phase-b-projection-builder";

export type ServiceAnalyticsProjectionSet = {
  summary: ServiceAnalyticsSummaryResponse;
  comparison: ServiceAnalyticsComparisonResponse;
  quadrants: ServiceAnalyticsQuadrantResponse;
};

const demoReason: EvidenceLabel = {
  provenance: "demo_label",
  label: "mock endpoint attribution",
  description:
    "Endpoint fields are attached by deterministic demo attribution, not inferred from onchain data.",
};

const onchainReason: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "CoinGecko payTo transfer fact",
  sourceFields: ["txHash", "payerWallet", "payTo", "amount", "timestamp"],
};

const preparedIntelligenceReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "prepared x402 service intelligence",
  description: "Peer service comparison uses prepared customer intelligence fixtures.",
};

const generatedFromServiceAnalytics = "service-analytics-projection";

const byPayer = (records: JoinedProjectionRecord[]) => {
  const grouped = new Map<string, JoinedProjectionRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.payerWallet);
    if (existing) existing.push(record);
    else grouped.set(record.payerWallet, [record]);
  }
  return [...grouped.entries()].map(([payerWallet, payerRecords]) => ({
    payerWallet,
    records: payerRecords.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  }));
};

const unique = <T>(items: T[]) => [...new Set(items)];

const uniqueEndpointCount = (records: JoinedProjectionRecord[]) =>
  unique(records.map((record) => record.endpointPath)).length;

const byEndpoint = (records: JoinedProjectionRecord[]) => {
  const grouped = new Map<string, JoinedProjectionRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.endpointPath);
    if (existing) existing.push(record);
    else grouped.set(record.endpointPath, [record]);
  }
  return [...grouped.values()].map((endpointRecords) => endpointRecords);
};

const ratio = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));

const average = (numerator: number, denominator: number) => ratio(numerator, denominator);

const sourceNameFromResource = (resource: string | null) => {
  if (!resource) return null;
  try {
    const url = new URL(resource);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return resource;
  }
};

const peerServiceName = (service: CustomerIntelligenceFixture["x402Services"][number]) =>
  service.serviceName ??
  service.providerName ??
  sourceNameFromResource(service.resource) ??
  service.candidateId;

export const buildServiceAnalyticsProjections = (
  joinedRecords: JoinedProjectionRecord[],
  customerIntelligence: CustomerIntelligenceFixture,
): ServiceAnalyticsProjectionSet => {
  const generatedAt = customerIntelligence.generatedAt;
  const generatedFrom = `${generatedFromServiceAnalytics}:phase-b-demo-fixtures`;
  const serviceId = "coingecko";
  const groupedByPayer = byPayer(joinedRecords);
  const userCount = groupedByPayer.length;
  const transactionCount = joinedRecords.length;
  const averageTransactionsPerUser = average(transactionCount, userCount);
  const repeatUserRate = ratio(
    groupedByPayer.filter(({ records }) => records.length > 1).length,
    userCount,
  );

  const topEndpoints = byEndpoint(joinedRecords)
    .map((endpointRecords) => ({
      endpointPath: endpointRecords[0].endpointPath,
      endpointName: endpointRecords[0].endpointName,
      transactionCount: endpointRecords.length,
      userCount: unique(endpointRecords.map((record) => record.payerWallet)).length,
      endpointAttributionStatus: "demo_attributed_endpoint" as const,
      attributionConfidence: 0.65,
      provenance: "derived_insight" as const,
      provenanceByField: {
        endpointPath: "demo_label" as const,
        endpointName: "demo_label" as const,
        transactionCount: "derived_insight" as const,
        userCount: "derived_insight" as const,
      },
      reasons: [onchainReason, demoReason],
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount);

  const coingeckoService = validateServiceAnalyticsComparisonResponse({
    generatedAt,
    generatedFrom,
    services: [
      {
        serviceId,
        serviceName: "CoinGecko x402",
        userCount,
        transactionCount,
        repeatUserRate,
        averageTransactionsPerUser,
        endpointDiversity: uniqueEndpointCount(joinedRecords),
        userOverlapWithCoinGecko: userCount,
        sampleBasis: "coingecko transaction fixture",
        coverage: "sampled coingecko payTo transfer facts",
        endpointAttributionStatus: "demo_attributed_endpoint",
        attributionConfidence: 0.65,
        provenance: "derived_insight",
        provenanceByField: {
          serviceId: "derived_insight",
          userCount: "onchain_fact",
          transactionCount: "onchain_fact",
          repeatUserRate: "derived_insight",
          averageTransactionsPerUser: "derived_insight",
          endpointDiversity: "demo_label",
          userOverlapWithCoinGecko: "derived_insight",
          sampleBasis: "derived_insight",
        },
        reasons: [onchainReason, demoReason],
      },
    ],
    provenance: "derived_insight",
    provenanceByField: { services: "derived_insight" },
    reasons: [onchainReason, demoReason, preparedIntelligenceReason],
  }).services[0];

  const coingeckoPayTo = joinedRecords[0]?.payTo.toLowerCase();
  const peerServiceGroups = new Map<string, CustomerIntelligenceFixture["x402Services"]>();

  for (const service of customerIntelligence.x402Services) {
    if (service.payTo.toLowerCase() === coingeckoPayTo) continue;
    const serviceKey = service.payTo.toLowerCase();
    peerServiceGroups.set(serviceKey, [...(peerServiceGroups.get(serviceKey) ?? []), service]);
  }

  const peerServices = [...peerServiceGroups.entries()]
    .map(([payTo, services]) => {
      const representative = services[0];
      if (!representative) {
        throw new Error(`empty peer service group: ${payTo}`);
      }
      const resources = unique(
        services.map((service) => service.resource).filter((resource) => resource !== null),
      );
      const peerTransactionCount = services.reduce(
        (sum, service) => sum + service.transactionCount,
        0,
      );
      const peerUserCount = peerTransactionCount > 0 ? 1 : 0;
      return {
        serviceId: payTo,
        serviceName: peerServiceName(representative),
        userCount: peerUserCount,
        transactionCount: peerTransactionCount,
        repeatUserRate: peerTransactionCount > 1 ? 1 : 0,
        averageTransactionsPerUser: average(peerTransactionCount, peerUserCount),
        endpointDiversity: resources.length,
        userOverlapWithCoinGecko: peerTransactionCount > 0 ? 1 : 0,
        sampleBasis: "single customer intelligence fixture",
        coverage: "sampled customer intelligence wallet",
        endpointAttributionStatus:
          resources.length === 1 ? "direct_payto_endpoint" : "bundled_payto_unknown_endpoint",
        attributionConfidence: resources.length === 1 ? 0.85 : 0.35,
        provenance: "derived_insight" as const,
        provenanceByField: {
          serviceId: "derived_insight" as const,
          serviceName:
            representative.provenanceByField?.serviceName ?? ("derived_insight" as const),
          userCount: "derived_insight" as const,
          transactionCount: "onchain_fact" as const,
          repeatUserRate: "derived_insight" as const,
          averageTransactionsPerUser: "derived_insight" as const,
          endpointDiversity:
            resources.length > 0 ? ("derived_insight" as const) : ("future_sdk_field" as const),
          userOverlapWithCoinGecko: "derived_insight" as const,
          sampleBasis: "derived_insight" as const,
        },
        reasons: services.flatMap((service) => service.reasons).length
          ? services.flatMap((service) => service.reasons)
          : [preparedIntelligenceReason],
      };
    })
    .sort((a, b) => b.transactionCount - a.transactionCount);

  const comparison = validateServiceAnalyticsComparisonResponse({
    generatedAt,
    generatedFrom,
    services: [coingeckoService, ...peerServices],
    provenance: "derived_insight",
    provenanceByField: {
      services: "derived_insight",
    },
    reasons: [onchainReason, demoReason, preparedIntelligenceReason],
  });

  const peerTransactionTotal = peerServices.reduce(
    (sum, service) => sum + service.transactionCount,
    0,
  );
  const peerAverageMean = average(
    peerServices.reduce((sum, service) => sum + service.averageTransactionsPerUser, 0),
    peerServices.length,
  );
  const summary = validateServiceAnalyticsSummaryResponse({
    generatedAt,
    generatedFrom,
    serviceId,
    userCount,
    transactionCount,
    averageTransactionsPerUser,
    repeatUserRate,
    topEndpoints,
    comparedToX402: {
      userShare: ratio(
        userCount,
        userCount + peerServices.reduce((sum, service) => sum + service.userCount, 0),
      ),
      transactionShare: ratio(transactionCount, transactionCount + peerTransactionTotal),
      activityIndex:
        peerAverageMean === 0
          ? 0
          : Number((averageTransactionsPerUser / peerAverageMean).toFixed(6)),
      sampleBasis: "coingecko transaction fixture compared with prepared x402 service candidates",
      availableServiceCount: comparison.services.length,
    },
    provenance: "derived_insight",
    provenanceByField: {
      serviceId: "derived_insight",
      userCount: "onchain_fact",
      transactionCount: "onchain_fact",
      averageTransactionsPerUser: "derived_insight",
      repeatUserRate: "derived_insight",
      topEndpoints: "derived_insight",
      comparedToX402: "derived_insight",
    },
    reasons: [onchainReason, demoReason, preparedIntelligenceReason],
  });

  const quadrants = validateServiceAnalyticsQuadrantResponse({
    generatedAt,
    generatedFrom,
    axes: {
      x: { key: "averageTransactionsPerUser", label: "Average transactions per user" },
      y: { key: "endpointDiversity", label: "Endpoint diversity" },
    },
    points: comparison.services.map((service) => ({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      x: service.averageTransactionsPerUser,
      y: service.endpointDiversity,
      userCount: service.userCount,
      transactionCount: service.transactionCount,
      sampleBasis: service.sampleBasis,
      isCoinGecko: service.serviceId === serviceId,
      coverage: service.coverage,
      endpointAttributionStatus: service.endpointAttributionStatus,
      attributionConfidence: service.attributionConfidence,
      provenance: service.provenance,
      provenanceByField: {
        x: "derived_insight",
        y: service.provenanceByField?.endpointDiversity ?? "derived_insight",
        userCount: service.provenanceByField?.userCount ?? "derived_insight",
        transactionCount: service.provenanceByField?.transactionCount ?? "derived_insight",
        sampleBasis: service.provenanceByField?.sampleBasis ?? "derived_insight",
      },
      reasons: service.reasons,
    })),
    provenance: "derived_insight",
    provenanceByField: {
      axes: "derived_insight",
      points: "derived_insight",
    },
    reasons: [onchainReason, demoReason, preparedIntelligenceReason],
  });

  return { summary, comparison, quadrants };
};
