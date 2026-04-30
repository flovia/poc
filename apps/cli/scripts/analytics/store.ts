import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  type BitqueryAggregate,
  type BitqueryTransferFact,
  type CdpResource,
  type CustomerIntelligenceResponse,
  normalizeAsset,
  normalizeNetwork,
  normalizePayTo,
  paymentIdentityKey,
} from "contracts";

export type AnalyticsDatabaseMode = "file" | "memory" | "temporary";

export type AnalyticsStoreOptions = {
  path?: string;
  mode?: AnalyticsDatabaseMode;
};

export type CaptureRunStatus = "running" | "success" | "failed";
export type CaptureRunKind =
  | "cdp_census"
  | "bitquery_aggregate_census"
  | "payto_transfer_capture"
  | "customer_intelligence_capture"
  | "read_model_generation"
  | "test";

export type CaptureRunInput = {
  kind: CaptureRunKind;
  parameters?: Record<string, unknown>;
  sourceCoverage?: Record<string, unknown>;
  startedAt?: string;
};

export type ScopedPaymentSink = {
  network: string;
  asset: string;
  payTo: string;
};

export type EndpointAttributionStatus =
  | "direct_payto_endpoint"
  | "bundled_payto_unknown_endpoint"
  | "amount_inferred_endpoint"
  | "sdk_attributed_endpoint"
  | "demo_attributed_endpoint"
  | "unresolved_payto";

export type MappingPattern =
  | "one_payto_one_endpoint"
  | "one_payto_many_endpoints"
  | "many_paytos_one_service"
  | "unresolved_payto";

export type MappingPatternRow = ScopedPaymentSink & {
  mappingPattern: MappingPattern;
  endpointAttributionStatus: EndpointAttributionStatus;
  resourceCount: number;
  serviceCount: number;
  confidence: number;
};

export type TransferFactInput = ScopedPaymentSink & {
  txHash: string;
  transferIndex?: number;
  payerWallet: string;
  amountAtomic: string;
  blockNumber?: string;
  blockTimestamp: string;
  sourceRunId?: number;
};

export type CustomerWalletInput = {
  address: string;
  labels?: string[];
  strata?: string[];
  sourceRunId?: number;
};

export type GeneratedReadModelInput = {
  modelKind: "service_summary" | "service_comparison" | "service_quadrants" | string;
  modelKey: string;
  payload: unknown;
  sourceRunId?: number;
  provenance?: Record<string, unknown>;
  generatedAt?: string;
};

const DEFAULT_ANALYTICS_DB_PATH = path.join(process.cwd(), "data", "analytics", "analytics.sqlite");

const REQUIRED_TABLES = [
  "schema_migrations",
  "capture_runs",
  "cdp_resources",
  "payment_options",
  "payment_sinks",
  "payto_aggregates",
  "transfer_facts",
  "service_candidates",
  "endpoint_attribution",
  "customer_wallets",
  "customer_intelligence_snapshots",
  "generated_read_models",
] as const;

const REQUIRED_INDEXES = [
  "idx_capture_runs_kind_status",
  "idx_payment_options_sink",
  "idx_payment_options_resource",
  "idx_payto_aggregates_sink",
  "idx_transfer_facts_sink_time",
  "idx_transfer_facts_payer",
  "idx_endpoint_attribution_status",
  "idx_customer_snapshots_wallet",
  "idx_generated_read_models_kind_key",
] as const;

export const getDefaultAnalyticsDbPath = () => DEFAULT_ANALYTICS_DB_PATH;

const toJson = (value: unknown): string => JSON.stringify(value ?? null);

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  return JSON.parse(value) as T;
};

const sinkKey = (sink: ScopedPaymentSink) =>
  paymentIdentityKey({ network: sink.network, asset: sink.asset, payTo: sink.payTo });

