import { db } from "../db";

type PaymentObservationRow = {
  observation_id: number;
  chain_id: number;
  tx_hash: string;
  tx_index: number;
  block_number: number;
  block_timestamp: number;
  relayer_wallet: string;
  payer_wallet: string;
  recipient_wallet: string;
  token_address: string;
  amount_atomic: string;
  method: string;
  top_level_selector: string;
  case_id: string;
  stable_hash: string;
};

type AttributionCandidateRow = {
  candidate_id: number;
  observation_id: number;
  candidate_type: string;
  matched_fingerprint_type: string;
  matched_fingerprint_value: string;
  matched_claim_id: string | null;
  matched_settlement_fingerprint_id: string | null;
  entity_id: string | null;
  role: string | null;
  confidence: number;
  reasons_json: string;
  evidence_refs_json: string;
  created_at: string;
  updated_at: string;
};

type DailyMetricRow = {
  day: string;
  observation_count: number;
  candidate_count: number;
  unique_payers: number;
  unique_recipients: number;
  unique_relayers: number;
  total_amount_atomic: string;
  created_at: string;
  updated_at: string;
};

type WalletProfileRow = {
  wallet: string;
  observation_count: number;
  total_amount_atomic: string;
  first_seen_at: number;
  last_seen_at: number;
  unique_recipients: number;
  unique_relayers: number;
  unique_payers?: number;
};

export const listPaymentObservations = () =>
  db
    .prepare(
      `
    SELECT
      observation_id,
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
      stable_hash
    FROM payment_observations
    ORDER BY block_timestamp, observation_id
  `,
    )
    .all() as Array<PaymentObservationRow>;

export const listAttributionCandidates = () =>
  db
    .prepare(
      `
    SELECT
      candidate_id,
      observation_id,
      candidate_type,
      matched_fingerprint_type,
      matched_fingerprint_value,
      matched_claim_id,
      matched_settlement_fingerprint_id,
      entity_id,
      role,
      confidence,
      reasons_json,
      evidence_refs_json,
      created_at,
      updated_at
    FROM attribution_candidates
    ORDER BY observation_id, candidate_type, matched_fingerprint_value
  `,
    )
    .all() as Array<AttributionCandidateRow>;

export const listDailyMetrics = () =>
  db
    .prepare(
      `
    SELECT
      day,
      observation_count,
      candidate_count,
      unique_payers,
      unique_recipients,
      unique_relayers,
      total_amount_atomic,
      created_at,
      updated_at
    FROM daily_metrics
    ORDER BY day
  `,
    )
    .all() as Array<DailyMetricRow>;

export const listPayerProfiles = () =>
  db
    .prepare(
      `
    SELECT
      wallet,
      observation_count,
      total_amount_atomic,
      unique_recipients,
      unique_relayers,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM payer_wallet_profiles
    ORDER BY observation_count DESC
  `,
    )
    .all() as Array<WalletProfileRow>;

export const listRecipientSummaries = () =>
  db
    .prepare(
      `
    SELECT
      wallet,
      observation_count,
      total_amount_atomic,
      unique_payers,
      unique_relayers,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM recipient_summaries
    ORDER BY observation_count DESC
  `,
    )
    .all() as Array<WalletProfileRow>;

export const listRelayerSummaries = () =>
  db
    .prepare(
      `
    SELECT
      wallet,
      observation_count,
      total_amount_atomic,
      unique_payers,
      unique_recipients,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM relayer_summaries
    ORDER BY observation_count DESC
  `,
    )
    .all() as Array<WalletProfileRow>;
