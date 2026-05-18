import path from "node:path";
import {
  type CustomerIntelligenceResponse,
  validateProviderCatalogResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";
import { writeAtomically } from "./io";
import {
  firstTimestamp,
  latestTimestamp,
  serviceIdForKey,
  slug,
  sumAtomic,
} from "./read-model-builders";
import { createAnalyticsStore } from "./store";
import {
  listLatestCustomerIntelligenceSnapshots,
  listServiceAnalyticsRows,
  type ServiceAnalyticsRow,
} from "./store/read-model-repo";

export type GenerateServiceReadModelsOptions = {
  analyticsDbPath?: string;
  outputPath?: string;
  generatedAt?: string;
  aggregateRunIds?: number[];
  customerRunIds?: number[];
  logger?: (message: string) => void;
};

const DEFAULT_OUTPUT = path.join(process.cwd(), "reports", "service-read-models", "analytics.json");

const reason = {
  provenance: "derived_insight" as const,
  label: "offline analytics data store",
  description: "Generated from local SQLite analytics store; no BFF request-path external calls.",
};

const serviceName = (service: CustomerIntelligenceResponse["x402Services"][number]) =>
  service.serviceName ?? service.providerName ?? service.resource ?? service.payTo;

// Caps reported growth so a single new wallet with one earlier tx and a burst
// of recent activity does not pin the UI rendering at extreme values.
const ACTIVITY_GROWTH_MAX = 5;

// Approximates per-wallet activity growth from on-chain transfer timestamps.
// Splits the wallet's own observation span into two equal halves at its
// midpoint and compares recent-half vs earlier-half transaction counts.
// By construction the earliest timestamp lands in the earlier half and the
// latest lands in the recent half, so both counts are >= 1 whenever the span
// can be split. Returns 0 when the span cannot be split (fewer than two
// observations, all timestamps identical, or all timestamps invalid).
export const computeActivityGrowth = (timestamps: string[]): number => {
  const epochs = timestamps
    .map((value) => Date.parse(value))
    .filter((value): value is number => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (epochs.length < 2) return 0;
  const first = epochs[0];
  const last = epochs[epochs.length - 1];
  if (last === first) return 0;
  const midpoint = first + (last - first) / 2;
  let earlier = 0;
  let recent = 0;
  for (const epoch of epochs) {
    if (epoch < midpoint) earlier += 1;
    else recent += 1;
  }
  const ratio = (recent - earlier) / earlier;
  const capped = Math.min(ACTIVITY_GROWTH_MAX, ratio);
  return Number(capped.toFixed(2));
};

const providerIdFor = (input: {
  serviceId?: string;
  payTo: string;
  network: string;
  asset: string;
}) =>
  `${slug(input.serviceId ?? input.payTo)}--${slug(input.network)}--${slug(input.asset)}--${input.payTo.toLowerCase()}`;

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

// Constrain transfer-fact lookups to the same (network, asset, timeWindow) the
// customer snapshot was generated under. Without this scoping, transfers from
// older runs or unrelated assets would leak into the wallet's growth signal.
const buildActivityGrowthByAddress = (
  store: ReturnType<typeof createAnalyticsStore>,
  customers: CustomerIntelligenceResponse[],
): Map<string, number> => {
  const growth = new Map<string, number>();
  if (customers.length === 0) return growth;

  type ScopeBucket = {
    network: string;
    asset: string;
    from: string;
    to: string;
    addresses: string[];
  };
  const buckets = new Map<string, ScopeBucket>();
  for (const customer of customers) {
    const { network, asset, timeWindow } = customer.scope;
    const key = [network, asset, timeWindow.from, timeWindow.to].join("|");
    const bucket = buckets.get(key) ?? {
      network,
      asset,
      from: timeWindow.from,
      to: timeWindow.to,
      addresses: [],
    };
    bucket.addresses.push(customer.customerAddress);
    buckets.set(key, bucket);
  }

  const timestampsByAddress = new Map<string, string[]>();
  for (const bucket of buckets.values()) {
    const facts = store.listCustomerOutgoingTransferFacts({
      network: bucket.network,
      asset: bucket.asset,
      payerWallets: bucket.addresses,
      timeWindow: { from: bucket.from, to: bucket.to },
    });
    for (const fact of facts) {
      const key = fact.customerAddress.toLowerCase();
      const list = timestampsByAddress.get(key) ?? [];
      list.push(fact.timestamp);
      timestampsByAddress.set(key, list);
    }
  }

  for (const customer of customers) {
    const key = customer.customerAddress.toLowerCase();
    growth.set(key, computeActivityGrowth(timestampsByAddress.get(key) ?? []));
  }
  return growth;
};

const buildCustomerReadModels = (
  customers: CustomerIntelligenceResponse[],
  generatedAt: string,
  generatedFrom: string,
  growthByAddress: Map<string, number> = new Map(),
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
      const activityGrowth = growthByAddress.get(customer.customerAddress.toLowerCase()) ?? 0;
      return {
        address: customer.customerAddress,
        label: null,
        observationCount,
        spendAtomic,
        providerCount,
        lastSeenAt: latestTimestamp(
          customer.payToActivities.map((activity) => activity.latestTimestamp),
        ),
        activityGrowth,
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
          activityGrowth: "derived_insight",
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
            activityGrowth: growthByAddress.get(customer.customerAddress.toLowerCase()) ?? 0,
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
              activityGrowth: "derived_insight",
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
  const log = options.logger ?? (() => undefined);
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT;
  log(`[analytics:read-models] start db=${options.analyticsDbPath ?? "default"} out=${outputPath}`);
  const store = createAnalyticsStore({ path: options.analyticsDbPath });
  store.initialize();
  log("[analytics:read-models] analytics store initialized");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedFrom = "analytics-data-store:service-read-model-generation";
  const rows = listServiceAnalyticsRows(store.db, options.aggregateRunIds ?? []);
  log(`[analytics:read-models] loaded ${rows.length} service analytics row(s)`);

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

  const customerSnapshots = listLatestCustomerIntelligenceSnapshots(store.db, options.customerRunIds);
  const growthByAddress = buildActivityGrowthByAddress(store, customerSnapshots);
  const customerReadModels = buildCustomerReadModels(
    customerSnapshots,
    generatedAt,
    generatedFrom,
    growthByAddress,
  );
  log(
    `[analytics:read-models] built ${customerReadModels.customerList.customerCount} customer row(s)`,
  );

  log("[analytics:read-models] loading provider/payTo rows");
  const providerRows = store.listPayToCensusRows();
  log(`[analytics:read-models] loaded ${providerRows.length} provider/payTo row(s)`);
  const providers = validateProviderCatalogResponse({
    generatedAt,
    generatedFrom,
    providers: providerRows.map((row) => ({
      providerId: providerIdFor({
        serviceId: row.serviceId,
        payTo: row.payTo,
        network: row.network,
        asset: row.asset,
      }),
      name: row.serviceName ?? row.serviceId ?? row.payTo,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      network: row.network,
      asset: row.asset,
      payTo: row.payTo,
      transactionCount: row.transactionCount,
      uniqueSenderCount: row.uniqueSenderCount,
      totalVolumeAtomic: row.totalVolumeAtomic,
      endpointCount: row.endpointCount,
      resourceCount: row.resourceCount,
      mappingPattern: row.mappingPattern,
      endpointAttributionStatus: row.endpointAttributionStatus,
      attributionConfidence: row.attributionConfidence,
      hasCustomerFacts: row.hasCustomerFacts,
      customerFactCount: row.customerFactCount,
      provenance: "derived_insight" as const,
      provenanceByField: {
        payTo: "onchain_fact" as const,
        transactionCount: "onchain_fact" as const,
        uniqueSenderCount: "onchain_fact" as const,
        name: "derived_insight" as const,
      },
      reasons: [reason],
    })),
    providerCount: providerRows.length,
    provenance: "derived_insight" as const,
    provenanceByField: { providers: "derived_insight" as const },
    reasons: [reason],
  });

  const output = {
    providers,
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
    parameters: { outputPath },
  });
  log(`[analytics:read-models] persisting generated read models run=${runId}`);
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
    store.persistGeneratedReadModel({
      modelKind: "provider_catalog",
      modelKey: "default",
      payload: providers,
      sourceRunId: runId,
    });
    writeAtomically(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    store.completeCaptureRun(runId, { sqlite: "available", readModels: Object.keys(output) });
    log(
      `[analytics:read-models] wrote ${outputPath} providers=${providers.providerCount} customers=${customerReadModels.customerList.customerCount}`,
    );
    return { ...output, outputPath, analyticsRunId: runId };
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
  const result = generateServiceAnalyticsReadModels({
    outputPath,
    analyticsDbPath,
    logger: (message) => console.error(message),
  });
  console.log(
    JSON.stringify({
      outputPath: result.outputPath,
      analyticsRunId: result.analyticsRunId,
      providers: result.providers.providerCount,
      customers: result.customers.customerCount,
      services: result.serviceComparison.services.length,
    }),
  );
}
