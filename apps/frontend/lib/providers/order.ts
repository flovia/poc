import type { StoredProvider } from "@/lib/types";

// Display priority groups (lower rank = shown first):
//   0: MPP-registry rows  (catalogSource === "mpp_registry")
//   1: Nansen             (string match in identity)
//   2: CoinGecko          (string match in identity)
//   3: everything else    (preserves the upstream order)
const PINNED_PROVIDER_MARKS = ["nansen", "coingecko"] as const;
const MPP_RANK = 0;
const PINNED_BASE_RANK = 1;
const DEFAULT_RANK = PINNED_BASE_RANK + PINNED_PROVIDER_MARKS.length;

function pinnedProviderRank(provider: StoredProvider): number {
  // Aggregated cards (brand-key dedup) carry every contributing catalog source
  // in `catalogSources`. The winner row may be Pay.sh (so URLs stay stable),
  // but the card still represents an MPP-listed brand and should be ranked
  // accordingly. Fall back to the single `catalogSource` for non-aggregated
  // rows.
  const aggregated = provider.catalogSources ?? [];
  const isMpp = aggregated.includes("mpp_registry") || provider.catalogSource === "mpp_registry";
  if (isMpp) return MPP_RANK;
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
