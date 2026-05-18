import { SQL } from "bun";
import type {
  AnalyticsSourceEnv,
  BffAnalyticsDataSource,
  GeneratedReadModelFile,
  PostgresAnalyticsClient,
} from "./analytics-data-source";
import { loadGeneratedAnalyticsDataSourceFromPayload } from "./json-read-model-source";

export const createBunPostgresClient = (url: string): PostgresAnalyticsClient => {
  const sql = new SQL(url);
  return {
    query: (query, params = []) => sql.unsafe(query, params) as Promise<Record<string, unknown>[]>,
  };
};

export const isPostgresConnectionString = (value: string | undefined): value is string => {
  const trimmed = value?.trim();
  return !!trimmed && /^postgres(?:ql)?:\/\//i.test(trimmed);
};

export const resolvePostgresDatabaseUrl = (env: AnalyticsSourceEnv): string | undefined => {
  const explicit = env.BFF_ANALYTICS_DATABASE_URL?.trim();
  if (explicit) return explicit;
  const databaseUrl = env.DATABASE_URL?.trim();
  return isPostgresConnectionString(databaseUrl) ? databaseUrl : undefined;
};

export const loadPostgresAnalyticsDataSource = async (
  client: PostgresAnalyticsClient,
  snapshotId = "latest",
): Promise<BffAnalyticsDataSource> => {
  const rows = await client.query("SELECT payload FROM bff_analytics_snapshots WHERE id = $1", [
    snapshotId,
  ]);
  const rawPayload = rows[0]?.payload;
  const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  if (!payload || typeof payload !== "object") {
    throw new Error(`BFF analytics snapshot not found: ${snapshotId}`);
  }
  return loadGeneratedAnalyticsDataSourceFromPayload(payload as GeneratedReadModelFile);
};
