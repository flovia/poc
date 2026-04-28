import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

const resolvePath = (value: string) =>
  path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);

const toText = (...parts: Array<string>) =>
  parts
    .map((item) => String(item))
    .filter(Boolean)
    .join("");

export const env = {
  databasePath: resolvePath(process.env.DATABASE_URL ?? "./demo.db"),
  reportsDir: resolvePath(process.env.REPORTS_DIR ?? "./reports"),
  fixturesDir: resolvePath(process.env.FIXTURES_DIR ?? "./fixtures"),
  manifestPath: resolvePath(process.env.MANIFEST_PATH ?? "./fixtures/manifest.json"),
};

export type AppDatabase = Database;

export const createDb = (databasePath = env.databasePath): AppDatabase => {
  const database = new Database(databasePath, { create: true });
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
};

export let db = createDb();

export const initDb = (database = db) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_observations (
      observation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      block_timestamp INTEGER NOT NULL,
      relayer_wallet TEXT NOT NULL,
      payer_wallet TEXT NOT NULL,
      recipient_wallet TEXT NOT NULL,
      token_address TEXT NOT NULL,
      amount_atomic TEXT NOT NULL,
      method TEXT NOT NULL,
      top_level_selector TEXT NOT NULL,
      case_id TEXT NOT NULL,
      stable_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(chain_id, tx_hash, stable_hash)
    );

    CREATE TABLE IF NOT EXISTS settlement_evidence (
      evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_id INTEGER NOT NULL,
      evidence_type TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      detail TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(observation_id, evidence_type, source_ref),
      FOREIGN KEY(observation_id) REFERENCES payment_observations(observation_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS known_fingerprints (
      fingerprint_id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint_type TEXT NOT NULL,
      fingerprint_value TEXT NOT NULL,
      provider_label TEXT,
      middleman_label TEXT,
      facilitator_label TEXT,
      source_name TEXT,
      provenance_json TEXT,
      confidence INTEGER NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      UNIQUE(fingerprint_type, fingerprint_value)
    );

    CREATE TABLE IF NOT EXISTS attribution_candidates (
      candidate_id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_id INTEGER NOT NULL,
      candidate_type TEXT NOT NULL,
      matched_fingerprint_type TEXT NOT NULL,
      matched_fingerprint_value TEXT NOT NULL,
      matched_claim_id TEXT,
      matched_settlement_fingerprint_id TEXT,
      entity_id TEXT,
      role TEXT,
      confidence INTEGER NOT NULL,
      reasons_json TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(observation_id, candidate_type, matched_fingerprint_value),
      FOREIGN KEY(observation_id) REFERENCES payment_observations(observation_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS provider_endpoint_claims (
      claim_id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      provider_name TEXT,
      service_name TEXT,
      endpoint_url TEXT,
      resource_url TEXT,
      request_host TEXT,
      pay_to_wallet TEXT NOT NULL,
      network TEXT NOT NULL,
      asset_address TEXT NOT NULL,
      amount_atomic TEXT,
      tx_hash TEXT,
      evidence_class TEXT NOT NULL,
      roles_json TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      source_name TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlement_fingerprint_packs (
      fingerprint_id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      method TEXT,
      top_level_to TEXT,
      top_level_selector TEXT NOT NULL,
      inner_selector TEXT,
      entity_id TEXT,
      evidence_class TEXT NOT NULL,
      base_confidence INTEGER NOT NULL,
      reasons_json TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      run_id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      from_block INTEGER,
      to_block INTEGER,
      scanned_blocks INTEGER NOT NULL,
      scanned_transactions INTEGER NOT NULL,
      candidate_transactions INTEGER NOT NULL,
      receipt_fetches INTEGER NOT NULL,
      observation_count INTEGER NOT NULL,
      inserted_observations INTEGER NOT NULL,
      evidence_rows_updated INTEGER NOT NULL,
      skipped_missing_receipts INTEGER NOT NULL,
      skipped_failed_receipts INTEGER NOT NULL,
      status TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      day TEXT PRIMARY KEY,
      observation_count INTEGER NOT NULL,
      candidate_count INTEGER NOT NULL,
      unique_payers INTEGER NOT NULL,
      unique_recipients INTEGER NOT NULL,
      unique_relayers INTEGER NOT NULL,
      total_amount_atomic TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payer_wallet_profiles (
      wallet TEXT PRIMARY KEY,
      observation_count INTEGER NOT NULL,
      total_amount_atomic TEXT NOT NULL,
      unique_recipients INTEGER NOT NULL,
      unique_relayers INTEGER NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipient_summaries (
      wallet TEXT PRIMARY KEY,
      observation_count INTEGER NOT NULL,
      total_amount_atomic TEXT NOT NULL,
      unique_payers INTEGER NOT NULL,
      unique_relayers INTEGER NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relayer_summaries (
      wallet TEXT PRIMARY KEY,
      observation_count INTEGER NOT NULL,
      total_amount_atomic TEXT NOT NULL,
      unique_payers INTEGER NOT NULL,
      unique_recipients INTEGER NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_observations_chain_tx ON payment_observations(chain_id, tx_hash);
    CREATE INDEX IF NOT EXISTS idx_payment_observations_time ON payment_observations(block_timestamp);
    CREATE INDEX IF NOT EXISTS idx_payment_observations_wallets ON payment_observations(payer_wallet, recipient_wallet, relayer_wallet);
    CREATE INDEX IF NOT EXISTS idx_attribution_candidates_observation ON attribution_candidates(observation_id);
    CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_blocks ON ingestion_runs(source, from_block, to_block);
    CREATE INDEX IF NOT EXISTS idx_known_fingerprints_type_value ON known_fingerprints(fingerprint_type, fingerprint_value);
    CREATE INDEX IF NOT EXISTS idx_provider_endpoint_claims_pay_to ON provider_endpoint_claims(pay_to_wallet);
    CREATE INDEX IF NOT EXISTS idx_provider_endpoint_claims_tx ON provider_endpoint_claims(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_settlement_fingerprint_packs_selector ON settlement_fingerprint_packs(method, top_level_selector);
  `);

  const attributionColumns = database
    .prepare("PRAGMA table_info(attribution_candidates)")
    .all() as Array<{ name: string }>;
  const existing = new Set(attributionColumns.map((column) => column.name));
  for (const [name, ddl] of [
    ["matched_claim_id", "ALTER TABLE attribution_candidates ADD COLUMN matched_claim_id TEXT"],
    [
      "matched_settlement_fingerprint_id",
      "ALTER TABLE attribution_candidates ADD COLUMN matched_settlement_fingerprint_id TEXT",
    ],
    ["entity_id", "ALTER TABLE attribution_candidates ADD COLUMN entity_id TEXT"],
    ["role", "ALTER TABLE attribution_candidates ADD COLUMN role TEXT"],
  ] as const) {
    if (!existing.has(name)) database.exec(ddl);
  }
};

export const resetDb = (databasePath = env.databasePath) => {
  db.close(false);
  const candidate = [databasePath, toText(databasePath, "-wal"), toText(databasePath, "-shm")];
  for (const filePath of candidate) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath);
  }
  db = createDb(databasePath);
};

export const nowIso = () => new Date().toISOString();

export const ensureDir = (target: string) => {
  fs.mkdirSync(target, { recursive: true });
};
