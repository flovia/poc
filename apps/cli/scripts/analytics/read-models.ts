import path from "node:path";
import {
  type CustomerIntelligenceResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";
import { writeAtomically } from "./io";
import { createAnalyticsStore } from "./store";

export type GenerateServiceReadModelsOptions = {
  analyticsDbPath?: string;
  outputPath?: string;
  generatedAt?: string;
  aggregateRunIds?: number[];
  customerRunIds?: number[];
};

const DEFAULT_OUTPUT = path.join(process.cwd(), "reports", "service-read-models", "analytics.json");

const reason = {
  provenance: "derived_insight" as const,
  label: "offline analytics data store",
  description: "Generated from local SQLite analytics store; no BFF request-path external calls.",
};

const sumAtomic = (values: string[]) =>
  values.reduce((sum, value) => sum + BigInt(value), 0n).toString();

const latestTimestamp = (items: Array<string | undefined>) =>
  items.filter((item) => item !== undefined).sort((left, right) => right.localeCompare(left))[0];

const firstTimestamp = (items: Array<string | undefined>) =>
  items.filter((item) => item !== undefined).sort((left, right) => left.localeCompare(right))[0];

const serviceName = (service: CustomerIntelligenceResponse["x402Services"][number]) =>
  service.serviceName ?? service.providerName ?? service.resource ?? service.payTo;

type ServiceAnalyticsRow = {
  service_key: string;
  service_name: string;
  sink_key: string;
  endpoint_attribution_status: string;
  confidence: number;
  resource_count: number;
  transaction_count: number;
  unique_sender_count: number;
};

const serviceIdForKey = (serviceKey: string) =>
  serviceKey.toLowerCase().includes("coingecko") ? "coingecko" : serviceKey.toLowerCase();

const topEndpointsForService = (serviceRows: ServiceAnalyticsRow[], limit: number) => {
  const rowsByIdentity = new Map<string, ServiceAnalyticsRow>();
  for (const row of serviceRows) {
    const key = `${serviceIdForKey(row.service_key)}:${row.service_name}`;
    const existing = rowsByIdentity.get(key);
    if (!existing) {
      rowsByIdentity.set(key, row);
      continue;
    }
    rowsByIdentity.set(key, {
      ...existing,
      endpoint_attribution_status:
        existing.endpoint_attribution_status === row.endpoint_attribution_status
          ? existing.endpoint_attribution_status
          : "bundled_payto_unknown_endpoint",
      confidence: Math.min(existing.confidence, row.confidence),
      resource_count: existing.resource_count + row.resource_count,
      transaction_count: existing.transaction_count + row.transaction_count,
      unique_sender_count: existing.unique_sender_count + row.unique_sender_count,
    });
  }

  return [...rowsByIdentity.values()]
    .sort((left, right) => right.transaction_count - left.transaction_count)
    .slice(0, limit)
    .map((row) => {
      const isBundled = row.endpoint_attribution_status === "bundled_payto_unknown_endpoint";
      return {
        endpointPath: row.service_name,
        endpointName: isBundled ? `${row.service_name} inferred cluster` : row.service_name,
        transactionCount: row.transaction_count,
        userCount: row.unique_sender_count,
        endpointAttributionStatus: row.endpoint_attribution_status,
        attributionConfidence: row.confidence,
        provenance: "derived_insight" as const,
        provenanceByField: {
          transactionCount: "onchain_fact" as const,
          userCount: "onchain_fact" as const,
        },
        reasons: [reason],
      };
    });
};

const loadCustomerIntelligenceSnapshots = (
  store: ReturnType<typeof createAnalyticsStore>,
  customerRunIds?: number[],
): CustomerIntelligenceResponse[] => {
  const runFilter = customerRunIds
    ? customerRunIds.length
      ? `WHERE source_run_id IN (${customerRunIds.map(() => "?").join(", ")})`
      : "WHERE 0"
    : "";
  const runParameters = customerRunIds ?? [];
  const rows = store.db
    .prepare(
      `SELECT wallet_address, payload_json
       FROM customer_intelligence_snapshots
       ${runFilter}
       ORDER BY generated_at DESC`,
    )
    .all(...runParameters) as Array<{ wallet_address: string; payload_json: string }>;
  const latestByAddress = new Map<string, CustomerIntelligenceResponse>();
  for (const row of rows) {
    const key = row.wallet_address.toLowerCase();
    if (!latestByAddress.has(key)) {
      latestByAddress.set(key, JSON.parse(row.payload_json) as CustomerIntelligenceResponse);
    }
  }
  return [...latestByAddress.values()];
};

const buildCustomerReadModels = (
  customers: CustomerIntelligenceResponse[],
  generatedAt: string,
  generatedFrom: string,
) => {
  const customerList = validatePhaseBCustomerListResponse({
    generatedAt,
    generatedFrom,
    customers: customers.map((customer) => {
      const observationCount = customer.payToActivities.reduce(
        (sum, activity) => sum + activity.transactionCount,
        0,
      );
      const spendAtomic = sumAtomic(
        customer.payToActivities.map((activity) => activity.totalAmountAtomic),
      );
      const providerCount = new Set(customer.x402Services.map((service) => service.payTo)).size;
      return {
        address: customer.customerAddress,
        label: null,
        observationCount,
        spendAtomic,
        providerCount,
        lastSeenAt: latestTimestamp(
          customer.payToActivities.map((activity) => activity.latestTimestamp),
        ),
        activityGrowth: 0,
        upsellOpportunity:
          providerCount > 1 || observationCount > 5
            ? "high"
            : observationCount > 0
              ? "medium"
              : "low",
        provenance: "derived_insight",
        provenanceByField: {
          address: "onchain_fact",
          observationCount: "onchain_fact",
          spendAtomic: "onchain_fact",
          providerCount: "derived_insight",
          upsellOpportunity: "derived_insight",
        },
        reasons: [reason],
      };
    }),
    customerCount: customers.length,
    provenance: "derived_insight",
    reasons: [reason],
  });

  const profilesByAddress = Object.fromEntries(
    customers.map((customer) => {
      const timestamps = customer.payToActivities.map((activity) => activity.latestTimestamp);
      const spendAtomic = sumAtomic(
        customer.payToActivities.map((activity) => activity.totalAmountAtomic),
      );
      const txCount = customer.payToActivities.reduce(
        (sum, activity) => sum + activity.transactionCount,
        0,
      );
      const providers = customer.x402Services.map((service) => ({
        providerId: service.candidateId,
        name: serviceName(service),
        providerName: service.providerName ?? service.serviceName ?? undefined,
        payToWallet: service.payTo,
        spendAtomic: service.totalAmountAtomic,
        transactionCount: service.transactionCount,
        txCount: service.transactionCount,
        firstSeenAt: firstTimestamp(
          customer.payToActivities
            .filter((activity) => activity.payTo === service.payTo)
            .map((activity) => activity.latestTimestamp),
        ),
        lastSeenAt: latestTimestamp(
          customer.payToActivities
            .filter((activity) => activity.payTo === service.payTo)
            .map((activity) => activity.latestTimestamp),
        ),
        confidence: service.confidence,
        provenance: "derived_insight" as const,
        provenanceByField: {
          payToWallet: "onchain_fact" as const,
          spendAtomic: "onchain_fact" as const,
          transactionCount: "onchain_fact" as const,
          name: "derived_insight" as const,
        },
        reasons: service.reasons,
      }));
      const profile = validatePhaseBCustomerProfileResponse({
        generatedAt,
        generatedFrom,
        scope: {
          providerId: "x402",
          network: customer.scope.network,
          asset: customer.scope.asset,
        },
        profile: {
          identity: {
            address: customer.customerAddress,
            label: null,
            network: customer.scope.network,
            asset: customer.scope.asset,
            role: "payer",
            identityBasis: "sampled x402 customer intelligence transfer facts",
            caveat:
              "Service attribution is derived from CDP payment options and sampled transfer facts.",
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              network: "onchain_fact",
              asset: "onchain_fact",
            },
            reasons: [reason],
          },
          metrics: {
            spendAtomic,
            activityGrowth: 0,
            freeTierProgress: Math.min(1, txCount / 10),
            entryPointRatio: Math.min(1, providers.length / 5),
            upsellOpportunity:
              providers.length > 1 || txCount > 5 ? "high" : txCount > 0 ? "medium" : "low",
            totalSpendAtomic: spendAtomic,
            txCount,
            uniqueProviderCount: providers.length,
            averageSpendAtomic:
              txCount === 0 ? "0" : (BigInt(spendAtomic) / BigInt(txCount)).toString(),
            firstSeenAt: firstTimestamp(timestamps),
            lastSeenAt: latestTimestamp(timestamps),
            provenance: "derived_insight",
            provenanceByField: {
              spendAtomic: "onchain_fact",
              txCount: "onchain_fact",
              uniqueProviderCount: "derived_insight",
            },
            reasons: [reason],
          },
          providers,
          timeline: customer.payToActivities.slice(0, 20).map((activity) => ({
            at: activity.latestTimestamp ?? customer.generatedAt,
            eventType: "payment",
            description: `Paid ${activity.transactionCount} x402 transaction(s) to ${activity.payTo}`,
            amountAtomic: activity.totalAmountAtomic,
            relatedProviderId: activity.payTo,
            provenance: "derived_insight" as const,
            provenanceByField: {
              at: "onchain_fact" as const,
              amountAtomic: "onchain_fact" as const,
              description: "derived_insight" as const,
            },
            reasons: [reason],
          })),
          insights: customer.insights.map((insight) => ({
            key: insight.key,
            title: insight.title,
            summary: insight.summary,
            confidence: insight.confidence,
            classification:
              insight.classification === "defi_activity" ? "upsell" : insight.classification,
            provenance: insight.provenance,
            provenanceByField: insight.provenanceByField,
            reasons: insight.reasons,
          })),
          provenance: "derived_insight",
          provenanceByField: {
            identity: "derived_insight",
            metrics: "derived_insight",
            providers: "derived_insight",
          },
          reasons: [reason],
        },
        provenance: "derived_insight",
        reasons: [reason],
      });
      return [customer.customerAddress.toLowerCase(), profile];
    }),
  );

  const servicesByPayTo = new Map<string, CustomerIntelligenceResponse["x402Services"]>();
  for (const customer of customers) {
    for (const service of customer.x402Services) {
      servicesByPayTo.set(service.payTo, [...(servicesByPayTo.get(service.payTo) ?? []), service]);
    }
  }
  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse({
    generatedAt,
    scope: {
      providerId: "x402",
      network: customers[0]?.scope.network,
      asset: customers[0]?.scope.asset,
    },
    provenance: "derived_insight",
    reasons: [reason],
    graph: {
      generatedFrom,
      payerWalletLanguage: "sampled wallets with x402 outgoing transfers",
      identityFieldsExcluded: ["ip", "userAgent", "sdkRequestId"],
      confidence: 0.75,
      provenance: "derived_insight",
      provenanceByField: { providerWallets: "derived_insight" },
      reasons: [reason],
      providerWallets: [...servicesByPayTo.entries()].map(([payTo, services]) => {
        const representative = services[0];
        const payerWallets = customers
          .filter((customer) => customer.x402Services.some((service) => service.payTo === payTo))
          .map((customer) => {
            const customerServices = customer.x402Services.filter(
              (service) => service.payTo === payTo,
            );
            const activities = customer.payToActivities.filter(
              (activity) => activity.payTo === payTo,
            );
            const activityTxCount = activities.reduce(
              (sum, activity) => sum + activity.transactionCount,
              0,
            );
            const spend = sumAtomic(activities.map((activity) => activity.totalAmountAtomic));
            return {
              address: customer.customerAddress,
              label: null,
              sharedSpendAtomic: spend,
              sharedTransactionCount: activityTxCount,
              overlapProviderCount: customer.x402Services.length,
              confidence: representative?.confidence ?? 0.5,
              firstSeenAt:
                firstTimestamp(activities.map((activity) => activity.latestTimestamp)) ??
                customer.generatedAt,
              lastSeenAt:
                latestTimestamp(activities.map((activity) => activity.latestTimestamp)) ??
                customer.generatedAt,
              observations: customerServices.slice(0, 5).map((service) => ({
                providerId: service.candidateId,
                providerName: service.providerName ?? service.serviceName ?? service.payTo,
                serviceName: serviceName(service),
                sharedSpendAtomic: service.totalAmountAtomic,
                sharedTransactionCount: service.transactionCount,
                overlapProviderCount: 1,
                confidence: service.confidence,
                firstSeenAt:
                  firstTimestamp(activities.map((activity) => activity.latestTimestamp)) ??
                  customer.generatedAt,
                lastSeenAt:
                  latestTimestamp(activities.map((activity) => activity.latestTimestamp)) ??
                  customer.generatedAt,
                provenance: "derived_insight" as const,
                provenanceByField: {
                  serviceName: "derived_insight" as const,
                  sharedSpendAtomic: "onchain_fact" as const,
                },
                reasons: service.reasons,
              })),
              otherServiceCandidates: customer.x402Services
                .filter((service) => service.payTo !== payTo)
                .slice(0, 5)
                .map((service) => ({
                  providerId: service.candidateId,
                  providerName: service.providerName ?? service.serviceName ?? service.payTo,
                  serviceName: serviceName(service),
                  coUsageCount: service.transactionCount,
                  confidence: service.confidence,
                  payToWallet: service.payTo,
                  provenance: "derived_insight" as const,
                  provenanceByField: {
                    serviceName: "derived_insight" as const,
                    coUsageCount: "onchain_fact" as const,
                  },
                  reasons: service.reasons,
                })),
              provenance: "derived_insight" as const,
              provenanceByField: {
                address: "onchain_fact" as const,
                sharedSpendAtomic: "onchain_fact" as const,
              },
              reasons: [reason],
            };
          });
        return {
          providerId: representative?.candidateId ?? payTo,
          providerName: representative ? serviceName(representative) : payTo,
          name: representative ? serviceName(representative) : payTo,
          payToWallet: payTo,
          payerWallets,
          confidence: representative?.confidence ?? 0.5,
          firstSeenAt: firstTimestamp(payerWallets.map((wallet) => wallet.firstSeenAt)),
          lastSeenAt: latestTimestamp(payerWallets.map((wallet) => wallet.lastSeenAt)),
          provenance: "derived_insight" as const,
          provenanceByField: {
            payToWallet: "onchain_fact" as const,
            payerWallets: "derived_insight" as const,
          },
          reasons: [reason],
        };
      }),
    },
  });

  const intelligenceByAddress = Object.fromEntries(
    customers.map((customer) => [customer.customerAddress.toLowerCase(), customer]),
  );

  return { customerList, profilesByAddress, walletUsageGraph, intelligenceByAddress };
};