const resourceDomain = (resource: string) => {
  try {
    return new URL(resource).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const serviceKeyForResource = (resource: Pick<CdpResource, "provider" | "service" | "resource">) =>
  (
    resource.provider ??
    resource.service ??
    resourceDomain(resource.resource) ??
    "unknown"
  ).toLowerCase();

export class AnalyticsStore {
  readonly db: Database;
  readonly dbPath: string;

  constructor(options: AnalyticsStoreOptions = {}) {
    this.dbPath = resolveAnalyticsDbPath(options);
    if (this.dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    this.db = new Database(this.dbPath, { create: true });
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  initialize() {
    this.db.exec(SCHEMA_SQL);
    const migration = this.db.prepare(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    );
    migration.run(1, new Date().toISOString());
  }

  close() {
    this.db.close();
  }

  beginCaptureRun(input: CaptureRunInput): number {
    this.initialize();
    const startedAt = input.startedAt ?? new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO capture_runs (kind, status, started_at, parameters_json, source_coverage_json)
         VALUES (?, 'running', ?, ?, ?)`,
      )
      .run(
        input.kind,
        startedAt,
        toJson(input.parameters ?? {}),
        toJson(input.sourceCoverage ?? {}),
      );
    return Number(result.lastInsertRowid);
  }

  completeCaptureRun(runId: number, sourceCoverage?: Record<string, unknown>) {
    this.db
      .prepare(
        `UPDATE capture_runs
         SET status = 'success', finished_at = ?, source_coverage_json = COALESCE(?, source_coverage_json), error_json = NULL
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), sourceCoverage ? toJson(sourceCoverage) : null, runId);
  }

  failCaptureRun(runId: number, error: unknown, sourceCoverage?: Record<string, unknown>) {
    this.db
      .prepare(
        `UPDATE capture_runs
         SET status = 'failed', finished_at = ?, source_coverage_json = COALESCE(?, source_coverage_json), error_json = ?
         WHERE id = ?`,
      )
      .run(
        new Date().toISOString(),
        sourceCoverage ? toJson(sourceCoverage) : null,
        toJson(error instanceof Error ? { name: error.name, message: error.message } : error),
        runId,
      );
  }

  getCaptureRun(runId: number) {
    const row = this.db.prepare("SELECT * FROM capture_runs WHERE id = ?").get(runId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return {
      ...row,
      parameters: parseJson(row.parameters_json as string, {}),
      sourceCoverage: parseJson(row.source_coverage_json as string, {}),
      error: parseJson(row.error_json as string | null, null),
    };
  }

  persistCdpResources(resources: CdpResource[], sourceRunId?: number) {
    this.initialize();
    const insertResource = this.db.prepare(
      `INSERT INTO cdp_resources
       (resource_id, resource_url, domain, provider, service, provenance_json, quality_json, metadata_json, raw_json, source_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(resource_id) DO UPDATE SET
         resource_url = excluded.resource_url,
         domain = excluded.domain,
         provider = excluded.provider,
         service = excluded.service,
         provenance_json = excluded.provenance_json,
         quality_json = excluded.quality_json,
         metadata_json = excluded.metadata_json,
         raw_json = excluded.raw_json,
         source_run_id = excluded.source_run_id`,
    );
    const insertOption = this.db.prepare(
      `INSERT INTO payment_options
       (option_key, resource_id, network, asset, pay_to, amount_atomic, scheme, provenance_json, quality_json, metadata_json, raw_json, source_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(option_key) DO UPDATE SET
         amount_atomic = excluded.amount_atomic,
         scheme = excluded.scheme,
         provenance_json = excluded.provenance_json,
         quality_json = excluded.quality_json,
         metadata_json = excluded.metadata_json,
         raw_json = excluded.raw_json,
         source_run_id = excluded.source_run_id`,
    );
    const insertSink = this.db.prepare(
      `INSERT INTO payment_sinks (sink_key, network, asset, pay_to, first_seen_run_id, last_seen_run_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(sink_key) DO UPDATE SET last_seen_run_id = excluded.last_seen_run_id`,
    );
    const insertCandidate = this.db.prepare(
      `INSERT INTO service_candidates (candidate_key, service_key, provider, service, domain, resource_id, sink_key, provenance_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(candidate_key) DO UPDATE SET provenance_json = excluded.provenance_json`,
    );

    const transaction = this.db.transaction((items: CdpResource[]) => {
      for (const resource of items) {
        const domain = resourceDomain(resource.resource);
        insertResource.run(
          resource.resourceId,
          resource.resource,
          domain,
          resource.provider ?? null,
          resource.service ?? null,
          toJson(resource.provenance),
          toJson(resource.quality ?? null),
          toJson(resource.metadata ?? null),
          toJson(resource),
          sourceRunId ?? null,
        );

        for (const [index, option] of resource.paymentOptions.entries()) {
          const normalized = {
            network: normalizeNetwork(option.network),
            asset: normalizeAsset(option.asset),
            payTo: normalizePayTo(option.payTo),
          };
          const key = sinkKey(normalized);
          const optionKey = `${resource.resourceId}::${key}::${index}`;
          insertSink.run(
            key,
            normalized.network,
            normalized.asset,
            normalized.payTo,
            sourceRunId ?? null,
            sourceRunId ?? null,
          );
          insertOption.run(
            optionKey,
            resource.resourceId,
            normalized.network,
            normalized.asset,
            normalized.payTo,
            option.amount,
            option.scheme ?? null,
            toJson(option.provenance),
            toJson(option.quality ?? null),
            toJson(option.metadata ?? null),
            toJson(option),
            sourceRunId ?? null,
          );
          insertCandidate.run(
            `${resource.resourceId}::${key}`,
            serviceKeyForResource(resource),
            resource.provider ?? null,
            resource.service ?? null,
            domain,
            resource.resourceId,
            key,
            toJson(resource.provenance),
          );
        }
      }
    });

    transaction(resources);
    return {
      resources: resources.length,
      paymentOptions: resources.reduce((sum, item) => sum + item.paymentOptions.length, 0),
    };
  }

  persistPayToAggregates(aggregates: BitqueryAggregate[], sourceRunId?: number) {
    this.initialize();
    const insertSink = this.db.prepare(
      `INSERT INTO payment_sinks (sink_key, network, asset, pay_to, first_seen_run_id, last_seen_run_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(sink_key) DO UPDATE SET last_seen_run_id = excluded.last_seen_run_id`,
    );
    const insertAggregate = this.db.prepare(
      `INSERT INTO payto_aggregates
       (sink_key, network, asset, pay_to, transaction_count, unique_sender_count, total_volume_atomic,
        latest_tx_hash, latest_sender, latest_amount_atomic, latest_block_number, latest_block_timestamp,
        window_from, window_to, provenance_json, source_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sink_key, window_from, window_to) DO UPDATE SET
         transaction_count = excluded.transaction_count,
         unique_sender_count = excluded.unique_sender_count,
         total_volume_atomic = excluded.total_volume_atomic,
         latest_tx_hash = excluded.latest_tx_hash,
         latest_sender = excluded.latest_sender,
         latest_amount_atomic = excluded.latest_amount_atomic,
         latest_block_number = excluded.latest_block_number,
         latest_block_timestamp = excluded.latest_block_timestamp,
         provenance_json = excluded.provenance_json,
         source_run_id = excluded.source_run_id`,
    );

    const transaction = this.db.transaction((items: BitqueryAggregate[]) => {
      for (const aggregate of items) {
        const normalized = {
          network: normalizeNetwork(aggregate.network),
          asset: normalizeAsset(aggregate.asset),
          payTo: normalizePayTo(aggregate.payTo),
        };
        const key = sinkKey(normalized);
        insertSink.run(
          key,
          normalized.network,
          normalized.asset,
          normalized.payTo,
          sourceRunId ?? null,
          sourceRunId ?? null,
        );
        insertAggregate.run(
          key,
          normalized.network,
          normalized.asset,
          normalized.payTo,
          aggregate.transactionCount,
          aggregate.uniqueSenderCount,
          aggregate.totalVolumeAtomic,
          aggregate.latestTransfer?.txHash ?? null,
          aggregate.latestTransfer?.sender ?? null,
          aggregate.latestTransfer?.amountAtomic ?? null,
          aggregate.latestTransfer?.blockNumber ?? null,
          aggregate.latestTransfer?.blockTimestamp ?? null,
          aggregate.timeWindow?.from ?? null,
          aggregate.timeWindow?.to ?? null,
          toJson(aggregate.provenance),
          sourceRunId ?? null,
        );
      }
    });
    transaction(aggregates);
    return { aggregates: aggregates.length };
  }

  persistTransferFacts(facts: TransferFactInput[]) {
    this.initialize();
    const insert = this.db.prepare(
      `INSERT INTO transfer_facts
       (network, asset, pay_to, tx_hash, transfer_index, payer_wallet, amount_atomic, block_number, block_timestamp, source_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(network, asset, pay_to, tx_hash, transfer_index) DO UPDATE SET
         payer_wallet = excluded.payer_wallet,
         amount_atomic = excluded.amount_atomic,
         block_number = excluded.block_number,
         block_timestamp = excluded.block_timestamp,
         source_run_id = excluded.source_run_id`,
    );
    const transaction = this.db.transaction((items: TransferFactInput[]) => {
      for (const [index, fact] of items.entries()) {
        insert.run(
          normalizeNetwork(fact.network),
          normalizeAsset(fact.asset),
          normalizePayTo(fact.payTo),
          fact.txHash.toLowerCase(),
          fact.transferIndex ?? index,
          normalizePayTo(fact.payerWallet),
          fact.amountAtomic,
          fact.blockNumber ?? null,
          fact.blockTimestamp,
          fact.sourceRunId ?? null,
        );
      }
    });
    transaction(facts);
    return { transferFacts: facts.length };
  }

  persistBitqueryTransferFacts(
    facts: BitqueryTransferFact[],
    sink: ScopedPaymentSink & { sourceRunId?: number },
  ) {
    return this.persistTransferFacts(
      facts.map((fact, index) => ({
        network: sink.network,
        asset: sink.asset,
        payTo: sink.payTo,
        txHash: fact.txHash,
        transferIndex: index,
        payerWallet: fact.sender,
        amountAtomic: fact.amountAtomic,
        blockNumber: fact.blockNumber,
        blockTimestamp: fact.blockTimestamp,
        sourceRunId: sink.sourceRunId,
      })),
    );
  }

  persistCustomerWallets(wallets: CustomerWalletInput[]) {
    this.initialize();
    const insert = this.db.prepare(
      `INSERT INTO customer_wallets (address, labels_json, strata_json, source_run_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(address) DO UPDATE SET labels_json = excluded.labels_json, strata_json = excluded.strata_json, source_run_id = excluded.source_run_id`,
    );
    const transaction = this.db.transaction((items: CustomerWalletInput[]) => {
      for (const wallet of items) {
        insert.run(
          normalizePayTo(wallet.address),
          toJson(wallet.labels ?? []),
          toJson(wallet.strata ?? []),
          wallet.sourceRunId ?? null,
        );
      }
    });
    transaction(wallets);
    return { wallets: wallets.length };
  }

  persistCustomerIntelligenceSnapshots(
    snapshots: CustomerIntelligenceResponse[],
    sourceRunId?: number,
  ) {
    this.initialize();
    const insert = this.db.prepare(
      `INSERT INTO customer_intelligence_snapshots
       (wallet_address, generated_at, payload_json, source_coverage_json, source_run_id)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const transaction = this.db.transaction((items: CustomerIntelligenceResponse[]) => {
      for (const snapshot of items) {
        insert.run(
          snapshot.customerAddress,
          snapshot.generatedAt,
          toJson(snapshot),
          toJson(snapshot.sourceCoverage),
          sourceRunId ?? null,
        );
      }
    });
    transaction(snapshots);
    return { snapshots: snapshots.length };
  }

  detectAndPersistMappingPatterns(extraSinks: ScopedPaymentSink[] = []): MappingPatternRow[] {
    this.initialize();
    const sinkRows = this.db
      .prepare("SELECT network, asset, pay_to FROM payment_sinks")
      .all() as Array<{
      network: string;
      asset: string;
      pay_to: string;
    }>;
    const allSinks = new Map<string, ScopedPaymentSink>();
    for (const row of sinkRows) {
      allSinks.set(sinkKey({ network: row.network, asset: row.asset, payTo: row.pay_to }), {
        network: row.network,
        asset: row.asset,
        payTo: row.pay_to,
      });
    }
    for (const sink of extraSinks) {
      const normalized = {
        network: normalizeNetwork(sink.network),
        asset: normalizeAsset(sink.asset),
        payTo: normalizePayTo(sink.payTo),
      };
      const key = sinkKey(normalized);
      this.db
        .prepare(
          `INSERT OR IGNORE INTO payment_sinks (sink_key, network, asset, pay_to)
           VALUES (?, ?, ?, ?)`,
        )
        .run(key, normalized.network, normalized.asset, normalized.payTo);
      allSinks.set(key, normalized);
    }

    const serviceSinkRows = this.db
      .prepare("SELECT service_key, sink_key FROM service_candidates")
      .all() as Array<{ service_key: string; sink_key: string }>;
    const payTosByService = new Map<string, Set<string>>();
    for (const row of serviceSinkRows) {
      const set = payTosByService.get(row.service_key) ?? new Set<string>();
      set.add(row.sink_key);
      payTosByService.set(row.service_key, set);
    }

    const insert = this.db.prepare(
      `INSERT INTO endpoint_attribution
       (sink_key, network, asset, pay_to, mapping_pattern, endpoint_attribution_status, resource_count, service_count, confidence, provenance_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sink_key) DO UPDATE SET
         mapping_pattern = excluded.mapping_pattern,
         endpoint_attribution_status = excluded.endpoint_attribution_status,
         resource_count = excluded.resource_count,
         service_count = excluded.service_count,
         confidence = excluded.confidence,
         provenance_json = excluded.provenance_json`,
    );
    const rows: MappingPatternRow[] = [];

    for (const [key, sink] of allSinks.entries()) {
      const candidates = this.db
        .prepare(
          "SELECT DISTINCT resource_id, service_key FROM service_candidates WHERE sink_key = ?",
        )
        .all(key) as Array<{
        resource_id: string;
        service_key: string;
      }>;
      const resourceCount = new Set(candidates.map((item) => item.resource_id)).size;
      const serviceKeys = new Set(candidates.map((item) => item.service_key));
      const belongsToManyPayToService = [...serviceKeys].some(
        (serviceKey) => (payTosByService.get(serviceKey)?.size ?? 0) > 1,
      );
      const mappingPattern: MappingPattern =
        resourceCount === 0
          ? "unresolved_payto"
          : resourceCount > 1
            ? "one_payto_many_endpoints"
            : belongsToManyPayToService
              ? "many_paytos_one_service"
              : "one_payto_one_endpoint";
      const endpointAttributionStatus: EndpointAttributionStatus =
        mappingPattern === "one_payto_one_endpoint" || mappingPattern === "many_paytos_one_service"
          ? "direct_payto_endpoint"
          : mappingPattern === "one_payto_many_endpoints"
            ? "bundled_payto_unknown_endpoint"
            : "unresolved_payto";
      const confidence =
        endpointAttributionStatus === "direct_payto_endpoint"
          ? 0.9
          : endpointAttributionStatus === "bundled_payto_unknown_endpoint"
            ? 0.35
            : 0;
      const row = {
        ...sink,
        mappingPattern,
        endpointAttributionStatus,
        resourceCount,
        serviceCount: serviceKeys.size,
        confidence,
      };
      rows.push(row);
      insert.run(
        key,
        sink.network,
        sink.asset,
        sink.payTo,
        mappingPattern,
        endpointAttributionStatus,
        resourceCount,
        serviceKeys.size,
        confidence,
        toJson({ source: "cdp_payment_options" }),
      );
    }

    return rows.sort((left, right) => sinkKey(left).localeCompare(sinkKey(right)));
  }

  persistGeneratedReadModel(input: GeneratedReadModelInput) {
    this.initialize();
    this.db
      .prepare(
        `INSERT INTO generated_read_models
         (model_kind, model_key, generated_at, payload_json, provenance_json, source_run_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(model_kind, model_key) DO UPDATE SET
           generated_at = excluded.generated_at,
           payload_json = excluded.payload_json,
           provenance_json = excluded.provenance_json,
           source_run_id = excluded.source_run_id`,
      )
      .run(
        input.modelKind,
        input.modelKey,
        input.generatedAt ?? new Date().toISOString(),
        toJson(input.payload),
        toJson(input.provenance ?? {}),
        input.sourceRunId ?? null,
      );
  }

  readGeneratedReadModel<T>(modelKind: string, modelKey: string): T | null {
    this.initialize();
    const row = this.db
      .prepare(
        "SELECT payload_json FROM generated_read_models WHERE model_kind = ? AND model_key = ?",
      )
      .get(modelKind, modelKey) as { payload_json: string } | undefined;
    return row ? (JSON.parse(row.payload_json) as T) : null;
  }

  getSchemaObjectNames() {
    const rows = this.db
      .prepare("SELECT type, name FROM sqlite_master WHERE type IN ('table', 'index')")
      .all() as Array<{ type: "table" | "index"; name: string }>;
    return {
      tables: rows
        .filter((row) => row.type === "table")
        .map((row) => row.name)
        .sort(),
      indexes: rows
        .filter((row) => row.type === "index" && !row.name.startsWith("sqlite_autoindex"))
        .map((row) => row.name)
        .sort(),
    };
  }
}

export const resolveAnalyticsDbPath = (options: AnalyticsStoreOptions = {}) => {
  if (options.mode === "memory") return ":memory:";
  if (options.mode === "temporary") {
    return path.join(
      fs.mkdtempSync(path.join(process.cwd(), "tmp", "analytics-store-")),
      "analytics.sqlite",
    );
  }
  return options.path ?? process.env.ANALYTICS_DB_PATH ?? DEFAULT_ANALYTICS_DB_PATH;
};

export const createAnalyticsStore = (options: AnalyticsStoreOptions = {}) =>
  new AnalyticsStore(options);

export const analyticsSchema = {
  requiredTables: REQUIRED_TABLES,
  requiredIndexes: REQUIRED_INDEXES,
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capture_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  parameters_json TEXT NOT NULL DEFAULT '{}',
  source_coverage_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_capture_runs_kind_status ON capture_runs(kind, status);

CREATE TABLE IF NOT EXISTS cdp_resources (
  resource_id TEXT PRIMARY KEY,
  resource_url TEXT NOT NULL,
  domain TEXT,
  provider TEXT,
  service TEXT,
  provenance_json TEXT NOT NULL,
  quality_json TEXT,
  metadata_json TEXT,
  raw_json TEXT NOT NULL,
  source_run_id INTEGER,
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);

CREATE TABLE IF NOT EXISTS payment_sinks (
  sink_key TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  first_seen_run_id INTEGER,
  last_seen_run_id INTEGER,
  UNIQUE(network, asset, pay_to)
);

CREATE TABLE IF NOT EXISTS payment_options (
  option_key TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  scheme TEXT,
  provenance_json TEXT NOT NULL,
  quality_json TEXT,
  metadata_json TEXT,
  raw_json TEXT NOT NULL,
  source_run_id INTEGER,
  FOREIGN KEY(resource_id) REFERENCES cdp_resources(resource_id),
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_payment_options_sink ON payment_options(network, asset, pay_to);
CREATE INDEX IF NOT EXISTS idx_payment_options_resource ON payment_options(resource_id);

CREATE TABLE IF NOT EXISTS payto_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sink_key TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  transaction_count INTEGER NOT NULL,
  unique_sender_count INTEGER NOT NULL,
  total_volume_atomic TEXT NOT NULL,
  latest_tx_hash TEXT,
  latest_sender TEXT,
  latest_amount_atomic TEXT,
  latest_block_number TEXT,
  latest_block_timestamp TEXT,
  window_from TEXT,
  window_to TEXT,
  provenance_json TEXT NOT NULL,
  source_run_id INTEGER,
  UNIQUE(sink_key, window_from, window_to),
  FOREIGN KEY(sink_key) REFERENCES payment_sinks(sink_key),
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_payto_aggregates_sink ON payto_aggregates(network, asset, pay_to);

CREATE TABLE IF NOT EXISTS transfer_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  transfer_index INTEGER NOT NULL,
  payer_wallet TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  block_number TEXT,
  block_timestamp TEXT NOT NULL,
  source_run_id INTEGER,
  UNIQUE(network, asset, pay_to, tx_hash, transfer_index),
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_transfer_facts_sink_time ON transfer_facts(network, asset, pay_to, block_timestamp);
CREATE INDEX IF NOT EXISTS idx_transfer_facts_payer ON transfer_facts(payer_wallet);

CREATE TABLE IF NOT EXISTS service_candidates (
  candidate_key TEXT PRIMARY KEY,
  service_key TEXT NOT NULL,
  provider TEXT,
  service TEXT,
  domain TEXT,
  resource_id TEXT NOT NULL,
  sink_key TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  FOREIGN KEY(resource_id) REFERENCES cdp_resources(resource_id),
  FOREIGN KEY(sink_key) REFERENCES payment_sinks(sink_key)
);

CREATE TABLE IF NOT EXISTS endpoint_attribution (
  sink_key TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  mapping_pattern TEXT NOT NULL,
  endpoint_attribution_status TEXT NOT NULL,
  resource_count INTEGER NOT NULL,
  service_count INTEGER NOT NULL,
  confidence REAL NOT NULL,
  provenance_json TEXT NOT NULL,
  FOREIGN KEY(sink_key) REFERENCES payment_sinks(sink_key)
);
CREATE INDEX IF NOT EXISTS idx_endpoint_attribution_status ON endpoint_attribution(endpoint_attribution_status);

CREATE TABLE IF NOT EXISTS customer_wallets (
  address TEXT PRIMARY KEY,
  labels_json TEXT NOT NULL DEFAULT '[]',
  strata_json TEXT NOT NULL DEFAULT '[]',
  source_run_id INTEGER,
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);

CREATE TABLE IF NOT EXISTS customer_intelligence_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  source_coverage_json TEXT NOT NULL,
  source_run_id INTEGER,
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_customer_snapshots_wallet ON customer_intelligence_snapshots(wallet_address, generated_at);

CREATE TABLE IF NOT EXISTS generated_read_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_kind TEXT NOT NULL,
  model_key TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  source_run_id INTEGER,
  UNIQUE(model_kind, model_key),
  FOREIGN KEY(source_run_id) REFERENCES capture_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_generated_read_models_kind_key ON generated_read_models(model_kind, model_key);
`;
