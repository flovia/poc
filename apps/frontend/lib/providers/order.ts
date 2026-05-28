import type { StoredProvider } from "@/lib/types";

// Display priority groups (lower rank = shown first):
//   0: QuickNode          (current x402 data focus)
//   1: Nansen             (string match in identity)
//   2: CoinGecko          (string match in identity)
//   3: everything else    (sorted by observed usage)
const TOP_PROVIDER_MARK = "quicknode";
const PINNED_PROVIDER_MARKS = ["nansen", "coingecko"] as const;
const PINNED_BASE_RANK = 1;
const DEFAULT_RANK = PINNED_BASE_RANK + PINNED_PROVIDER_MARKS.length;

function pinnedProviderRank(provider: StoredProvider): number {
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  if (identity.includes(TOP_PROVIDER_MARK)) return 0;
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return PINNED_BASE_RANK + i;
  }
  return DEFAULT_RANK;
}

function usageRank(provider: StoredProvider): number {
  return provider.transactionCount ?? 0;
}

export function orderProvidersPinnedFirst<T extends StoredProvider>(providers: T[]): T[] {
  return providers
    .map((provider, originalIndex) => ({ provider, originalIndex }))
    .sort((left, right) => {
      const leftRank = pinnedProviderRank(left.provider);
      const rightRank = pinnedProviderRank(right.provider);
      if (leftRank !== rightRank) return leftRank - rightRank;
      if (leftRank === DEFAULT_RANK) {
        const usageDiff = usageRank(right.provider) - usageRank(left.provider);
        if (usageDiff !== 0) return usageDiff;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.provider);
}
