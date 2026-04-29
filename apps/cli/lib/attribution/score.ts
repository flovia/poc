import { BASE_USDC_ADDRESS, MULTICALL3_ADDRESS } from "../constants";
import { type AppDatabase, db, nowIso } from "../db";
import type { AttributionCandidate, AttributionCandidateType, KnownFingerprint } from "../schema";
import { listProviderEndpointClaims } from "./provider-claims";
import { listSettlementFingerprintPacks } from "./settlement-fingerprints";

const BASE_MAINNET_CHAIN_ID = 8453;
const PAYSPONGE_HOST_SUFFIX = ".x402.paysponge.com";

const listObservations = (database: AppDatabase) =>
  database
    .prepare(
      `
    SELECT
      observation_id,
      tx_hash,
      chain_id,
      payer_wallet,
      recipient_wallet,
      relayer_wallet,
      token_address,
      amount_atomic,
      top_level_selector,
      CASE
        WHEN method = 'direct_transferWithAuthorization' THEN 'direct'
        WHEN method = 'multicall3_aggregate3' THEN 'multicall'
        ELSE method
      END AS method
      , method AS raw_method
    FROM payment_observations
    ORDER BY observation_id
  `,
    )
    .all() as Array<{
    observation_id: number;
    tx_hash: string;
    chain_id: number;
    payer_wallet: string;
    recipient_wallet: string;
    relayer_wallet: string;
    token_address: string;
    amount_atomic: string;
    top_level_selector: string;
    method: string;
    raw_method: string;
  }>;

type FingerprintRecord = {
  fingerprint_type: string;
  fingerprint_value: string;
  confidence: number;
  provider_label: string | null;
  middleman_label: string | null;
  source_name: string | null;
};

const listFingerprints = (database: AppDatabase) =>
  database
    .prepare(
      `SELECT fingerprint_type, fingerprint_value, confidence, provider_label, middleman_label, source_name FROM known_fingerprints ORDER BY fingerprint_type, fingerprint_value`,
    )
    .all() as Array<FingerprintRecord>;

const normalize = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => ({
    fingerprintType: row.fingerprint_type as KnownFingerprint["fingerprintType"],
    fingerprintValue: row.fingerprint_value as KnownFingerprint["fingerprintValue"],
    confidence: Number(row.confidence),
    providerLabel: row.provider_label as string | null,
    middlemanLabel: row.middleman_label as string | null,
    sourceName: row.source_name as string | null,
  }));

const normalizeAddress = (value: string | null | undefined) => String(value ?? "").toLowerCase();
const normalizeNetwork = (value: string | null | undefined) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "base" || normalized === "base-mainnet" || normalized === "eip155:8453")
    return "base";
  return normalized;
};

const confidenceForClaim = (confidence: number, evidenceClass: string) => {
  if (evidenceClass === "catalog") return Math.min(confidence, 70);
  if (evidenceClass === "paid_probe") return Math.min(confidence, 95);
  return Math.min(confidence, 85);
};

const roleToCandidateType = (role: string): AttributionCandidateType | null => {
  if (role === "provider") return "provider_candidate";
  if (role === "service") return "service_candidate";
  if (role === "endpoint") return "endpoint_candidate";
  if (role === "middleman") return "middleman_candidate";
  if (role === "market") return "market_candidate";
  if (role === "facilitator") return "facilitator_candidate";
  if (role === "settlement_operator") return "settlement_operator_candidate";
  return null;
};

const listSettlementEvidence = (database: AppDatabase) =>
  database
    .prepare(
      `SELECT observation_id, evidence_type, raw_json FROM settlement_evidence ORDER BY observation_id, evidence_id`,
    )
    .all() as Array<{ observation_id: number; evidence_type: string; raw_json: string }>;

const evidenceTextFor = (evidenceByObservationId: Map<number, string[]>, observationId: number) =>
  (evidenceByObservationId.get(observationId) ?? []).join("\n").toLowerCase();

