import fs from "node:fs";
import path from "node:path";
import { db, env, initDb, nowIso } from "../lib/db";
import { validateFixtureManifest, type RawReceipt, type RawTransaction, type PaymentObservationInput } from "../lib/schema";
import { buildObservationsFromFixture } from "../lib/observations/build-observation";
import { upsertCatalogAndFingerprints } from "../lib/attribution/fingerprints";

const readJson = <T>(filePath: string): T => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
};

const safeStringify = (value: unknown): string =>
  JSON.stringify(value, (_, nested) => (typeof nested === "bigint" ? nested.toString() : nested));

export const runIngest = (manifestPath = process.env.MANIFEST_PATH ?? env.manifestPath) => {
  const fixtureDir = path.dirname(path.resolve(process.cwd(), manifestPath));
  const manifestJson = readJson<Record<string, unknown>>(path.resolve(process.cwd(), manifestPath));
  const manifest = validateFixtureManifest(manifestJson);

  initDb();

  const catalogCount = upsertCatalogAndFingerprints(manifest.cases);

  const countEvidence = db.prepare(`
    INSERT INTO settlement_evidence (
      observation_id,
      evidence_type,
      source_ref,
      detail,
      raw_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(observation_id, evidence_type, source_ref) DO UPDATE SET
      detail = excluded.detail,
      raw_json = excluded.raw_json,
      created_at = excluded.created_at
  `);

  const insertObservation = db.prepare(`
    INSERT INTO payment_observations (
      chain_id,
      tx_hash,
      tx_index,
      block_number,
      block_timestamp,
      relayer_wallet,
      payer_wallet,
      recipient_wallet,
      token_address,
      amount_atomic,
      method,
      top_level_selector,
      case_id,
      stable_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chain_id, tx_hash, tx_index, stable_hash) DO NOTHING
  `);

  const selectObservationId = db.prepare(`
    SELECT observation_id
    FROM payment_observations
    WHERE chain_id = ? AND tx_hash = ? AND stable_hash = ?
    LIMIT 1
  `);

  const now = nowIso();

  let observationCount = 0;
  let evidenceCount = 0;

  for (const fixtureCase of manifest.cases) {
    const txPath = path.resolve(fixtureDir, fixtureCase.txFile);
    const receiptPath = path.resolve(fixtureDir, fixtureCase.receiptFile);

    const tx = readJson<RawTransaction>(txPath);
    const receipt = readJson<RawReceipt>(receiptPath);

    const observations = buildObservationsFromFixture(fixtureCase.caseId, tx, receipt);

    for (const observation of observations) {
      const inserted = insertObservation.run(
        observation.chainId,
        observation.txHash,
        observation.txIndex,
        observation.blockNumber,
        observation.blockTimestamp,
        observation.relayer,
        observation.payer,
        observation.recipient,
        observation.tokenAddress,
        observation.amountAtomic,
        observation.method,
        observation.topLevelSelector,
        observation.caseId,
        observation.stableHash,
        now,
        now,
      ) as { changes: number };

      const idRow = selectObservationId.get(observation.chainId, observation.txHash, observation.stableHash) as {
        observation_id: number;
      } | undefined;

      const observationId = idRow?.observation_id;
      if (observationId == null) continue;
      if (inserted.changes === 1) observationCount += 1;

      for (const item of observation.evidence) {
        const insertedEvidence = countEvidence.run(
          observationId,
          item.type,
          `${observation.caseId}:${item.type}`,
          item.detail,
          safeStringify(item.raw),
          now,
        ) as { changes: number };
        evidenceCount += insertedEvidence.changes;
      }
    }
  }

  return {
    insertedObservations: observationCount,
    evidenceRowsUpdated: evidenceCount,
    catalogEntries: catalogCount,
    fixtureCases: manifest.cases.length,
    databasePath: env.databasePath,
  };
};

if (import.meta.main) {
  const result = runIngest();
  console.log(JSON.stringify(result, null, 2));
}
