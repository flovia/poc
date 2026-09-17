import type { ProviderCatalogItemDto } from "./api/types";

export type ProviderRankingSort = "transactions" | "settledAmount";

export type ProviderRankingRow = Pick<
  ProviderCatalogItemDto,
  | "asset"
  | "name"
  | "network"
  | "payTo"
  | "providerId"
  | "serviceId"
  | "serviceName"
  | "totalVolumeAtomic"
  | "transactionCount"
  | "uniqueSenderCount"
> & {
  rank: number;
};

export type ProviderRanking = {
  population: "observed_providers";
  sort: ProviderRankingSort;
  providerCount: number;
  totalProviderCount: number;
  providers: ProviderRankingRow[];
};

const compareAtomicDescending = (left: string, right: string) => {
  const delta = BigInt(right) - BigInt(left);
  if (delta === 0n) return 0;
  return delta > 0n ? 1 : -1;
};

export function buildProviderRanking(
  providers: ProviderCatalogItemDto[],
  sort: ProviderRankingSort,
  limit = 50,
): ProviderRanking {
  const cappedLimit = Math.max(0, Math.floor(limit));
  const rankedProviders = [...providers].sort((left, right) => {
    const metricDelta =
      sort === "settledAmount"
        ? compareAtomicDescending(left.totalVolumeAtomic, right.totalVolumeAtomic)
        : right.transactionCount - left.transactionCount;
    if (metricDelta !== 0) return metricDelta;

    const senderDelta = right.uniqueSenderCount - left.uniqueSenderCount;
    if (senderDelta !== 0) return senderDelta;

    return left.providerId.localeCompare(right.providerId);
  });

  const rows = rankedProviders.slice(0, cappedLimit).map((provider, index) => ({
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
  }));

  return {
    population: "observed_providers",
    sort,
    providerCount: rows.length,
    totalProviderCount: providers.length,
    providers: rows,
  };
}
