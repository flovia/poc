// Merge curated `STATIC_PROVIDER_CAPABILITIES` into a list of providers
// returned by an upstream source (BFF API or client-side dedup), so callers
// see a single unified catalog.
//
// Originally only `app/providers.tsx` did this on the client, but server
// components also call `getProviders()` and used to 404 on `static-` providers
// that were never in the BFF response (e.g. /providers/static-…/customers).
// Sharing one merger keeps the route id (`static-${slugify(serviceId)}`) and
// dedup rule consistent across server and client.

import { slugifyProviderName } from "@/lib/providers";
import {
  STATIC_PROVIDER_CAPABILITIES,
  type StaticProviderCapability,
} from "@/lib/providers/static-capabilities";

export const buildStaticProviderRouteId = (serviceId: string): string =>
  `static-${slugifyProviderName(serviceId)}`;

export type StaticProviderFactory<T> = (
  capability: StaticProviderCapability,
  routeId: string,
) => T;

// Append entries from STATIC_PROVIDER_CAPABILITIES whose serviceId is not
// already covered by `live`. Existing entries (including their merged
// catalogSources / protocols / networks from the live catalog) are left
// untouched — static-only is purely additive.
export function mergeStaticProviders<T extends { serviceId?: string | null }>(
  live: readonly T[],
  factory: StaticProviderFactory<T>,
): T[] {
  const known = new Set<string>();
  for (const item of live) {
    if (item.serviceId) known.add(item.serviceId);
  }
  const additions: T[] = [];
  for (const capability of STATIC_PROVIDER_CAPABILITIES) {
    if (known.has(capability.serviceId)) continue;
    additions.push(factory(capability, buildStaticProviderRouteId(capability.serviceId)));
  }
  return [...live, ...additions];
}
