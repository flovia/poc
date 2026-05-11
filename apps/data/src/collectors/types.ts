export type CollectorServiceId = "alchemy" | "rpc-fast" | "dune-sim" | "goldrush";

export type SupportedChain = "base" | "solana";

export type CollectorTarget = {
  chain: SupportedChain;
  /** Provider payment recipient, token account, or other service-specific query anchor. */
  address: string;
  /** Optional token contract or mint. Base USDC and Solana USDC are expected first. */
  assetAddress?: string;
  providerId?: string;
  endpointId?: string;
};

export type CollectorWindow =
  | {
      chain: "base";
      fromBlock: bigint;
      toBlock: bigint | "latest";
    }
  | {
      chain: "solana";
      fromSlot?: bigint;
      toSlot?: bigint;
      beforeSignature?: string;
      untilSignature?: string;
    };

export type CollectorCursor =
  | {
      source: "alchemy";
      chain: "base";
      /** Short-lived Alchemy Transfers API page key. Do not persist as a long-term checkpoint. */
      pageKey?: string;
      lastProcessedBlock?: bigint;
    }
  | {
      source: "rpc-fast" | "alchemy";
      chain: "solana";
      newestSeenSignature?: string;
      oldestSeenSignature?: string;
      newestSeenSlot?: bigint;
      oldestSeenSlot?: bigint;
    }
  | {
      source: "dune-sim";
      chain: SupportedChain;
      /** Dune Sim returned offset. Do not construct manually. */
      nextOffset?: string;
    }
  | {
      source: "goldrush";
      chain: SupportedChain;
      pageNumber?: number;
      hasMore?: boolean;
    };

export type NormalizedCollectorTransfer = {
  source: CollectorServiceId;
  chain: SupportedChain;
  queryTarget: CollectorTarget;
  /** Stable source-local idempotency key for upserts. */
  idempotencyKey: string;
  transactionHash: string;
  /** Solana alias for transactionHash when the source uses signatures. */
  signature?: string;
  blockNumber?: bigint;
  blockHash?: string;
  slot?: bigint;
  timestamp?: string;
  success?: boolean;
  fromAddress?: string;
  toAddress?: string;
  direction?: "incoming" | "outgoing" | "unknown";
  assetAddress?: string;
  assetSymbol?: string;
  amountBaseUnits: string;
  logIndex?: number;
  instructionIndex?: number;
  innerInstructionIndex?: number;
  rawPayload: unknown;
};

export type CollectTransfersInput = {
  targets: readonly CollectorTarget[];
  window: CollectorWindow;
  limit?: number;
  cursor?: CollectorCursor;
};

export type CollectTransfersResult = {
  source: CollectorServiceId;
  transfers: NormalizedCollectorTransfer[];
  nextCursor?: CollectorCursor;
  rawRequestCount: number;
  warnings?: string[];
};

export type NormalizedCollectorBalance = {
  source: CollectorServiceId;
  chain: SupportedChain;
  queryTarget: CollectorTarget;
  walletAddress: string;
  assetAddress: string;
  assetSymbol?: string;
  assetName?: string;
  amountBaseUnits: string;
  decimals?: number;
  valueUsd?: number;
  rawPayload: unknown;
};

export type CollectBalancesInput = {
  targets: readonly CollectorTarget[];
  limit?: number;
  cursor?: CollectorCursor;
};

export type CollectBalancesResult = {
  source: CollectorServiceId;
  balances: NormalizedCollectorBalance[];
  nextCursor?: CollectorCursor;
  rawRequestCount: number;
  warnings?: string[];
};

export interface TransferCollector {
  readonly source: CollectorServiceId;
  readonly supportedChains: readonly SupportedChain[];
  collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult>;
}

export interface BalanceCollector {
  readonly source: CollectorServiceId;
  readonly supportedChains: readonly SupportedChain[];
  collectBalances(input: CollectBalancesInput): Promise<CollectBalancesResult>;
}

export function normalizeCollectorTransferAmount(amount: bigint | number | string): string {
  return amount.toString();
}
