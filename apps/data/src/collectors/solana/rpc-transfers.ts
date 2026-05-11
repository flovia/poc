import { normalizeHttpsUrl, postJsonRpc } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  CollectTransfersInput,
  CollectTransfersResult,
  CollectorServiceId,
  CollectorTarget,
  NormalizedCollectorTransfer,
  TransferCollector,
} from "../types.js";

type SolanaSignatureInfo = {
  signature: string;
  slot?: number;
  err?: unknown;
  blockTime?: number;
};

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount?: {
    amount?: string;
    decimals?: number;
  };
};

type SolanaTransaction = {
  slot?: number;
  blockTime?: number;
  transaction?: {
    signatures?: string[];
    message?: {
      accountKeys?: unknown[];
    };
  };
  meta?: {
    err?: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  };
};

type JsonRpcResult<T> = { result?: T };

export type SolanaRpcTransferCollectorOptions = {
  source: Extract<CollectorServiceId, "alchemy" | "rpc-fast">;
  endpoint: string;
  fetch?: FetchLike;
  headers?: HeadersInit;
};

export function createSolanaRpcTransferCollector(
  options: SolanaRpcTransferCollectorOptions,
): TransferCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = normalizeHttpsUrl(options.endpoint);
  return {
    source: options.source,
    supportedChains: ["solana"],
    async collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult> {
      if (input.window.chain !== "solana")
        throw new Error("Solana RPC collector requires solana window");
      const transfers: NormalizedCollectorTransfer[] = [];
      const warnings: string[] = [];
      let rawRequestCount = 0;
      const seen: SolanaSignatureInfo[] = [];

      for (const target of input.targets) {
        if (target.chain !== "solana") continue;
        const signatures = await getSignatures(fetchImpl, endpoint, options.headers, target, input);
        rawRequestCount += 1;
        seen.push(...signatures);
        for (const signature of signatures) {
          const transaction = await getTransaction(
            fetchImpl,
            endpoint,
            options.headers,
            signature.signature,
          );
          rawRequestCount += 1;
          if (!transaction) {
            warnings.push(`transaction not found: ${signature.signature}`);
            continue;
          }
          transfers.push(
            ...normalizeSolanaTransaction(options.source, target, signature, transaction),
          );
        }
      }

      const slots = seen.flatMap((signature) =>
        signature.slot === undefined ? [] : [BigInt(signature.slot)],
      );
      const nextCursor = seen[0]
        ? {
            source: options.source,
            chain: "solana" as const,
            newestSeenSignature: seen[0]?.signature,
            oldestSeenSignature: seen.at(-1)?.signature,
            ...(slots[0] !== undefined ? { newestSeenSlot: slots[0] } : {}),
            ...(slots.at(-1) !== undefined ? { oldestSeenSlot: slots.at(-1) } : {}),
          }
        : undefined;

      return {
        source: options.source,
        transfers,
        ...(nextCursor ? { nextCursor } : {}),
        rawRequestCount,
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    },
  };
}

async function getSignatures(
  fetchImpl: FetchLike,
  endpoint: string,
  headers: HeadersInit | undefined,
  target: CollectorTarget,
  input: CollectTransfersInput,
): Promise<SolanaSignatureInfo[]> {
  const cursor = input.cursor?.chain === "solana" ? input.cursor : undefined;
  const response = (await postJsonRpc(
    fetchImpl,
    endpoint,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "getSignaturesForAddress",
      params: [
        target.address,
        {
          commitment: "finalized",
          limit: input.limit ?? 100,
          ...(input.window.chain === "solana" && input.window.beforeSignature
            ? { before: input.window.beforeSignature }
            : {}),
          ...(input.window.chain === "solana" && input.window.untilSignature
            ? { until: input.window.untilSignature }
            : {}),
          ...(cursor && "oldestSeenSignature" in cursor && cursor.oldestSeenSignature
            ? { before: cursor.oldestSeenSignature }
            : {}),
        },
      ],
    },
    headers,
  )) as JsonRpcResult<SolanaSignatureInfo[]>;
  return response.result ?? [];
}

async function getTransaction(
  fetchImpl: FetchLike,
  endpoint: string,
  headers: HeadersInit | undefined,
  signature: string,
): Promise<SolanaTransaction | undefined> {
  const response = (await postJsonRpc(
    fetchImpl,
    endpoint,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "getTransaction",
      params: [
        signature,
        { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 0 },
      ],
    },
    headers,
  )) as JsonRpcResult<SolanaTransaction | null>;
  return response.result ?? undefined;
}

function normalizeSolanaTransaction(
  source: Extract<CollectorServiceId, "alchemy" | "rpc-fast">,
  target: CollectorTarget,
  signatureInfo: SolanaSignatureInfo,
  transaction: SolanaTransaction,
): NormalizedCollectorTransfer[] {
  const accountKeys = (transaction.transaction?.message?.accountKeys ?? []).map(accountKeyToString);
  const signature = transaction.transaction?.signatures?.[0] ?? signatureInfo.signature;
  const preBalances = balancesByAccountIndex(transaction.meta?.preTokenBalances ?? []);
  const postBalances = balancesByAccountIndex(transaction.meta?.postTokenBalances ?? []);
  const accountIndex = accountKeys.findIndex((account) => account === target.address);
  const indexes =
    accountIndex >= 0
      ? [accountIndex]
      : [...new Set([...preBalances.keys(), ...postBalances.keys()])];
  const transfers: NormalizedCollectorTransfer[] = [];

  for (const index of indexes) {
    const pre = preBalances.get(index);
    const post = postBalances.get(index);
    const mint = post?.mint ?? pre?.mint;
    if (!mint || (target.assetAddress && mint !== target.assetAddress)) continue;
    const before = BigInt(pre?.uiTokenAmount?.amount ?? "0");
    const after = BigInt(post?.uiTokenAmount?.amount ?? "0");
    const delta = after - before;
    if (delta === 0n) continue;
    const account = accountKeys[index] ?? target.address;
    transfers.push({
      source,
      chain: "solana",
      queryTarget: target,
      idempotencyKey: `${source}:solana:${signature}:${index}:${mint}`,
      transactionHash: signature,
      signature,
      ...(transaction.slot !== undefined ? { slot: BigInt(transaction.slot) } : {}),
      ...(transaction.blockTime !== undefined
        ? { timestamp: new Date(transaction.blockTime * 1000).toISOString() }
        : {}),
      success: transaction.meta?.err == null,
      ...(delta > 0n ? { toAddress: account, direction: "incoming" as const } : {}),
      ...(delta < 0n ? { fromAddress: account, direction: "outgoing" as const } : {}),
      assetAddress: mint,
      amountBaseUnits: absolute(delta).toString(),
      instructionIndex: index,
      rawPayload: transaction,
    });
  }

  return transfers;
}

function balancesByAccountIndex(balances: readonly TokenBalance[]): Map<number, TokenBalance> {
  return new Map(balances.map((balance) => [balance.accountIndex, balance]));
}

function accountKeyToString(accountKey: unknown): string {
  if (typeof accountKey === "string") return accountKey;
  if (typeof accountKey === "object" && accountKey !== null && "pubkey" in accountKey) {
    return String((accountKey as { pubkey: unknown }).pubkey);
  }
  return String(accountKey);
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}