const packMatchesObservation = (
  pack: {
    method: string | null;
    top_level_to: string | null;
    top_level_selector: string;
    inner_selector: string | null;
  },
  observation: { raw_method: string; top_level_selector: string; observation_id: number },
  evidenceByObservationId: Map<number, string[]>,
) => {
  if (pack.method && pack.method !== observation.raw_method) return false;
  if (
    String(pack.top_level_selector).toLowerCase() !== observation.top_level_selector.toLowerCase()
  )
    return false;
  if (pack.top_level_to) {
    const normalizedTopLevelTo = pack.top_level_to.toLowerCase();
    if (
      observation.raw_method === "direct_transferWithAuthorization" &&
      normalizedTopLevelTo !== BASE_USDC_ADDRESS.toLowerCase()
    )
      return false;
    if (
      observation.raw_method === "multicall3_aggregate3" &&
      normalizedTopLevelTo !== MULTICALL3_ADDRESS.toLowerCase()
    )
      return false;
  }
  if (
    pack.inner_selector &&
    !evidenceTextFor(evidenceByObservationId, observation.observation_id).includes(
      pack.inner_selector.toLowerCase(),
    )
  )
    return false;
  return true;
};

type ObservationForScoring = ReturnType<typeof listObservations>[number];
type FingerprintForScoring = ReturnType<typeof normalize>[number];
type ProviderClaimForScoring = ReturnType<typeof listProviderEndpointClaims>[number] & {
  roles: string[];
  evidenceRefs: string[];
};
type SettlementPackForScoring = ReturnType<typeof listSettlementFingerprintPacks>[number] & {
  reasons: string[];
  evidenceRefs: string[];
};

type ScoredCandidate = {
  observationId: number;
  candidateType: AttributionCandidateType;
  matchedType: string;
  matchedValue: string;
  confidence: number;
  reasons: string[];
  evidenceRefs: string[];
  matchedClaimId?: string | null;
  matchedSettlementFingerprintId?: string | null;
  entityId?: string | null;
  role?: string | null;
};

