import { db, nowIso } from "../db";
import type { AttributionCandidate, KnownFingerprint } from "../schema";

const listObservations = () =>
  db
    .prepare(
      `
    SELECT
      observation_id,
      payer_wallet,
      recipient_wallet,
      relayer_wallet,
      CASE
        WHEN method = 'direct_transferWithAuthorization' THEN 'direct'
        WHEN method = 'multicall3_aggregate3' THEN 'multicall'
        ELSE method
      END AS method
    FROM payment_observations
    ORDER BY observation_id
  `,
    )
    .all() as Array<{ observation_id: number; payer_wallet: string; recipient_wallet: string; relayer_wallet: string; method: string }>;

type FingerprintRecord = {
  fingerprint_type: string;
  fingerprint_value: string;
  confidence: number;
  provider_label: string | null;
};

const listFingerprints = () =>
  db
    .prepare(`SELECT fingerprint_type, fingerprint_value, confidence, provider_label FROM known_fingerprints ORDER BY fingerprint_type, fingerprint_value`)
    .all() as Array<FingerprintRecord>;

const normalize = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => ({
    fingerprintType: row.fingerprint_type as KnownFingerprint["fingerprintType"],
    fingerprintValue: row.fingerprint_value as KnownFingerprint["fingerprintValue"],
    confidence: Number(row.confidence),
    providerLabel: row.provider_label as string | null,
  }));

export const buildAttributionCandidates = () => {
  const now = nowIso();
  db.exec("DELETE FROM attribution_candidates;");

  const observations = listObservations();
  const fingerprints = normalize(listFingerprints());

  const recipientFingerprints = fingerprints.filter((item) => item.fingerprintType === "recipient");
  const relayerFingerprints = fingerprints.filter((item) => item.fingerprintType === "relayer");

  const insertCandidate = db.prepare(`
    INSERT INTO attribution_candidates (
      observation_id,
      candidate_type,
      confidence,
      reasons_json,
      evidence_refs_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(observation_id, candidate_type, reasons_json) DO UPDATE SET
      confidence = excluded.confidence,
      reasons_json = excluded.reasons_json,
      evidence_refs_json = excluded.evidence_refs_json,
      updated_at = excluded.updated_at
  `);

  const upserted = [] as AttributionCandidate[];

  for (const observation of observations) {
    const recipientMatch = recipientFingerprints.find((entry) => entry.fingerprintValue.toLowerCase() === observation.recipient_wallet.toLowerCase());
    if (recipientMatch) {
      const reasons = ["payer matches known recipient fingerprint", `providerLabel=${recipientMatch.providerLabel ?? "unlabeled"}`];
      const evidenceRefs = [`receipt:${observation.observation_id}:recipient`];
      const candidateType = "recipient_match" as const;

      insertCandidate.run(
        observation.observation_id,
        candidateType,
        Math.min(100, recipientMatch.confidence),
        JSON.stringify(reasons),
        JSON.stringify(evidenceRefs),
        now,
        now,
      );

      upserted.push({
        candidateType,
        observationId: observation.observation_id,
        matchedValue: recipientMatch.fingerprintValue,
        confidence: Math.min(100, recipientMatch.confidence),
        reasons,
        evidenceRefs,
      });
    }

    const relayerMatch = relayerFingerprints.find((entry) => entry.fingerprintValue.toLowerCase() === observation.relayer_wallet.toLowerCase());
    if (relayerMatch) {
      const reasons = ["relayer matches known relayer fingerprint", `providerLabel=${relayerMatch.providerLabel ?? "unlabeled"}`];
      const evidenceRefs = [`receipt:${observation.observation_id}:relayer`];
      const candidateType = "relayer_match" as const;

      insertCandidate.run(
        observation.observation_id,
        candidateType,
        Math.min(100, relayerMatch.confidence),
        JSON.stringify(reasons),
        JSON.stringify(evidenceRefs),
        now,
        now,
      );

      upserted.push({
        candidateType,
        observationId: observation.observation_id,
        matchedValue: relayerMatch.fingerprintValue,
        confidence: Math.min(100, relayerMatch.confidence),
        reasons,
        evidenceRefs,
      });
    }
  }

  return {
    candidateCount: upserted.length,
    observationCount: observations.length,
  };
};
