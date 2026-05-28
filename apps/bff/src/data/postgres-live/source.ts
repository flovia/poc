import type {
  BffAnalyticsDataSource,
  GeneratedReadModelFile,
  PostgresAnalyticsClient,
} from "../analytics-source";
import { loadGeneratedAnalyticsDataSourceFromPayload } from "../analytics-source";
import { POSTGRES_LIVE_CUSTOMER_QUERY, POSTGRES_LIVE_PROVIDER_QUERY } from "./queries";
import { buildPayload } from "./payload-builder";
import { mapCustomerRow, mapProviderRow } from "./row-mappers";

export const loadPostgresLiveAnalyticsPayload = async (
  client: PostgresAnalyticsClient,
): Promise<GeneratedReadModelFile> => {
  const [providerRows, customerRows] = await Promise.all([
    client.query(POSTGRES_LIVE_PROVIDER_QUERY),
    client.query(POSTGRES_LIVE_CUSTOMER_QUERY),
  ]);
  return buildPayload(providerRows.map(mapProviderRow), customerRows.map(mapCustomerRow));
};

export const loadPostgresLiveAnalyticsDataSource = async (
  client: PostgresAnalyticsClient,
): Promise<BffAnalyticsDataSource> => {
  return loadGeneratedAnalyticsDataSourceFromPayload(
    await loadPostgresLiveAnalyticsPayload(client),
  );
};