export const scoreObservationCandidates = ({
  observation,
  recipientFingerprints,
  relayerFingerprints,
  providerClaims,
  settlementPacks,
  evidenceByObservationId,
}: {
  observation: ObservationForScoring;
  recipientFingerprints: FingerprintForScoring[];
  relayerFingerprints: FingerprintForScoring[];
  providerClaims: ProviderClaimForScoring[];
  settlementPacks: SettlementPackForScoring[];
  evidenceByObservationId: Map<number, string[]>;
}): ScoredCandidate[] => {
  const candidates: ScoredCandidate[] = [];
  const addCandidate = (candidate: ScoredCandidate) => candidates.push(candidate);

  const recipientMatch = recipientFingerprints.find(
    (entry) => entry.fingerprintValue.toLowerCase() === observation.recipient_wallet.toLowerCase(),
  );
  if (recipientMatch) {
    addCandidate({
      observationId: observation.observation_id,
      candidateType: "recipient_match",
      matchedType: recipientMatch.fingerprintType,
      matchedValue: recipientMatch.fingerprintValue,
      confidence: recipientMatch.confidence,
      reasons: [
        "recipient matches known recipient fingerprint",
        `providerLabel=${recipientMatch.providerLabel ?? "unlabeled"}`,
        `sourceName=${recipientMatch.sourceName ?? "unknown"}`,
      ],
      evidenceRefs: [
        `receipt:${observation.observation_id}:recipient`,
        `fingerprint:recipient:${recipientMatch.fingerprintValue.toLowerCase()}`,
      ],
    });
  }

  const relayerMatch = relayerFingerprints.find(
    (entry) => entry.fingerprintValue.toLowerCase() === observation.relayer_wallet.toLowerCase(),
  );
  if (relayerMatch) {
    addCandidate({
      observationId: observation.observation_id,
      candidateType: "relayer_match",
      matchedType: relayerMatch.fingerprintType,
      matchedValue: relayerMatch.fingerprintValue,
      confidence: relayerMatch.confidence,
      reasons: [
        "relayer matches known relayer fingerprint",
        `providerLabel=${relayerMatch.providerLabel ?? "unlabeled"}`,
        `middlemanLabel=${relayerMatch.middlemanLabel ?? "unlabeled"}`,
        `sourceName=${relayerMatch.sourceName ?? "unknown"}`,
      ],
      evidenceRefs: [
        `receipt:${observation.observation_id}:relayer`,
        `fingerprint:relayer:${relayerMatch.fingerprintValue.toLowerCase()}`,
      ],
    });
  }

  const matchedSettlementPacks = settlementPacks.filter((pack) =>
    packMatchesObservation(pack, observation, evidenceByObservationId),
  );

  for (const pack of matchedSettlementPacks) {
    addCandidate({
      observationId: observation.observation_id,
      candidateType: "settlement_cluster",
      matchedType: "settlement_fingerprint",
      matchedValue: pack.cluster_id,
      matchedSettlementFingerprintId: pack.fingerprint_id,
      entityId: pack.entity_id,
      confidence: pack.base_confidence,
      reasons: ["settlement evidence matches fingerprint pack", ...pack.reasons],
      evidenceRefs: [
        `receipt:${observation.observation_id}:settlement`,
        `settlement_fingerprint:${pack.fingerprint_id}`,
        ...pack.evidenceRefs,
      ],
    });
  }

  const matchedClaims = providerClaims.filter((claim) => {
    if (normalizeAddress(claim.pay_to_wallet) !== normalizeAddress(observation.recipient_wallet))
      return false;
    if (claim.tx_hash && normalizeAddress(claim.tx_hash) !== normalizeAddress(observation.tx_hash))
      return false;
    if (
      normalizeNetwork(claim.network) !== "base" ||
      observation.chain_id !== BASE_MAINNET_CHAIN_ID
    )
      return false;
    if (normalizeAddress(claim.asset_address) !== normalizeAddress(observation.token_address))
      return false;
    if (claim.amount_atomic && claim.amount_atomic !== observation.amount_atomic) return false;
    return true;
  });

  for (const claim of matchedClaims) {
    const isPayspongeHostJoined =
      String(claim.request_host ?? "").endsWith(PAYSPONGE_HOST_SUFFIX) && Boolean(claim.tx_hash);
    const matchedSettlementPack = matchedSettlementPacks[0];
    for (const role of claim.roles) {
      const candidateType = roleToCandidateType(role);
      if (!candidateType) continue;
      const needsSettlementJoin =
        claim.entity_id === "paysponge" &&
        ["middleman", "market", "facilitator", "settlement_operator"].includes(role);
      if (needsSettlementJoin && (!isPayspongeHostJoined || !matchedSettlementPack)) continue;
      const confidence = confidenceForClaim(claim.confidence, claim.evidence_class);
      const reasons = [
        `${role} claim matches observation recipient payTo`,
        `entityId=${claim.entity_id}`,
        `evidenceClass=${claim.evidence_class}`,
        `sourceName=${claim.source_name}`,
      ];
      if (claim.tx_hash) reasons.push("decoded payment response transaction matches observed tx");
      if (claim.request_host) reasons.push(`requestHost=${claim.request_host}`);
      if (needsSettlementJoin)
        reasons.push(`settlementCluster=${matchedSettlementPack.cluster_id}`);
      addCandidate({
        observationId: observation.observation_id,
        candidateType,
        matchedType: "provider_endpoint_claim",
        matchedValue: `${claim.claim_id}:${role}`,
        matchedClaimId: claim.claim_id,
        matchedSettlementFingerprintId: needsSettlementJoin
          ? matchedSettlementPack.fingerprint_id
          : null,
        entityId: claim.entity_id,
        role,
        confidence,
        reasons,
        evidenceRefs: [
          `receipt:${observation.observation_id}:recipient`,
          `claim:${claim.claim_id}`,
          ...(needsSettlementJoin
            ? [
                `settlement_fingerprint:${matchedSettlementPack.fingerprint_id}`,
                `receipt:${observation.observation_id}:settlement`,
              ]
            : []),
          ...claim.evidenceRefs,
        ],
      });
    }
  }

  return candidates;
};

