import fs from "node:fs";
import path from "node:path";
import { db, env, nowIso, type AppDatabase } from "../db";
import {
  validateSettlementFingerprintPacksSeed,
  type SettlementFingerprintPack,
  type SettlementFingerprintPacksSeed,
} from "../schema";

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

export const seedSettlementFingerprintPacks = (
  seed: SettlementFingerprintPacksSeed,
  database: AppDatabase = db,
) => {
  const now = nowIso();
  const upsert = database.prepare(`
    INSERT INTO settlement_fingerprint_packs (
      fingerprint_id,
      cluster_id,
      display_name,
      method,
      top_level_to,
      top_level_selector,
      inner_selector,
      entity_id,
      evidence_class,
      base_confidence,
      reasons_json,
      evidence_refs_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fingerprint_id) DO UPDATE SET
      cluster_id = excluded.cluster_id,
      display_name = excluded.display_name,
      method = excluded.method,
      top_level_to = excluded.top_level_to,
      top_level_selector = excluded.top_level_selector,
      inner_selector = excluded.inner_selector,
      entity_id = excluded.entity_id,
      evidence_class = excluded.evidence_class,
      base_confidence = excluded.base_confidence,
      reasons_json = excluded.reasons_json,
      evidence_refs_json = excluded.evidence_refs_json,
      updated_at = excluded.updated_at
  `);

  const store = database.transaction((fingerprints: SettlementFingerprintPack[]) => {
    for (const fingerprint of fingerprints) {
      upsert.run(
        fingerprint.fingerprintId,
        fingerprint.clusterId,
        fingerprint.displayName,
        fingerprint.method ?? null,
        fingerprint.topLevelTo ?? null,
        fingerprint.topLevelSelector,
        fingerprint.innerSelector ?? null,
        fingerprint.entityId ?? null,
        fingerprint.evidenceClass,
        fingerprint.baseConfidence,
        JSON.stringify(fingerprint.reasons),
        JSON.stringify(fingerprint.evidenceRefs),
        now,
        now,
      );
    }
  });

  store(seed.fingerprints);
  return seed.fingerprints.length;
};

export const seedSettlementFingerprintPacksFromFile = (
  seedPath = path.join(env.fixturesDir, "knowledge", "settlement_fingerprint_packs.json"),
  database: AppDatabase = db,
) => {
  const absolutePath = path.isAbsolute(seedPath) ? seedPath : path.resolve(process.cwd(), seedPath);
  const seed = validateSettlementFingerprintPacksSeed(
    readJson<Record<string, unknown>>(absolutePath),
  );
  return seedSettlementFingerprintPacks(seed, database);
};

export const listSettlementFingerprintPacks = (database: AppDatabase = db) =>
  database
    .prepare(
      `
      SELECT
        fingerprint_id,
        cluster_id,
        display_name,
        method,
        top_level_to,
        top_level_selector,
        inner_selector,
        entity_id,
        evidence_class,
        base_confidence,
        reasons_json,
        evidence_refs_json
      FROM settlement_fingerprint_packs
      ORDER BY fingerprint_id
    `,
    )
    .all() as Array<{
    fingerprint_id: string;
    cluster_id: string;
    display_name: string;
    method: string | null;
    top_level_to: string | null;
    top_level_selector: string;
    inner_selector: string | null;
    entity_id: string | null;
    evidence_class: SettlementFingerprintPack["evidenceClass"];
    base_confidence: number;
    reasons_json: string;
    evidence_refs_json: string;
  }>;
