export const REQUIRED_TABLES = [
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

export const REQUIRED_INDEXES = [
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

export const SCHEMA_SQL = `
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

export const analyticsSchema = {
  requiredTables: REQUIRED_TABLES,
  requiredIndexes: REQUIRED_INDEXES,
};