export const generateServiceAnalyticsReadModels = (
  options: GenerateServiceReadModelsOptions = {},
) => {
  const store = createAnalyticsStore({ path: options.analyticsDbPath });
  store.initialize();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedFrom = "analytics-data-store:service-read-model-generation";
  const aggregateRunIds = options.aggregateRunIds ?? [];
  const aggregateRunFilter = aggregateRunIds.length
    ? `AND pa.source_run_id IN (${aggregateRunIds.map(() => "?").join(", ")})`
    : "";
  const aggregateRowFilter = aggregateRunIds.length ? "WHERE pa.source_run_id IS NOT NULL" : "";
  const rows = store.db
    .prepare(
      `WITH canonical_service_candidates AS (
         SELECT
           sink_key,
           service_key,
           COALESCE(MAX(service), MAX(provider), MAX(domain), service_key) AS service_name,
           COUNT(DISTINCT resource_id) AS resource_count
         FROM service_candidates
         GROUP BY sink_key, service_key
       )
       SELECT
         COALESCE(sc.service_key, ea.pay_to) AS service_key,
         COALESCE(sc.service_name, ea.pay_to) AS service_name,
         ea.sink_key,
         ea.endpoint_attribution_status,
         ea.confidence,
         COALESCE(sc.resource_count, ea.resource_count) AS resource_count,
         COALESCE(pa.transaction_count, 0) AS transaction_count,
         COALESCE(pa.unique_sender_count, 0) AS unique_sender_count
       FROM endpoint_attribution ea
       LEFT JOIN canonical_service_candidates sc ON sc.sink_key = ea.sink_key
       LEFT JOIN payto_aggregates pa ON pa.sink_key = ea.sink_key ${aggregateRunFilter}
       ${aggregateRowFilter}
       ORDER BY transaction_count DESC`,
    )
    .all(...aggregateRunIds) as ServiceAnalyticsRow[];

  const servicesById = new Map<string, ServiceAnalyticsRow[]>();
  for (const row of rows) {
    const serviceId = serviceIdForKey(row.service_key);
    servicesById.set(serviceId, [...(servicesById.get(serviceId) ?? []), row]);
  }
  if (!servicesById.has("coingecko")) servicesById.set("coingecko", []);

  const services = [...servicesById.entries()]
    .map(([serviceId, serviceRows]) => {
      const transactionCount = serviceRows.reduce((sum, row) => sum + row.transaction_count, 0);
      const userCount = serviceRows.reduce((sum, row) => sum + row.unique_sender_count, 0);
      const endpointDiversity = serviceRows.reduce((sum, row) => sum + row.resource_count, 0);
      const representative = serviceRows[0];
      return {
        serviceId,
        serviceName:
          serviceId === "coingecko"
            ? "CoinGecko x402"
            : (representative?.service_name ?? serviceId),
        userCount,
        transactionCount,
        repeatUserRate: userCount > 0 && transactionCount > userCount ? 1 : 0,
        averageTransactionsPerUser: userCount === 0 ? 0 : transactionCount / userCount,
        endpointDiversity,
        userOverlapWithCoinGecko: serviceId === "coingecko" ? userCount : 0,
        sampleBasis: "analytics data store aggregate census and sampled facts",
        coverage: "offline analytics SQLite read model",
        endpointAttributionStatus:
          representative?.endpoint_attribution_status ?? "unresolved_payto",
        attributionConfidence: representative?.confidence ?? 0,
        provenance: "derived_insight" as const,
        provenanceByField: {
          userCount: "onchain_fact" as const,
          transactionCount: "onchain_fact" as const,
          endpointDiversity: "derived_insight" as const,
          sampleBasis: "derived_insight" as const,
        },
        reasons: [reason],
      };
    })
    .sort((left, right) => {
      if (left.serviceId === "coingecko") return -1;
      if (right.serviceId === "coingecko") return 1;
      return right.transactionCount - left.transactionCount;
    });

  const comparison = validateServiceAnalyticsComparisonResponse({
    generatedAt,
    generatedFrom,
    services,
    provenance: "derived_insight",
    provenanceByField: { services: "derived_insight" },
    reasons: [reason],
  });
  const coingecko =
    comparison.services.find((service) => service.serviceId === "coingecko") ??
    comparison.services[0];
  const totalTransactions = comparison.services.reduce(
    (sum, service) => sum + service.transactionCount,
    0,
  );
  const totalUsers = comparison.services.reduce((sum, service) => sum + service.userCount, 0);
  const peerServices = comparison.services.filter(
    (service) => service.serviceId !== coingecko.serviceId,
  );
  const peerAverageTransactionsPerUser = peerServices.length
    ? peerServices.reduce((sum, service) => sum + service.averageTransactionsPerUser, 0) /
      peerServices.length
    : 0;
  const summary = validateServiceAnalyticsSummaryResponse({
    generatedAt,
    generatedFrom,
    serviceId: "coingecko",
    userCount: coingecko.userCount,
    transactionCount: coingecko.transactionCount,
    averageTransactionsPerUser: coingecko.averageTransactionsPerUser,
    repeatUserRate: coingecko.repeatUserRate,
    topEndpoints: topEndpointsForService(servicesById.get("coingecko") ?? [], 5),
    comparedToX402: {
      userShare: totalUsers === 0 ? 0 : coingecko.userCount / totalUsers,
      transactionShare:
        totalTransactions === 0 ? 0 : coingecko.transactionCount / totalTransactions,
      activityIndex:
        peerAverageTransactionsPerUser === 0
          ? coingecko.averageTransactionsPerUser
          : coingecko.averageTransactionsPerUser / peerAverageTransactionsPerUser,
      sampleBasis: "analytics data store aggregate census and sampled facts",
      availableServiceCount: comparison.services.length,
    },
    provenance: "derived_insight",
    provenanceByField: { transactionCount: "onchain_fact", topEndpoints: "derived_insight" },
    reasons: [reason],
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
      coverage: service.coverage,
      endpointAttributionStatus: service.endpointAttributionStatus,
      attributionConfidence: service.attributionConfidence,
      isCoinGecko: service.serviceId === "coingecko",
      provenance: "derived_insight",
      provenanceByField: { x: "derived_insight", y: "derived_insight" },
      reasons: [reason],
    })),
    provenance: "derived_insight",
    provenanceByField: { points: "derived_insight" },
    reasons: [reason],
  });

  const customerReadModels = buildCustomerReadModels(
    loadCustomerIntelligenceSnapshots(store, options.customerRunIds),
    generatedAt,
    generatedFrom,
  );

  const output = {
    serviceSummary: summary,
    serviceComparison: comparison,
    serviceQuadrants: quadrants,
    customers: customerReadModels.customerList,
    walletUsageGraph: customerReadModels.walletUsageGraph,
    profilesByAddress: customerReadModels.profilesByAddress,
    intelligenceByAddress: customerReadModels.intelligenceByAddress,
  };
  const runId = store.beginCaptureRun({
    kind: "read_model_generation",
    parameters: { outputPath: options.outputPath ?? DEFAULT_OUTPUT },
  });
  try {
    store.persistGeneratedReadModel({
      modelKind: "service_summary",
      modelKey: "coingecko",
      payload: summary,
      sourceRunId: runId,
    });
    store.persistGeneratedReadModel({
      modelKind: "service_comparison",
      modelKey: "default",
      payload: comparison,
      sourceRunId: runId,
    });
    store.persistGeneratedReadModel({
      modelKind: "service_quadrants",
      modelKey: "default",
      payload: quadrants,
      sourceRunId: runId,
    });
    store.persistGeneratedReadModel({
      modelKind: "customer_list",
      modelKey: "default",
      payload: customerReadModels.customerList,
      sourceRunId: runId,
    });
    store.persistGeneratedReadModel({
      modelKind: "wallet_usage_graph",
      modelKey: "default",
      payload: customerReadModels.walletUsageGraph,
      sourceRunId: runId,
    });
    writeAtomically(options.outputPath ?? DEFAULT_OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
    store.completeCaptureRun(runId, { sqlite: "available", readModels: Object.keys(output) });
    return { ...output, outputPath: options.outputPath ?? DEFAULT_OUTPUT, analyticsRunId: runId };
  } catch (error) {
    store.failCaptureRun(runId, error, { sqlite: "partial_or_failed" });
    throw error;
  } finally {
    store.close();
  }
};

if (import.meta.main) {
  const outputPath = Bun.argv.includes("--out")
    ? Bun.argv[Bun.argv.indexOf("--out") + 1]
    : undefined;
  const analyticsDbPath = Bun.argv.includes("--analytics-db")
    ? Bun.argv[Bun.argv.indexOf("--analytics-db") + 1]
    : undefined;
  console.log(JSON.stringify(generateServiceAnalyticsReadModels({ outputPath, analyticsDbPath })));
}
