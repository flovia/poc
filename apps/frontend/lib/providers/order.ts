import type { StoredProvider } from "@/lib/types";

const PINNED_PROVIDER_MARKS = ["coingecko", "nansen"] as const;

function pinnedProviderRank(provider: StoredProvider): number {
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return i;
  }
  return PINNED_PROVIDER_MARKS.length;
}

export function orderProvidersPinnedFirst<T extends StoredProvider>(providers: T[]): T[] {
  return providers
    .map((provider, originalIndex) => ({ provider, originalIndex }))
    .sort((left, right) => {
      const leftRank = pinnedProviderRank(left.provider);
      const rightRank = pinnedProviderRank(right.provider);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.provider);
}
