import type { StoredProvider } from "@/lib/types";

// Display priority groups (lower rank = shown first):
//   0: QuickNode          (current x402 data focus)
//   1: Nansen             (string match in identity)
//   2: CoinGecko          (string match in identity)
//   3: MPP-registry rows  (catalogSource === "mpp_registry")
//   4: everything else    (preserves the upstream order)
const TOP_PROVIDER_MARK = "quicknode";
const PINNED_PROVIDER_MARKS = ["nansen", "coingecko"] as const;
const PINNED_BASE_RANK = 1;
const MPP_RANK = PINNED_BASE_RANK + PINNED_PROVIDER_MARKS.length;
const DEFAULT_RANK = MPP_RANK + 1;

function pinnedProviderRank(provider: StoredProvider): number {
  // Aggregated cards (brand-key dedup) carry every contributing catalog source
  // in `catalogSources`. The winner row may be Pay.sh (so URLs stay stable),
  // but the card still represents an MPP-listed brand and should be ranked
  // accordingly. Fall back to the single `catalogSource` for non-aggregated
  // rows.
  const aggregated = provider.catalogSources ?? [];
  const isMpp = aggregated.includes("mpp_registry") || provider.catalogSource === "mpp_registry";
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  if (identity.includes(TOP_PROVIDER_MARK)) return 0;
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return PINNED_BASE_RANK + i;
  }
  if (isMpp) return MPP_RANK;
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
