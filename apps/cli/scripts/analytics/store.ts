import { Database } from "bun:sqlite";
import {
  getDefaultAnalyticsDbPath,
  openAnalyticsDatabase,
  resolveAnalyticsDbPath,
} from "./store/connection";
import { analyticsSchema, SCHEMA_SQL } from "./store/schema";
import {
  type BitqueryAggregate,
  type BitqueryTransferFact,
  type CdpResource,
  type CustomerIntelligenceResponse,
  type CustomerOutgoingTransferFact,
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
  | "full_capture"
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

export type PayToCensusQueryRow = ScopedPaymentSink & {
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  latestBlockTimestamp?: string;
  mappingPattern: MappingPattern;
  endpointAttributionStatus: EndpointAttributionStatus;
  attributionConfidence: number;
  attributionMetadata: Record<string, unknown>;
  serviceId?: string;
  serviceName?: string;
  endpointCount: number;
  resourceCount: number;
  hasCustomerFacts: boolean;
  customerFactCount: number;
};

export type PayToCensusQueryScope = {
  network?: string;
  asset?: string;
  aggregateRunIds?: number[];
  cdpRunIds?: number[];
  timeWindow?: { from?: string; to?: string };
};

export type WalletTransferQueryRow = {
  payerWallet: string;
  payTo: string;
  network: string;
  asset: string;
  serviceId?: string;
  serviceName?: string;
  amountAtomic: string;
  blockTimestamp: string;
  isCoingecko: boolean;
  isBundledPayTo: boolean;
  attributionMetadata: Record<string, unknown>;
};

export type WalletTransferQueryScope = {
  network?: string;
  asset?: string;
  transferRunIds?: number[];
  timeWindow?: { from?: string; to?: string };
};

export type CustomerOutgoingTransferQueryScope = WalletTransferQueryScope & {
  payerWallets?: string[];
};

export type SuccessfulPayToTransferRun = {
  runId: number;
  payTo: string;
  capturedCount: number;
  finishedAt?: string;
};

type TransferRunReuseScope = {
  network: string;
  asset: string;
  payTo: string;
  limit: number;
  pageSize?: number;
  timeWindow: { from: string; to?: string };
  timeSlices?: Array<{ from: string; to?: string }>;
};

export type SamplingPlanMetadataInput = {
  planKind: "payto" | "wallet" | string;
  planKey: string;
  payload: unknown;
  parameters?: Record<string, unknown>;
  selectedEntities?: unknown[];
  sourceRunId?: number;
  generatedAt?: string;
};

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
    this.db = openAnalyticsDatabase(this.dbPath);
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

  findSuccessfulPayToTransferRun(scope: TransferRunReuseScope): SuccessfulPayToTransferRun | null {
    this.initialize();
    const rows = this.db
      .prepare(
        `SELECT id, finished_at, parameters_json, source_coverage_json
         FROM capture_runs
         WHERE kind = 'payto_transfer_capture' AND status = 'success'
         ORDER BY id DESC`,
      )
      .all() as Array<Record<string, unknown>>;
    const network = normalizeNetwork(scope.network);
    const asset = normalizeAsset(scope.asset);
    const payTo = normalizePayTo(scope.payTo);
    for (const row of rows) {
      const parameters = parseJson(row.parameters_json as string, {}) as Record<string, unknown>;
      const timeWindow = parameters.timeWindow as Record<string, unknown> | undefined;
      if (normalizeNetwork(String(parameters.network ?? "")) !== network) continue;
      if (normalizeAsset(String(parameters.asset ?? "")) !== asset) continue;
      if (normalizePayTo(String(parameters.payTo ?? "")) !== payTo) continue;
      if (Number(parameters.limit ?? 0) < scope.limit) continue;
      if ((parameters.pageSize ?? undefined) !== (scope.pageSize ?? undefined)) continue;
      if (timeWindow?.from !== scope.timeWindow.from) continue;
      if ((timeWindow?.to ?? undefined) !== (scope.timeWindow.to ?? undefined)) continue;
      if (
        JSON.stringify(parameters.timeSlices ?? undefined) !==
        JSON.stringify(scope.timeSlices ?? undefined)
      ) {
        continue;
      }
      const coverage = parseJson(row.source_coverage_json as string, {}) as Record<string, unknown>;
      const bitqueryCoverage = coverage.bitquery as Record<string, unknown> | undefined;
      if (Number(bitqueryCoverage?.timeSlices ?? 1) !== (scope.timeSlices?.length ?? 1)) continue;
      return {
        runId: Number(row.id),
        payTo,
        capturedCount: Number(bitqueryCoverage?.capturedCount ?? 0),
        finishedAt: (row.finished_at as string | null) ?? undefined,
      };
    }
    return null;
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

  persistSamplingPlanMetadata(input: SamplingPlanMetadataInput) {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    this.persistGeneratedReadModel({
      modelKind: `sampling_plan_${input.planKind}`,
      modelKey: input.planKey,
      generatedAt,
      sourceRunId: input.sourceRunId,
      provenance: {
        planKind: input.planKind,
        planKey: input.planKey,
        generatedAt,
        parameters: input.parameters ?? {},
        selectedCount: input.selectedEntities?.length ?? null,
      },
      payload: {
        planKind: input.planKind,
        planKey: input.planKey,
        generatedAt,
        parameters: input.parameters ?? {},
        selectedEntities: input.selectedEntities ?? [],
        sourceRunId: input.sourceRunId ?? null,
        plan: input.payload,
      },
    });
  }

  listPayToCensusRows(scope: PayToCensusQueryScope = {}): PayToCensusQueryRow[] {
    this.initialize();
    const network = scope.network ? normalizeNetwork(scope.network) : null;
    const asset = scope.asset ? normalizeAsset(scope.asset) : null;
    const aggregateRunIds = scope.aggregateRunIds ?? [];
    const cdpRunIds = scope.cdpRunIds ?? [];
    const aggregateRunFilter = aggregateRunIds.length
      ? `WHERE source_run_id IN (${aggregateRunIds.map(() => "?").join(", ")})`
      : "";
    const cdpRunFilter = cdpRunIds.length
      ? `WHERE source_run_id IN (${cdpRunIds.map(() => "?").join(", ")})`
      : "";
    const aggregateWindowPrefix = aggregateRunIds.length ? "AND" : "WHERE";
    const windowFromFilter = scope.timeWindow?.from
      ? `${aggregateWindowPrefix} window_from >= ?`
      : "";
    const windowToPrefix = aggregateRunIds.length || scope.timeWindow?.from ? "AND" : "WHERE";
    const windowToFilter = scope.timeWindow?.to ? `${windowToPrefix} window_to <= ?` : "";
    const runScopeFilter =
      aggregateRunIds.length || cdpRunIds.length
        ? "AND (pa.sink_key IS NOT NULL OR po.has_payment_option IS NOT NULL)"
        : "";
    const params: Array<string | number | null> = [
      ...aggregateRunIds,
      ...(scope.timeWindow?.from ? [scope.timeWindow.from] : []),
      ...(scope.timeWindow?.to ? [scope.timeWindow.to] : []),
      ...cdpRunIds,
      network,
      network,
      asset,
      asset,
    ];
    const rows = this.db
      .prepare(
        `WITH pa AS (
           SELECT
             sink_key,
             MAX(transaction_count) AS transaction_count,
             MAX(unique_sender_count) AS unique_sender_count,
             MAX(total_volume_atomic) AS total_volume_atomic,
             MAX(latest_block_timestamp) AS latest_block_timestamp
           FROM payto_aggregates
           ${aggregateRunFilter} ${windowFromFilter} ${windowToFilter}
           GROUP BY sink_key
         ),
         po AS (
           SELECT network, asset, pay_to, 1 AS has_payment_option
           FROM payment_options
           ${cdpRunFilter}
           GROUP BY network, asset, pay_to
         ),
         sc AS (
           SELECT
             sink_key,
             COUNT(DISTINCT resource_id) AS endpoint_count,
             MIN(service_key) AS service_id,
             MIN(COALESCE(service, provider, domain)) AS service_name
           FROM service_candidates
           GROUP BY sink_key
         ),
         tfc AS (
           SELECT network, asset, pay_to, COUNT(DISTINCT payer_wallet) AS customer_fact_count
           FROM transfer_facts
           GROUP BY network, asset, pay_to
         )
         SELECT
           ps.network,
           ps.asset,
           ps.pay_to,
           COALESCE(pa.transaction_count, 0) AS transaction_count,
           COALESCE(pa.unique_sender_count, 0) AS unique_sender_count,
           COALESCE(pa.total_volume_atomic, '0') AS total_volume_atomic,
           pa.latest_block_timestamp AS latest_block_timestamp,
           COALESCE(ea.mapping_pattern, 'unresolved_payto') AS mapping_pattern,
           COALESCE(ea.endpoint_attribution_status, 'unresolved_payto') AS endpoint_attribution_status,
           COALESCE(ea.confidence, 0) AS confidence,
           COALESCE(ea.provenance_json, '{}') AS attribution_json,
           COALESCE(ea.resource_count, 0) AS resource_count,
           COALESCE(sc.endpoint_count, 0) AS endpoint_count,
           sc.service_id AS service_id,
           sc.service_name AS service_name,
           COALESCE(tfc.customer_fact_count, 0) AS customer_fact_count
          FROM payment_sinks ps
          LEFT JOIN pa ON pa.sink_key = ps.sink_key
          LEFT JOIN po ON po.network = ps.network AND po.asset = ps.asset AND po.pay_to = ps.pay_to
          LEFT JOIN endpoint_attribution ea ON ea.sink_key = ps.sink_key
          LEFT JOIN sc ON sc.sink_key = ps.sink_key
          LEFT JOIN tfc ON tfc.network = ps.network AND tfc.asset = ps.asset AND tfc.pay_to = ps.pay_to
          WHERE (? IS NULL OR ps.network = ?) AND (? IS NULL OR ps.asset = ?)
          ${runScopeFilter}
          ORDER BY transaction_count DESC, ps.pay_to ASC`,
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      network: row.network as string,
      asset: row.asset as string,
      payTo: row.pay_to as string,
      transactionCount: Number(row.transaction_count ?? 0),
      uniqueSenderCount: Number(row.unique_sender_count ?? 0),
      totalVolumeAtomic: String(row.total_volume_atomic ?? "0"),
      latestBlockTimestamp: (row.latest_block_timestamp as string | null) ?? undefined,
      mappingPattern: row.mapping_pattern as MappingPattern,
      endpointAttributionStatus: row.endpoint_attribution_status as EndpointAttributionStatus,
      attributionConfidence: Number(row.confidence ?? 0),
      attributionMetadata: parseJson(row.attribution_json as string, {}),
      serviceId: (row.service_id as string | null) ?? undefined,
      serviceName: (row.service_name as string | null) ?? undefined,
      endpointCount: Number(row.endpoint_count ?? 0),
      resourceCount: Number(row.resource_count ?? 0),
      hasCustomerFacts: Number(row.customer_fact_count ?? 0) > 0,
      customerFactCount: Number(row.customer_fact_count ?? 0),
    }));
  }

  listWalletTransferRows(scope: WalletTransferQueryScope = {}): WalletTransferQueryRow[] {
    this.initialize();
    const network = scope.network ? normalizeNetwork(scope.network) : null;
    const asset = scope.asset ? normalizeAsset(scope.asset) : null;
    const transferRunIds = scope.transferRunIds ?? [];
    const transferRunFilter = transferRunIds.length
      ? `AND tf.source_run_id IN (${transferRunIds.map(() => "?").join(", ")})`
      : "";
    const windowFromFilter = scope.timeWindow?.from ? "AND tf.block_timestamp >= ?" : "";
    const windowToFilter = scope.timeWindow?.to ? "AND tf.block_timestamp <= ?" : "";
    const params: Array<string | number | null> = [
      network,
      network,
      asset,
      asset,
      ...transferRunIds,
      ...(scope.timeWindow?.from ? [scope.timeWindow.from] : []),
      ...(scope.timeWindow?.to ? [scope.timeWindow.to] : []),
    ];
    const rows = this.db
      .prepare(
        `SELECT
           tf.network,
           tf.asset,
           tf.pay_to,
           tf.payer_wallet,
           tf.amount_atomic,
           tf.block_timestamp,
           COALESCE(ea.mapping_pattern, 'unresolved_payto') AS mapping_pattern,
           COALESCE(ea.endpoint_attribution_status, 'unresolved_payto') AS endpoint_attribution_status,
           COALESCE(ea.provenance_json, '{}') AS attribution_json,
           MIN(sc.service_key) AS service_id,
           MIN(COALESCE(sc.service, sc.provider, sc.domain)) AS service_name
         FROM transfer_facts tf
         LEFT JOIN payment_sinks ps ON ps.network = tf.network AND ps.asset = tf.asset AND ps.pay_to = tf.pay_to
         LEFT JOIN endpoint_attribution ea ON ea.sink_key = ps.sink_key
         LEFT JOIN service_candidates sc ON sc.sink_key = ps.sink_key
         WHERE (? IS NULL OR tf.network = ?) AND (? IS NULL OR tf.asset = ?)
         ${transferRunFilter} ${windowFromFilter} ${windowToFilter}
         GROUP BY tf.id
         ORDER BY tf.block_timestamp DESC, tf.tx_hash ASC, tf.transfer_index ASC`,
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const serviceText = `${row.service_id ?? ""} ${row.service_name ?? ""}`.toLowerCase();
      const mappingPattern = row.mapping_pattern as MappingPattern;
      const endpointStatus = row.endpoint_attribution_status as EndpointAttributionStatus;
      return {
        network: row.network as string,
        asset: row.asset as string,
        payTo: row.pay_to as string,
        payerWallet: row.payer_wallet as string,
        amountAtomic: String(row.amount_atomic),
        blockTimestamp: row.block_timestamp as string,
        serviceId: (row.service_id as string | null) ?? undefined,
        serviceName: (row.service_name as string | null) ?? undefined,
        isCoingecko: serviceText.includes("coingecko"),
        isBundledPayTo:
          mappingPattern === "one_payto_many_endpoints" ||
          endpointStatus === "bundled_payto_unknown_endpoint",
        attributionMetadata: parseJson(row.attribution_json as string, {}),
      };
    });
  }

  listCustomerOutgoingTransferFacts(
    scope: CustomerOutgoingTransferQueryScope = {},
  ): CustomerOutgoingTransferFact[] {
    this.initialize();
    const network = scope.network ? normalizeNetwork(scope.network) : null;
    const asset = scope.asset ? normalizeAsset(scope.asset) : null;
    const transferRunIds = scope.transferRunIds ?? [];
    const payerWallets = (scope.payerWallets ?? []).map((wallet) => normalizePayTo(wallet));
    const transferRunFilter = transferRunIds.length
      ? `AND source_run_id IN (${transferRunIds.map(() => "?").join(", ")})`
      : "";
    const payerFilter = payerWallets.length
      ? `AND payer_wallet IN (${payerWallets.map(() => "?").join(", ")})`
      : "";
    const windowFromFilter = scope.timeWindow?.from ? "AND block_timestamp >= ?" : "";
    const windowToFilter = scope.timeWindow?.to ? "AND block_timestamp <= ?" : "";
    const params: Array<string | number | null> = [
      network,
      network,
      asset,
      asset,
      ...transferRunIds,
      ...payerWallets,
      ...(scope.timeWindow?.from ? [scope.timeWindow.from] : []),
      ...(scope.timeWindow?.to ? [scope.timeWindow.to] : []),
    ];
    const rows = this.db
      .prepare(
        `SELECT network, asset, pay_to, tx_hash, payer_wallet, amount_atomic, block_number, block_timestamp
         FROM transfer_facts
         WHERE (? IS NULL OR network = ?) AND (? IS NULL OR asset = ?)
         ${transferRunFilter} ${payerFilter} ${windowFromFilter} ${windowToFilter}
         ORDER BY block_timestamp DESC, tx_hash ASC, transfer_index ASC`,
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      txHash: row.tx_hash as string,
      customerAddress: row.payer_wallet as string,
      payTo: row.pay_to as string,
      amountAtomic: String(row.amount_atomic),
      network: row.network as string,
      asset: row.asset as string,
      timestamp: row.block_timestamp as string,
      blockNumber: (row.block_number as string | null) ?? undefined,
      provenance: "onchain_fact",
    }));
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

export const createAnalyticsStore = (options: AnalyticsStoreOptions = {}) =>
  new AnalyticsStore(options);
export { analyticsSchema, getDefaultAnalyticsDbPath, resolveAnalyticsDbPath };
