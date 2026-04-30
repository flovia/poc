import {
  validateMockEndpointAttributionFixture,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateRealTransactionFixture,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  type CustomerIntelligenceFixture,
  type DataProvenance,
  type EvidenceLabel,
  type MockEndpointAttributionFixture,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type RealTransactionFact,
  type RealTransactionFixture,
  type ServiceAnalyticsComparisonResponse,
  type ServiceAnalyticsQuadrantResponse,
  type ServiceAnalyticsSummaryResponse,
  type WalletUsageGraphResponse,
} from "contracts";

export type JoinedProjectionRecord = RealTransactionFact & {
  endpointPath: string;
  endpointName: string;
  workflowLabel: string;
  requestMethod: string;
  provenanceByField: Record<string, DataProvenance>;
  reasons: EvidenceLabel[];
};

export type PhaseBProjectionSet = {
  customerList: PhaseBCustomerListResponse;
  profilesByAddress: Record<string, PhaseBCustomerProfileResponse>;
  walletUsageGraph: WalletUsageGraphResponse;
  joinedRecords: JoinedProjectionRecord[];
};

export type ServiceAnalyticsProjectionSet = {
  summary: ServiceAnalyticsSummaryResponse;
  comparison: ServiceAnalyticsComparisonResponse;
  quadrants: ServiceAnalyticsQuadrantResponse;
};

const generatedFrom = "phase-a-real-tx-plus-mock-attribution";
const PROFILE_TIMELINE_LIMIT = 20;
const GRAPH_PAYER_WALLET_LIMIT = 100;

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

export const joinTransactionAttribution = (
  transactionFixture: unknown,
  attributionFixture: unknown,
): JoinedProjectionRecord[] => {
  const transactions = validateRealTransactionFixture(transactionFixture);
  const attribution = validateMockEndpointAttributionFixture(attributionFixture);
  return joinValidatedTransactionAttribution(transactions, attribution);
};

const joinValidatedTransactionAttribution = (
  transactions: RealTransactionFixture,
  attribution: MockEndpointAttributionFixture,
): JoinedProjectionRecord[] => {
  const factsByHash = new Map<string, RealTransactionFact[]>();
  const attributionByHash = new Map<string, MockEndpointAttributionFixture["items"]>();

  for (const fact of transactions.facts) {
    const facts = factsByHash.get(fact.txHash) ?? [];
    facts.push(fact);
    factsByHash.set(fact.txHash, facts);
  }

  for (const item of attribution.items) {
    if (!factsByHash.has(item.txHash)) {
      throw new Error(`mock attribution references unknown txHash: ${item.txHash}`);
    }

    const items = attributionByHash.get(item.txHash) ?? [];
    items.push(item);
    attributionByHash.set(item.txHash, items);
  }

  for (const [txHash, facts] of factsByHash) {
    const itemCount = attributionByHash.get(txHash)?.length ?? 0;
    if (itemCount !== facts.length) {
      throw new Error(
        `mock attribution count mismatch for txHash: ${txHash} (${itemCount} attribution items for ${facts.length} transaction facts)`,
      );
    }
  }

  const attributionQueues = new Map(
    [...attributionByHash.entries()].map(([txHash, items]) => [txHash, [...items]]),
  );

  return transactions.facts.map((fact) => {
    const item = attributionQueues.get(fact.txHash)?.shift();
    if (!item) {
      throw new Error(`mock attribution missing txHash: ${fact.txHash}`);
    }

    return {
      ...fact,
      endpointPath: item.endpointPath,
      endpointName: item.endpointName,
      workflowLabel: item.workflowLabel,
      requestMethod: item.requestMethod,
      provenanceByField: {
        txHash: "onchain_fact",
        payerWallet: "onchain_fact",
        payTo: "onchain_fact",
        amount: "onchain_fact",
        asset: "onchain_fact",
        network: "onchain_fact",
        timestamp: "onchain_fact",
        endpointPath: item.provenance.endpointPath,
        endpointName: item.provenance.endpointName,
        workflowLabel: item.provenance.workflowLabel,
        requestMethod: item.provenance.requestMethod,
      },
      reasons: item.reasons,
    };
  });
};

const sumAmounts = (records: JoinedProjectionRecord[]) =>
  records.reduce((sum, record) => sum + BigInt(record.amount), 0n).toString();

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

const firstSeenAt = (records: JoinedProjectionRecord[]) => records.at(-1)?.timestamp;
const lastSeenAt = (records: JoinedProjectionRecord[]) => records[0]?.timestamp;

