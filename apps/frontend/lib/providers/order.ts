import type { StoredProvider } from "@/lib/types";

// Display priority groups (lower rank = shown first):
//   0: MPP-registry rows  (catalogSource === "mpp_registry")
//   1: CoinGecko          (string match in identity)
//   2: Nansen             (string match in identity)
//   3: everything else    (preserves the upstream order)
const PINNED_PROVIDER_MARKS = ["coingecko", "nansen"] as const;
const MPP_RANK = 0;
const PINNED_BASE_RANK = 1;
const DEFAULT_RANK = PINNED_BASE_RANK + PINNED_PROVIDER_MARKS.length;

function pinnedProviderRank(provider: StoredProvider): number {
  if (provider.catalogSource === "mpp_registry") return MPP_RANK;
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return PINNED_BASE_RANK + i;
  }
  return DEFAULT_RANK;
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
