import fs from "node:fs";
import { validateProviderCatalogResponse } from "contracts";
import { mergeProviderCatalogs } from "sources";
import type { BffAnalyticsDataSource } from "./analytics-data-source";
import { buildRouteAnalytics } from "./route-analytics-builder";

// Merge an MPP-derived ProviderCatalogResponse on top of an existing data source's
// providers. The data source identity is preserved (only the providers field is replaced),
// so customers/profiles/wallet graph etc. continue to work unchanged.
//
// Behavior:
// - overlayPath is undefined/empty -> no-op (overlay disabled)
// - overlayPath is set but file missing/unreadable -> throw (fail-fast on misconfig)
export const applyMppCatalogOverlay = (
  dataSource: BffAnalyticsDataSource,
  overlayPath: string | undefined,
): BffAnalyticsDataSource => {
  const trimmed = overlayPath?.trim();
  if (!trimmed) return dataSource;
  if (!fs.existsSync(trimmed)) {
    throw new Error(
      `BFF_MPP_CATALOG_PATH is set but file does not exist: ${trimmed}. ` +
        "Either unset BFF_MPP_CATALOG_PATH or point it to a readable mpp-provider-catalog.json.",
    );
  }
  const raw = JSON.parse(fs.readFileSync(trimmed, "utf8"));
  const mppCatalog = validateProviderCatalogResponse(raw);
  const merged = mergeProviderCatalogs(dataSource.providers, mppCatalog);
  if (merged === dataSource.providers) return dataSource;
  const routeAnalytics = buildRouteAnalytics(merged);
  return { ...dataSource, providers: merged, ...routeAnalytics };
};