export const buildPhaseBProjections = (
  transactionFixture: unknown,
  attributionFixture: unknown,
): PhaseBProjectionSet => {
  const transactions = validateRealTransactionFixture(transactionFixture);
  const attribution = validateMockEndpointAttributionFixture(attributionFixture);
  const joinedRecords = joinValidatedTransactionAttribution(transactions, attribution);
  const grouped = byPayer(joinedRecords);
  const generatedAt = transactions.generatedAt;
  const scope = {
    providerId: transactions.providerId,
    network: joinedRecords[0]?.network,
    asset: joinedRecords[0]?.asset,
    payTo: joinedRecords[0]?.payTo,
  };

  const customerList = validatePhaseBCustomerListResponse({
    generatedAt,
    generatedFrom,
    customers: grouped.map(({ payerWallet, records }, index) => ({
      address: payerWallet,
      label: index === 0 ? "Observed CoinGecko payer" : null,
      observationCount: records.length,
      spendAtomic: sumAmounts(records),
      providerCount: uniqueEndpointCount(records),
      lastSeenAt: records[0]?.timestamp,
      activityGrowth: Number((0.12 + index * 0.04).toFixed(2)),
      upsellOpportunity: records.length > 1 ? "high" : "medium",
      provenance: "derived_insight",
      provenanceByField: {
        address: "onchain_fact",
        observationCount: "onchain_fact",
        spendAtomic: "onchain_fact",
        providerCount: "demo_label",
        activityGrowth: "future_sdk_field",
        upsellOpportunity: "derived_insight",
      },
      evidence: [onchainReason],
      reasons: [onchainReason, demoReason],
    })),
    customerCount: grouped.length,
    scope,
    provenance: "derived_insight",
    reasons: [onchainReason, demoReason],
  });

  const profilesByAddress = Object.fromEntries(
    grouped.map(({ payerWallet, records }, index) => {
      const first = records.at(-1) ?? records[0];
      const latest = records[0];
      const spendAtomic = sumAmounts(records);
      const profile = validatePhaseBCustomerProfileResponse({
        generatedAt,
        generatedFrom,
        scope,
        provenance: "derived_insight",
        reasons: [onchainReason, demoReason],
        profile: {
          identity: {
            address: payerWallet,
            label: index === 0 ? "Observed CoinGecko payer" : null,
            network: latest.network,
            asset: latest.asset,
            role: "payer",
            identityBasis: "txHash + payerWallet + payTo transfer facts",
            caveat: "Endpoint attribution is mock demo data until SDK telemetry is available.",
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              network: "onchain_fact",
              asset: "onchain_fact",
              role: "demo_label",
              identityBasis: "onchain_fact",
              caveat: "demo_label",
            },
            evidence: [onchainReason],
            reasons: [onchainReason, demoReason],
          },
          metrics: {
            spendAtomic,
            activityGrowth: Number((0.18 + index * 0.03).toFixed(2)),
            freeTierProgress: Math.min(1, records.length / 5),
            entryPointRatio: unique(records.map((record) => record.endpointPath)).length / 5,
            upsellOpportunity: records.length > 1 ? "high" : "medium",
            totalSpendAtomic: spendAtomic,
            txCount: records.length,
            uniqueProviderCount: uniqueEndpointCount(records),
            averageSpendAtomic: (BigInt(spendAtomic) / BigInt(records.length)).toString(),
            firstSeenAt: first.timestamp,
            lastSeenAt: latest.timestamp,
            provenance: "derived_insight",
            provenanceByField: {
              spendAtomic: "onchain_fact",
              txCount: "onchain_fact",
              uniqueProviderCount: "demo_label",
              averageSpendAtomic: "derived_insight",
              freeTierProgress: "future_sdk_field",
              entryPointRatio: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          },
          providers: byEndpoint(records).map((endpointRecords) => ({
            providerId: transactions.providerId,
            name: endpointRecords[0].endpointName,
            providerName: endpointRecords[0].endpointName,
            payToWallet: endpointRecords[0].payTo,
            spendAtomic: sumAmounts(endpointRecords),
            transactionCount: endpointRecords.length,
            txCount: endpointRecords.length,
            firstSeenAt: firstSeenAt(endpointRecords),
            lastSeenAt: lastSeenAt(endpointRecords),
            confidence: 0.8,
            provenance: "derived_insight",
            provenanceByField: {
              payToWallet: "onchain_fact",
              spendAtomic: "onchain_fact",
              transactionCount: "onchain_fact",
              name: "demo_label",
              providerName: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          })),
          timeline: records.slice(0, PROFILE_TIMELINE_LIMIT).map((record) => ({
            at: record.timestamp,
            eventType: "payment",
            description: `${record.workflowLabel}: ${record.requestMethod} ${record.endpointPath}`,
            amountAtomic: record.amount,
            relatedProviderId: transactions.providerId,
            provenance: "derived_insight",
            provenanceByField: {
              at: "onchain_fact",
              amountAtomic: "onchain_fact",
              description: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          })),
          insights: [
            {
              key: "mock-attribution-boundary",
              title: "Endpoint attribution remains demo-only",
              summary:
                "Onchain transfer facts are real, while endpoint and workflow labels are mock attribution.",
              confidence: 0.82,
              classification: "retention",
              provenance: "derived_insight",
              provenanceByField: { summary: "derived_insight" },
              reasons: [onchainReason, demoReason],
            },
          ],
          provenance: "derived_insight",
          provenanceByField: {
            identity: "onchain_fact",
            metrics: "derived_insight",
            providers: "demo_label",
            timeline: "derived_insight",
            insights: "derived_insight",
          },
          evidence: [onchainReason, demoReason],
          reasons: [onchainReason, demoReason],
        },
      });
      return [payerWallet, profile];
    }),
  );

  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse({
    generatedAt,
    scope,
    provenance: "derived_insight",
    reasons: [onchainReason, demoReason],
    graph: {
      generatedFrom,
      payerWalletLanguage: "real payer wallets that paid the observed CoinGecko x402 payTo",
      identityFieldsExcluded: ["endpointPath", "workflowLabel"],
      confidence: 0.79,
      provenance: "derived_insight",
      provenanceByField: {
        providerWallets: "onchain_fact",
        identityFieldsExcluded: "demo_label",
      },
      reasons: [onchainReason, demoReason],
      providerWallets: [
        {
          providerId: transactions.providerId,
          providerName: "CoinGecko x402",
          name: "CoinGecko x402",
          payToWallet: scope.payTo,
          confidence: 0.86,
          firstSeenAt: joinedRecords.at(-1)?.timestamp,
          lastSeenAt: joinedRecords[0]?.timestamp,
          provenance: "derived_insight",
          provenanceByField: {
            payToWallet: "onchain_fact",
            providerName: "demo_label",
            payerWallets: "onchain_fact",
          },
          reasons: [onchainReason, demoReason],
          payerWallets: grouped
            .slice(0, GRAPH_PAYER_WALLET_LIMIT)
            .map(({ payerWallet, records }) => ({
              address: payerWallet,
              label: payerWallet === grouped[0]?.payerWallet ? "Observed CoinGecko payer" : null,
              sharedSpendAtomic: sumAmounts(records),
              sharedTransactionCount: records.length,
              overlapProviderCount: unique(records.map((record) => record.endpointPath)).length,
              confidence: 0.8,
              firstSeenAt: records.at(-1)?.timestamp,
              lastSeenAt: records[0]?.timestamp,
              provenance: "derived_insight",
              provenanceByField: {
                address: "onchain_fact",
                sharedSpendAtomic: "onchain_fact",
                sharedTransactionCount: "onchain_fact",
                overlapProviderCount: "demo_label",
              },
              reasons: [onchainReason, demoReason],
              observations: byEndpoint(records).map((endpointRecords) => ({
                providerId: transactions.providerId,
                providerName: "CoinGecko x402",
                serviceName: endpointRecords[0].workflowLabel,
                sharedSpendAtomic: sumAmounts(endpointRecords),
                sharedTransactionCount: endpointRecords.length,
                overlapProviderCount: 1,
                confidence: 0.75,
                firstSeenAt: firstSeenAt(endpointRecords),
                lastSeenAt: lastSeenAt(endpointRecords),
                provenance: "derived_insight",
                provenanceByField: {
                  serviceName: "demo_label",
                  sharedSpendAtomic: "onchain_fact",
                },
                reasons: [onchainReason, demoReason],
              })),
              otherServiceCandidates: byEndpoint(records).map((endpointRecords) => ({
                providerId: transactions.providerId,
                providerName: "CoinGecko x402",
                serviceName: endpointRecords[0].endpointName,
                coUsageCount: endpointRecords.length,
                confidence: 0.65,
                payToWallet: endpointRecords[0].payTo,
                provenance: "future_sdk_field",
                provenanceByField: {
                  serviceName: "demo_label",
                  coUsageCount: "future_sdk_field",
                  payToWallet: "onchain_fact",
                },
                reasons: [demoReason],
              })),
            })),
        },
      ],
    },
  });

  return { customerList, profilesByAddress, walletUsageGraph, joinedRecords };
};

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

const generatedFromServiceAnalytics = "service-analytics-projection";
