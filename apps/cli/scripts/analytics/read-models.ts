import path from "node:path";
import {
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
} from "contracts";
import { writeAtomically } from "./io";
import { createAnalyticsStore } from "./store";

export type GenerateServiceReadModelsOptions = {
  analyticsDbPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

const DEFAULT_OUTPUT = path.join(process.cwd(), "reports", "service-read-models", "analytics.json");

const reason = {
  provenance: "derived_insight" as const,
  label: "offline analytics data store",
  description: "Generated from local SQLite analytics store; no BFF request-path external calls.",
};

export const generateServiceAnalyticsReadModels = (
  options: GenerateServiceReadModelsOptions = {},
) => {
  const store = createAnalyticsStore({ path: options.analyticsDbPath });
  store.initialize();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedFrom = "analytics-data-store:service-read-model-generation";
  const rows = store.db
    .prepare(
      `SELECT
         COALESCE(sc.service_key, ea.pay_to) AS service_key,
         COALESCE(sc.service, sc.provider, sc.domain, ea.pay_to) AS service_name,
         ea.endpoint_attribution_status,
         ea.confidence,
         ea.resource_count,
         COALESCE(pa.transaction_count, 0) AS transaction_count,
         COALESCE(pa.unique_sender_count, 0) AS unique_sender_count
       FROM endpoint_attribution ea
       LEFT JOIN service_candidates sc ON sc.sink_key = ea.sink_key
       LEFT JOIN payto_aggregates pa ON pa.sink_key = ea.sink_key
       ORDER BY transaction_count DESC`,
    )
    .all() as Array<{
    service_key: string;
    service_name: string;
    endpoint_attribution_status: string;
    confidence: number;
    resource_count: number;
    transaction_count: number;
    unique_sender_count: number;
  }>;

  const servicesById = new Map<string, (typeof rows)[number][]>();
  for (const row of rows) {
    const serviceId = row.service_key.toLowerCase().includes("coingecko")
      ? "coingecko"
      : row.service_key.toLowerCase();
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
    .sort((left, right) =>
      left.serviceId === "coingecko" ? -1 : right.transactionCount - left.transactionCount,
    );

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
  const summary = validateServiceAnalyticsSummaryResponse({
    generatedAt,
    generatedFrom,
    serviceId: "coingecko",
    userCount: coingecko.userCount,
    transactionCount: coingecko.transactionCount,
    averageTransactionsPerUser: coingecko.averageTransactionsPerUser,
    repeatUserRate: coingecko.repeatUserRate,
    topEndpoints: rows.slice(0, 5).map((row) => ({
      endpointPath: row.service_name,
      endpointName: row.service_name,
      transactionCount: row.transaction_count,
      userCount: row.unique_sender_count,
      endpointAttributionStatus: row.endpoint_attribution_status,
      attributionConfidence: row.confidence,
      provenance: "derived_insight",
      provenanceByField: { transactionCount: "onchain_fact", userCount: "onchain_fact" },
      reasons: [reason],
    })),
    comparedToX402: {
      userShare: 1,
      transactionShare:
        totalTransactions === 0 ? 0 : coingecko.transactionCount / totalTransactions,
      activityIndex: coingecko.averageTransactionsPerUser,
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

  const output = {
    serviceSummary: summary,
    serviceComparison: comparison,
    serviceQuadrants: quadrants,
  };
  const runId = store.beginCaptureRun({
    kind: "read_model_generation",
    parameters: { outputPath: options.outputPath ?? DEFAULT_OUTPUT },
  });
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
  store.completeCaptureRun(runId, { sqlite: "available", readModels: Object.keys(output) });
  writeAtomically(options.outputPath ?? DEFAULT_OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  store.close();
  return { ...output, outputPath: options.outputPath ?? DEFAULT_OUTPUT, analyticsRunId: runId };
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
