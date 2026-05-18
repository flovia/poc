import type { Database } from "bun:sqlite";
import type { CustomerIntelligenceResponse } from "contracts";

export type ServiceAnalyticsRow = {
  service_key: string;
  service_name: string;
  sink_key: string;
  endpoint_attribution_status: string;
  confidence: number;
  resource_count: number;
  transaction_count: number;
  unique_sender_count: number;
};

export const listServiceAnalyticsRows = (
  db: Database,
  aggregateRunIds: number[] = [],
): ServiceAnalyticsRow[] => {
  const aggregateRunFilter = aggregateRunIds.length
    ? `AND pa.source_run_id IN (${aggregateRunIds.map(() => "?").join(", ")})`
    : "";
  const aggregateRowFilter = aggregateRunIds.length ? "WHERE pa.source_run_id IS NOT NULL" : "";

  return db
    .prepare(
      `WITH canonical_service_candidates AS (
         SELECT
           sink_key,
           service_key,
           COALESCE(MAX(service), MAX(provider), MAX(domain), service_key) AS service_name,
           COUNT(DISTINCT resource_id) AS resource_count
         FROM service_candidates
         GROUP BY sink_key, service_key
       )
       SELECT
         COALESCE(sc.service_key, ea.pay_to) AS service_key,
         COALESCE(sc.service_name, ea.pay_to) AS service_name,
         ea.sink_key,
         ea.endpoint_attribution_status,
         ea.confidence,
         COALESCE(sc.resource_count, ea.resource_count) AS resource_count,
         COALESCE(pa.transaction_count, 0) AS transaction_count,
         COALESCE(pa.unique_sender_count, 0) AS unique_sender_count
       FROM endpoint_attribution ea
       LEFT JOIN canonical_service_candidates sc ON sc.sink_key = ea.sink_key
       LEFT JOIN payto_aggregates pa ON pa.sink_key = ea.sink_key ${aggregateRunFilter}
       ${aggregateRowFilter}
       ORDER BY transaction_count DESC`,
    )
    .all(...aggregateRunIds) as ServiceAnalyticsRow[];
};

export const listLatestCustomerIntelligenceSnapshots = (
  db: Database,
  customerRunIds?: number[],
): CustomerIntelligenceResponse[] => {
  const runFilter = customerRunIds
    ? customerRunIds.length
      ? `WHERE source_run_id IN (${customerRunIds.map(() => "?").join(", ")})`
      : "WHERE 0"
    : "";
  const rows = db
    .prepare(
      `SELECT wallet_address, payload_json
       FROM customer_intelligence_snapshots
       ${runFilter}
       ORDER BY generated_at DESC`,
    )
    .all(...(customerRunIds ?? [])) as Array<{ wallet_address: string; payload_json: string }>;

  const latestByAddress = new Map<string, CustomerIntelligenceResponse>();
  for (const row of rows) {
    const key = row.wallet_address.toLowerCase();
    if (!latestByAddress.has(key)) {
      latestByAddress.set(key, JSON.parse(row.payload_json) as CustomerIntelligenceResponse);
    }
  }
  return [...latestByAddress.values()];
};
