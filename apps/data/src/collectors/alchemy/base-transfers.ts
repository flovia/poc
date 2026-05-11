import { postJsonRpc } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  CollectTransfersInput,
  CollectTransfersResult,
  CollectorCursor,
  CollectorTarget,
  NormalizedCollectorTransfer,
  TransferCollector,
} from "../types.js";

type AlchemyTransfer = {
  uniqueId?: string;
  hash?: string;
  blockNum?: string;
  from?: string;
  to?: string;
  value?: number | string | null;
  asset?: string;
  rawContract?: {
    address?: string;
    value?: string | null;
    decimal?: string | null;
  };
  metadata?: {
    blockTimestamp?: string;
  };
};

type AlchemyTransfersPayload = {
  result?: {
    transfers?: AlchemyTransfer[];
    pageKey?: string;
  };
};

export type AlchemyBaseTransfersCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createAlchemyBaseTransfersCollector(
  options: AlchemyBaseTransfersCollectorOptions,
): TransferCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? `https://base-mainnet.g.alchemy.com/v2/${options.apiKey}`;
  return {
    source: "alchemy",
    supportedChains: ["base"],
    async collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult> {
      if (input.window.chain !== "base")
        throw new Error("Alchemy Base collector requires base window");
      const transfers: NormalizedCollectorTransfer[] = [];
      let pageKey: string | undefined;
      let requestCount = 0;

      for (const target of input.targets) {
        if (target.chain !== "base") continue;
        const response = (await postJsonRpc(fetchImpl, endpoint, {
          jsonrpc: "2.0",
          id: requestCount + 1,
          method: "alchemy_getAssetTransfers",
          params: [buildParams(input, target)],
        })) as AlchemyTransfersPayload;
        requestCount += 1;
        pageKey = response.result?.pageKey ?? pageKey;
        for (const transfer of response.result?.transfers ?? []) {
          transfers.push(normalizeAlchemyTransfer(target, transfer));
        }
      }

      return {
        source: "alchemy",
        transfers,
        ...(pageKey ? { nextCursor: { source: "alchemy", chain: "base", pageKey } } : {}),
        rawRequestCount: requestCount,
      };
    },
  };
}

function buildParams(
  input: CollectTransfersInput,
  target: CollectorTarget,
): Record<string, unknown> {
  const cursor =
    input.cursor?.source === "alchemy" && input.cursor.chain === "base" ? input.cursor : undefined;
  return {
    fromBlock: toHex(input.window.chain === "base" ? input.window.fromBlock : 0n),
    toBlock:
      input.window.chain === "base" && input.window.toBlock !== "latest"
        ? toHex(input.window.toBlock)
        : "latest",
    toAddress: target.address,
    ...(target.assetAddress ? { contractAddresses: [target.assetAddress] } : {}),
    category: ["erc20"],
    excludeZeroValue: true,
    maxCount: toHex(BigInt(input.limit ?? 100)),
    order: "asc",
    ...(cursor?.pageKey ? { pageKey: cursor.pageKey } : {}),
  };
}

function normalizeAlchemyTransfer(
  target: CollectorTarget,
  transfer: AlchemyTransfer,
): NormalizedCollectorTransfer {
  const transactionHash = required(transfer.hash, "Alchemy transfer hash");
  const uniqueId = transfer.uniqueId ?? `${transactionHash}:${transfer.rawContract?.address ?? ""}`;
  const toAddress = transfer.to;
  return {
    source: "alchemy",
    chain: "base",
    queryTarget: target,
    idempotencyKey: `alchemy:base:${uniqueId}`,
    transactionHash,
    ...(transfer.blockNum ? { blockNumber: BigInt(transfer.blockNum) } : {}),
    ...(transfer.metadata?.blockTimestamp ? { timestamp: transfer.metadata.blockTimestamp } : {}),
    ...(transfer.from ? { fromAddress: transfer.from } : {}),
    ...(toAddress ? { toAddress } : {}),
    direction: sameAddress(toAddress, target.address) ? "incoming" : "unknown",
    ...(transfer.rawContract?.address ? { assetAddress: transfer.rawContract.address } : {}),
    ...(transfer.asset ? { assetSymbol: transfer.asset } : {}),
    amountBaseUnits: amountBaseUnits(transfer),
    rawPayload: transfer,
  };
}

function amountBaseUnits(transfer: AlchemyTransfer): string {
  const rawValue = transfer.rawContract?.value;
  if (rawValue?.startsWith("0x")) return BigInt(rawValue).toString();
  if (rawValue) return rawValue;
  return transfer.value?.toString() ?? "0";
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

function sameAddress(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}
