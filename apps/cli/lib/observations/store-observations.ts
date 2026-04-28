import { db, nowIso } from "../db";
import type { PaymentObservationInput } from "../schema";

const safeStringify = (value: unknown): string =>
  JSON.stringify(value, (_, nested) => (typeof nested === "bigint" ? nested.toString() : nested));

export const storePaymentObservations = (observations: PaymentObservationInput[]) => {
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
    WHERE settlement_evidence.detail != excluded.detail
       OR settlement_evidence.raw_json != excluded.raw_json
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
  let insertedObservations = 0;
  let evidenceRowsUpdated = 0;

  const store = db.transaction((items: PaymentObservationInput[]) => {
    for (const observation of items) {
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

      const idRow = selectObservationId.get(
        observation.chainId,
        observation.txHash,
        observation.stableHash,
      ) as
        | {
            observation_id: number;
          }
        | undefined;

      const observationId = idRow?.observation_id;
      if (observationId == null) continue;
      if (inserted.changes === 1) insertedObservations += 1;

      for (const item of observation.evidence) {
        const insertedEvidence = countEvidence.run(
          observationId,
          item.type,
          `${observation.caseId}:${item.type}`,
          item.detail,
          safeStringify(item.raw),
          now,
        ) as { changes: number };
        evidenceRowsUpdated += insertedEvidence.changes;
      }
    }
  });

  store(observations);

  return {
    insertedObservations,
    evidenceRowsUpdated,
  };
};