export const buildAttributionCandidates = (database: AppDatabase = db) => {
  const now = nowIso();
  database.exec("DELETE FROM attribution_candidates;");

  const observations = listObservations(database);
  const fingerprints = normalize(listFingerprints(database));
  const providerClaims = listProviderEndpointClaims(database).map((claim) => ({
    ...claim,
    roles: JSON.parse(claim.roles_json) as string[],
    evidenceRefs: JSON.parse(claim.evidence_refs_json) as string[],
  }));
  const settlementPacks = listSettlementFingerprintPacks(database).map((pack) => ({
    ...pack,
    reasons: JSON.parse(pack.reasons_json) as string[],
    evidenceRefs: JSON.parse(pack.evidence_refs_json) as string[],
  }));
  const evidenceByObservationId = new Map<number, string[]>();
  for (const evidence of listSettlementEvidence(database)) {
    evidenceByObservationId.set(evidence.observation_id, [
      ...(evidenceByObservationId.get(evidence.observation_id) ?? []),
      evidence.raw_json,
    ]);
  }

  const recipientFingerprints = fingerprints.filter((item) => item.fingerprintType === "recipient");
  const relayerFingerprints = fingerprints.filter((item) => item.fingerprintType === "relayer");

  const insertCandidate = database.prepare(`
    INSERT INTO attribution_candidates (
      observation_id,
      candidate_type,
      matched_fingerprint_type,
      matched_fingerprint_value,
      confidence,
      reasons_json,
      evidence_refs_json,
      matched_claim_id,
      matched_settlement_fingerprint_id,
      entity_id,
      role,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(observation_id, candidate_type, matched_fingerprint_value) DO UPDATE SET
      confidence = excluded.confidence,
      reasons_json = excluded.reasons_json,
      evidence_refs_json = excluded.evidence_refs_json,
      matched_claim_id = excluded.matched_claim_id,
      matched_settlement_fingerprint_id = excluded.matched_settlement_fingerprint_id,
      entity_id = excluded.entity_id,
      role = excluded.role,
      updated_at = excluded.updated_at
  `);

  const upserted = [] as AttributionCandidate[];

  const writeCandidate = (input: {
    observationId: number;
    candidateType: AttributionCandidateType;
    matchedType: string;
    matchedValue: string;
    confidence: number;
    reasons: string[];
    evidenceRefs: string[];
    matchedClaimId?: string | null;
    matchedSettlementFingerprintId?: string | null;
    entityId?: string | null;
    role?: string | null;
  }) => {
    insertCandidate.run(
      input.observationId,
      input.candidateType,
      input.matchedType,
      input.matchedValue,
      Math.min(100, input.confidence),
      JSON.stringify(input.reasons),
      JSON.stringify(input.evidenceRefs),
      input.matchedClaimId ?? null,
      input.matchedSettlementFingerprintId ?? null,
      input.entityId ?? null,
      input.role ?? null,
      now,
      now,
    );
    upserted.push({
      candidateType: input.candidateType,
      observationId: input.observationId,
      matchedFingerprintType: input.matchedType,
      matchedValue: input.matchedValue,
      confidence: Math.min(100, input.confidence),
      reasons: input.reasons,
      evidenceRefs: input.evidenceRefs,
    });
  };

  for (const observation of observations) {
    for (const candidate of scoreObservationCandidates({
      observation,
      recipientFingerprints,
      relayerFingerprints,
      providerClaims,
      settlementPacks,
      evidenceByObservationId,
    })) {
      writeCandidate(candidate);
    }
  }

  return {
    candidateCount: upserted.length,
    observationCount: observations.length,
  };
};
