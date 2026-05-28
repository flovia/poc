import { postJsonRpc } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  CollectTransfersInput,
  CollectTransfersResult,
  CollectorTarget,
  NormalizedCollectorTransfer,
  TransferCollector,
} from "../types.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type EvmLog = {
  address?: string;
  blockNumber?: string;
  blockHash?: string;
  transactionHash?: string;
  logIndex?: string;
  data?: string;
  topics?: string[];
};

type JsonRpcResult<T> = { result?: T };

export type EvmErc20TransfersCollectorOptions = {
  source: "tempo-rpc";
  chain: "tempo";
  endpoint: string;
  fetch?: FetchLike;
  maxBlockRange?: bigint;
};

export function createEvmErc20TransfersCollector(
  options: EvmErc20TransfersCollectorOptions,
): TransferCollector {
  const fetchImpl = options.fetch ?? fetch;
  const maxBlockRange = options.maxBlockRange ?? 100_000n;
  return {
    source: options.source,
    supportedChains: [options.chain],
    async collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult> {
      if (input.window.chain !== options.chain) {
        throw new Error(`${options.chain} ERC-20 collector requires ${options.chain} window`);
      }
      const latest =
        input.window.toBlock === "latest"
          ? BigInt(await rpc<string>(fetchImpl, options.endpoint, "eth_blockNumber", []))
          : input.window.toBlock;
      const transfers: NormalizedCollectorTransfer[] = [];
      const warnings: string[] = [];
      const blockTimestampCache = new Map<string, string>();
      let requestCount = input.window.toBlock === "latest" ? 1 : 0;

      for (const target of input.targets) {
        if (target.chain !== options.chain) continue;
        const tokenAddress = target.assetAddress;
        if (!tokenAddress) {
          warnings.push(`skipped ${target.address}: missing assetAddress`);
          continue;
        }
        for (let from = input.window.fromBlock; from <= latest; from += maxBlockRange) {
          const to = minBigInt(latest, from + maxBlockRange - 1n);
          const logs = await rpc<EvmLog[]>(fetchImpl, options.endpoint, "eth_getLogs", [
            {
              fromBlock: toHex(from),
              toBlock: toHex(to),
              address: tokenAddress,
              topics: [TRANSFER_TOPIC, null, addressTopic(target.address)],
            },
          ]);
          requestCount += 1;
          for (const log of logs) {
            transfers.push(
              normalizeEvmLog(options, target, log, {
                timestamp: await getBlockTimestamp(
                  fetchImpl,
                  options.endpoint,
                  log,
                  blockTimestampCache,
                ),
              }),
            );
            requestCount += 1;
          }
        }
      }

      return { source: options.source, transfers, rawRequestCount: requestCount, warnings };
    },
  };
}

async function rpc<T>(
  fetchImpl: FetchLike,
  endpoint: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const response = (await postJsonRpc(fetchImpl, endpoint, {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  })) as JsonRpcResult<T>;
  return required(response.result, `${method} result`);
}

function normalizeEvmLog(
  options: Pick<EvmErc20TransfersCollectorOptions, "source" | "chain">,
  target: CollectorTarget,
  log: EvmLog,
  block: { timestamp: string },
): NormalizedCollectorTransfer {
  const transactionHash = required(log.transactionHash, "transactionHash");
  const logIndex = Number.parseInt(required(log.logIndex, "logIndex"), 16);
  const topics = log.topics ?? [];
  const fromAddress = topicAddress(required(topics[1], "from topic"));
  const toAddress = topicAddress(required(topics[2], "to topic"));
  return {
    source: options.source,
    chain: options.chain,
    queryTarget: target,
    idempotencyKey: `${options.source}:${options.chain}:${transactionHash}:${logIndex}`,
    transactionHash,
    blockNumber: BigInt(required(log.blockNumber, "blockNumber")),
    timestamp: block.timestamp,
    ...(log.blockHash ? { blockHash: log.blockHash } : {}),
    fromAddress,
    toAddress,
    direction: sameAddress(toAddress, target.address) ? "incoming" : "unknown",
    assetAddress: log.address ?? target.assetAddress,
    amountBaseUnits: BigInt(required(log.data, "data")).toString(),
    logIndex,
    rawPayload: log,
  };
}

async function getBlockTimestamp(
  fetchImpl: FetchLike,
  endpoint: string,
  log: EvmLog,
  cache: Map<string, string>,
): Promise<string> {
  const blockNumber = required(log.blockNumber, "blockNumber");
  const cached = cache.get(blockNumber);
  if (cached) return cached;
  const block = await rpc<{ timestamp?: string }>(fetchImpl, endpoint, "eth_getBlockByNumber", [
    blockNumber,
    false,
  ]);
  const timestamp = new Date(
    Number.parseInt(required(block.timestamp, "block timestamp"), 16) * 1000,
  ).toISOString();
  cache.set(blockNumber, timestamp);
  return timestamp;
}

function addressTopic(address: string): string {
  return `0x${"0".repeat(24)}${address.toLowerCase().replace(/^0x/, "")}`;
}

function topicAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function minBigInt(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}

function sameAddress(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === undefined || value === null || value === "") throw new Error(`Missing ${label}`);
  return value;
}
