import type {
  AttributionCandidateRow,
  DailyMetricRow,
  PaymentObservationRow,
  WalletProfileRow,
} from "../aggregates/summaries";
import type { WalletUsageGraph } from "../attribution/wallet-graph";

export type PaymentObservationDto = {
  observationId: number;
  chainId: number;
  txHash: string;
  blockNumber: number;
  blockTimestamp: number;
  relayerWallet: string;
  payerWallet: string;
  recipientWallet: string;
  tokenAddress: string;
  amountAtomic: string;
  method: string;
  topLevelSelector: string;
  caseId: string;
  stableHash: string;
};

export type AttributionCandidateDto = {
  candidateId: number;
  observationId: number;
  candidateType: string;
  matchedFingerprintType: string;
  matchedFingerprintValue: string;
  matchedClaimId: string | null;
  matchedSettlementFingerprintId: string | null;
  entityId: string | null;
  role: string | null;
  confidence: number;
  reasons: string[];
  evidenceRefs: string[];
  createdAt: string;
  updatedAt: string;
};

export type DailyMetricDto = {
  day: string;
  observationCount: number;
  candidateCount: number;
  uniquePayers: number;
  uniqueRecipients: number;
  uniqueRelayers: number;
  totalAmountAtomic: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletProfileDto = {
  wallet: string;
  observationCount: number;
  totalAmountAtomic: string;
  firstSeenAt: number;
  lastSeenAt: number;
  uniqueRecipients?: number;
  uniqueRelayers?: number;
  uniquePayers?: number;
};

export type ReportSummaryDto = {
  generatedAt: string;
  counts: {
    observations: number;
    attributionCandidates: number;
    dailyMetrics: number;
    payerWalletProfiles: number;
    recipientSummaries: number;
    relayerSummaries: number;
    walletUsageGraphProviderWallets: number;
  };
  scopeNote: string;
  observations: PaymentObservationDto[];
  attributionCandidates: AttributionCandidateDto[];
  dailyMetrics: DailyMetricDto[];
  payerWalletProfiles: WalletProfileDto[];
  recipientSummaries: WalletProfileDto[];
  relayerSummaries: WalletProfileDto[];
  walletUsageGraph: WalletUsageGraph;
};

const parseStringArray = (value: string): string[] => JSON.parse(value) as string[];

export const toPaymentObservationDto = (row: PaymentObservationRow): PaymentObservationDto => ({
  observationId: row.observation_id,
  chainId: row.chain_id,
  txHash: row.tx_hash,
  blockNumber: row.block_number,
  blockTimestamp: row.block_timestamp,
  relayerWallet: row.relayer_wallet,
  payerWallet: row.payer_wallet,
  recipientWallet: row.recipient_wallet,
  tokenAddress: row.token_address,
  amountAtomic: row.amount_atomic,
  method: row.method,
  topLevelSelector: row.top_level_selector,
  caseId: row.case_id,
  stableHash: row.stable_hash,
});

export const toAttributionCandidateDto = (
  row: AttributionCandidateRow,
): AttributionCandidateDto => ({
  candidateId: row.candidate_id,
  observationId: row.observation_id,
  candidateType: row.candidate_type,
  matchedFingerprintType: row.matched_fingerprint_type,
  matchedFingerprintValue: row.matched_fingerprint_value,
  matchedClaimId: row.matched_claim_id,
  matchedSettlementFingerprintId: row.matched_settlement_fingerprint_id,
  entityId: row.entity_id,
  role: row.role,
  confidence: row.confidence,
  reasons: parseStringArray(row.reasons_json),
  evidenceRefs: parseStringArray(row.evidence_refs_json),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toDailyMetricDto = (row: DailyMetricRow): DailyMetricDto => ({
  day: row.day,
  observationCount: row.observation_count,
  candidateCount: row.candidate_count,
  uniquePayers: row.unique_payers,
  uniqueRecipients: row.unique_recipients,
  uniqueRelayers: row.unique_relayers,
  totalAmountAtomic: row.total_amount_atomic,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toWalletProfileDto = (row: WalletProfileRow): WalletProfileDto => ({
  wallet: row.wallet,
  observationCount: row.observation_count,
  totalAmountAtomic: row.total_amount_atomic,
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  uniqueRecipients: row.unique_recipients,
  uniqueRelayers: row.unique_relayers,
  uniquePayers: row.unique_payers,
});
