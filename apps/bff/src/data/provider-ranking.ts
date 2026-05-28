import type {
  ProviderCatalogResponse,
  ProviderRankingResponse,
  ProviderRankingSort,
} from "contracts";
import { validateProviderRankingResponse } from "contracts";

export const PROVIDER_RANKING_DEFAULT_LIMIT = 50;
export const PROVIDER_RANKING_MAX_LIMIT = 500;

export type ProviderRankingQuery = {
  sort: ProviderRankingSort;
  limit: number;
};

export const parseProviderRankingQuery = (params: URLSearchParams): ProviderRankingQuery => {
  const sort = params.get("sort") ?? "transactions";
  if (sort !== "transactions" && sort !== "settledAmount") {
    throw new Error("sort must be one of: transactions, settledAmount");
  }

  const rawLimit = params.get("limit");
  if (rawLimit === null) return { sort, limit: PROVIDER_RANKING_DEFAULT_LIMIT };

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("limit must be a positive integer");
  }

  return { sort, limit: Math.min(limit, PROVIDER_RANKING_MAX_LIMIT) };
};

const compareAtomicDescending = (left: string, right: string) => {
  const delta = BigInt(right) - BigInt(left);
  if (delta === 0n) return 0;
  return delta > 0n ? 1 : -1;
};

export const buildProviderRanking = (
  catalog: ProviderCatalogResponse,
  query: ProviderRankingQuery,
): ProviderRankingResponse => {
  const sorted = [...catalog.providers].sort((left, right) => {
    const metricDelta =
      query.sort === "settledAmount"
        ? compareAtomicDescending(left.totalVolumeAtomic, right.totalVolumeAtomic)
        : right.transactionCount - left.transactionCount;
    if (metricDelta !== 0) return metricDelta;

    const senderDelta = right.uniqueSenderCount - left.uniqueSenderCount;
    if (senderDelta !== 0) return senderDelta;

    return left.providerId.localeCompare(right.providerId);
  });
  const reason = {
    provenance: "derived_insight" as const,
    label: "observed provider ranking",
    description: "Derived from the currently loaded provider catalog snapshot.",
  };

  const providers = sorted.slice(0, query.limit).map((provider, index) => ({
    rank: index + 1,
    providerId: provider.providerId,
    name: provider.name,
    ...(provider.serviceId ? { serviceId: provider.serviceId } : {}),
    ...(provider.serviceName ? { serviceName: provider.serviceName } : {}),
    network: provider.network,
    asset: provider.asset,
    payTo: provider.payTo,
    transactionCount: provider.transactionCount,
    uniqueSenderCount: provider.uniqueSenderCount,
    totalVolumeAtomic: provider.totalVolumeAtomic,
    provenance: "derived_insight" as const,
    provenanceByField: {
      rank: "derived_insight" as const,
      transactionCount: "onchain_fact" as const,
      uniqueSenderCount: "onchain_fact" as const,
      totalVolumeAtomic: "onchain_fact" as const,
    },
    reasons: [reason],
  }));

  return validateProviderRankingResponse({
    generatedAt: catalog.generatedAt,
    generatedFrom: `${catalog.generatedFrom}:provider-ranking`,
    population: "observed_providers",
    sort: query.sort,
    limit: query.limit,
    providerCount: providers.length,
    totalProviderCount: catalog.providers.length,
    providers,
    provenance: "derived_insight",
    provenanceByField: { providers: "derived_insight" },
    reasons: [reason],
  });
};
