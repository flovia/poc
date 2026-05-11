import type {
  CollectorServiceId,
  NormalizedCollectorBalance,
  NormalizedCollectorTransfer,
  SupportedChain,
} from "../collectors/types.js";

export type ProviderEnrichmentTarget = {
  providerId: string;
  chain: SupportedChain;
  asset: string;
  payToAddress: string;
  receiveTokenAccount?: string;
  tokenMintAddress?: string;
};

export type ProviderEnrichmentTransferSummary = {
  source: CollectorServiceId;
  signature?: string;
  transactionHash: string;
  blockNumber?: string;
  slot?: string;
  timestamp?: string;
  direction?: "incoming" | "outgoing" | "unknown";
  amountBaseUnits: string;
  assetAddress?: string;
  assetSymbol?: string;
};

export type ProviderEnrichmentBalanceSummary = {
  source: CollectorServiceId;
  walletAddress: string;
  assetAddress: string;
  assetSymbol?: string;
  assetName?: string;
  amountBaseUnits: string;
  decimals?: number;
  valueUsd?: number;
};

export type ProviderEnrichmentSnapshot = {
  target: ProviderEnrichmentTarget;
  latestTransfer?: ProviderEnrichmentTransferSummary;
  balances: ProviderEnrichmentBalanceSummary[];
  provenance: {
    enrichedAt: string;
    sources: CollectorServiceId[];
  };
};

export type BuildProviderEnrichmentSnapshotInput = {
  target: ProviderEnrichmentTarget;
  latestTransfer?: NormalizedCollectorTransfer;
  balances: readonly NormalizedCollectorBalance[];
  enrichedAt?: string;
};

export function buildProviderEnrichmentSnapshot(
  input: BuildProviderEnrichmentSnapshotInput,
): ProviderEnrichmentSnapshot {
  const balances = input.balances.map(toBalanceSummary);
  const latestTransfer = input.latestTransfer ? toTransferSummary(input.latestTransfer) : undefined;
  return {
    target: input.target,
    ...(latestTransfer ? { latestTransfer } : {}),
    balances,
    provenance: {
      enrichedAt: input.enrichedAt ?? new Date().toISOString(),
      sources: uniqueSources([
        ...(input.latestTransfer ? [input.latestTransfer.source] : []),
        ...balances.map((balance) => balance.source),
      ]),
    },
  };
}

function toTransferSummary(
  transfer: NormalizedCollectorTransfer,
): ProviderEnrichmentTransferSummary {
  return {
    source: transfer.source,
    ...(transfer.signature ? { signature: transfer.signature } : {}),
    transactionHash: transfer.transactionHash,
    ...(transfer.blockNumber !== undefined ? { blockNumber: transfer.blockNumber.toString() } : {}),
    ...(transfer.slot !== undefined ? { slot: transfer.slot.toString() } : {}),
    ...(transfer.timestamp ? { timestamp: transfer.timestamp } : {}),
    ...(transfer.direction ? { direction: transfer.direction } : {}),
    amountBaseUnits: transfer.amountBaseUnits,
    ...(transfer.assetAddress ? { assetAddress: transfer.assetAddress } : {}),
    ...(transfer.assetSymbol ? { assetSymbol: transfer.assetSymbol } : {}),
  };
}

function toBalanceSummary(balance: NormalizedCollectorBalance): ProviderEnrichmentBalanceSummary {
  return {
    source: balance.source,
    walletAddress: balance.walletAddress,
    assetAddress: balance.assetAddress,
    ...(balance.assetSymbol ? { assetSymbol: balance.assetSymbol } : {}),
    ...(balance.assetName ? { assetName: balance.assetName } : {}),
    amountBaseUnits: balance.amountBaseUnits,
    ...(balance.decimals !== undefined ? { decimals: balance.decimals } : {}),
    ...(balance.valueUsd !== undefined ? { valueUsd: balance.valueUsd } : {}),
  };
}

function uniqueSources(sources: readonly CollectorServiceId[]): CollectorServiceId[] {
  return [...new Set(sources)];
}
