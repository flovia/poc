import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

const resolvePath = (value: string) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value));

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

const openDatabase = () => {
  const database = new Database(env.databasePath, { create: true });
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
};

export let db = openDatabase();

export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_observations (
      observation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      tx_index INTEGER NOT NULL,
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
      UNIQUE(chain_id, tx_hash, tx_index, stable_hash)
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

    CREATE TABLE IF NOT EXISTS catalog_entries (
      catalog_entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      fingerprint_type TEXT NOT NULL,
      fingerprint_value TEXT NOT NULL,
      label TEXT,
      confidence INTEGER NOT NULL,
      source_name TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(case_id, fingerprint_type, fingerprint_value)
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
      confidence INTEGER NOT NULL,
      reasons_json TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(observation_id, candidate_type, matched_fingerprint_value),
      FOREIGN KEY(observation_id) REFERENCES payment_observations(observation_id) ON DELETE CASCADE
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
  `);
};

export const resetDb = () => {
  db.close(false);
  const candidate = [env.databasePath, toText(env.databasePath, "-wal"), toText(env.databasePath, "-shm")];
  for (const filePath of candidate) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath);
  }
  db = openDatabase();
};

export const nowIso = () => new Date().toISOString();

export const ensureDir = (target: string) => {
  fs.mkdirSync(target, { recursive: true });
};
