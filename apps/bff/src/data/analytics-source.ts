import fs from "node:fs";
import { loadPostgresLiveAnalyticsDataSource } from "./postgres-live-read-model";
import {
  type AnalyticsSourceKind,
  DEFAULT_GENERATED_ANALYTICS_PATH,
  DEFAULT_MPP_CATALOG_PATH,
  type BffAnalyticsDataSource,
  type ResolveAnalyticsDataSourceOptions,
} from "./analytics-data-source";
import { applyMppCatalogOverlay } from "./catalog-overlay";
import { fixtureAnalyticsDataSource } from "./fixture-source";
import { loadGeneratedAnalyticsDataSource } from "./json-read-model-source";
import {
  createBunPostgresClient,
  loadPostgresAnalyticsDataSource,
  resolvePostgresDatabaseUrl,
} from "./postgres-source";

export type {
  AnalyticsSourceEnv,
  AnalyticsSourceKind,
  BffAnalyticsDataSource,
  GeneratedReadModelFile,
  PostgresAnalyticsClient,
  ResolveAnalyticsDataSourceOptions,
} from "./analytics-data-source";
export { applyMppCatalogOverlay } from "./catalog-overlay";
export {
  filterCustomersByPayTo,
  filterCustomersByServiceId,
  isSolanaCustomer,
  payToMapFromWalletUsageGraph,
  shouldTagPaySh,
} from "./customer-filters";
export { fixtureAnalyticsDataSource, fixtureProviderCatalog } from "./fixture-source";
export {
  loadGeneratedAnalyticsDataSource,
  loadGeneratedAnalyticsDataSourceFromPayload,
} from "./json-read-model-source";
export {
  createBunPostgresClient,
  isPostgresConnectionString,
  loadPostgresAnalyticsDataSource,
  resolvePostgresDatabaseUrl,
} from "./postgres-source";
export { buildRouteAnalytics, visibilityForRail } from "./route-analytics-builder";

export const resolveAnalyticsDataSource = (
  filePath = process.env.BFF_ANALYTICS_READ_MODEL_PATH ?? DEFAULT_GENERATED_ANALYTICS_PATH,
  options: ResolveAnalyticsDataSourceOptions = {},
): BffAnalyticsDataSource | Promise<BffAnalyticsDataSource> => {
  const env = options.env ?? process.env;
  const source = (env.BFF_ANALYTICS_SOURCE?.trim() || undefined) as AnalyticsSourceKind | undefined;
  const readModelPath = env.BFF_ANALYTICS_READ_MODEL_PATH ?? filePath;
  // Overlay resolution:
  // - BFF_MPP_CATALOG_PATH explicitly set (any value, including ""):
  //     non-empty path -> use it (fail-fast if file missing)
  //     empty string   -> overlay disabled
  // - BFF_MPP_CATALOG_PATH undefined:
  //     non-production: auto-load tmp/mpp-provider-catalog.json if it exists (dev convenience)
  //     production:     no auto-load (must be opt-in via BFF_MPP_CATALOG_PATH)
  const isProduction = (env.NODE_ENV ?? "").toLowerCase() === "production";
  const mppOverlayPath =
    env.BFF_MPP_CATALOG_PATH !== undefined
      ? env.BFF_MPP_CATALOG_PATH
      : !isProduction && fs.existsSync(DEFAULT_MPP_CATALOG_PATH)
        ? DEFAULT_MPP_CATALOG_PATH
        : undefined;

  const overlay = (resolved: BffAnalyticsDataSource): BffAnalyticsDataSource =>
    applyMppCatalogOverlay(resolved, mppOverlayPath);

  if (source === "fixture") return overlay(fixtureAnalyticsDataSource);

  if (source === "json") {
    if (!readModelPath || !fs.existsSync(readModelPath)) {
      throw new Error(`BFF analytics JSON read model not found: ${readModelPath}`);
    }
    return overlay(loadGeneratedAnalyticsDataSource(readModelPath));
  }

  if (source === "postgres") {
    const databaseUrl = resolvePostgresDatabaseUrl(env);
    if (!databaseUrl && !options.postgresClient) {
      throw new Error(
        "BFF analytics postgres source requires BFF_ANALYTICS_DATABASE_URL or a postgres:// DATABASE_URL.",
      );
    }
    const client = options.postgresClient ?? createBunPostgresClient(databaseUrl as string);
    if ((env.BFF_ANALYTICS_POSTGRES_MODE ?? "live") === "snapshot") {
      return loadPostgresAnalyticsDataSource(
        client,
        env.BFF_ANALYTICS_SNAPSHOT_ID ?? "latest",
      ).then(overlay);
    }
    return loadPostgresLiveAnalyticsDataSource(client).then(overlay);
  }

  if (source !== undefined) {
    throw new Error(`Unsupported BFF_ANALYTICS_SOURCE: ${source}`);
  }

  if (readModelPath && fs.existsSync(readModelPath))
    return overlay(loadGeneratedAnalyticsDataSource(readModelPath));
  return overlay(fixtureAnalyticsDataSource);
};
