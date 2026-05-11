import { getJson } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  CollectTransfersInput,
  CollectTransfersResult,
  CollectorTarget,
  NormalizedCollectorTransfer,
  TransferCollector,
} from "../types.js";

type GoldRushTransfer = {
  from_address?: string;
  to_address?: string;
  contract_address?: string;
  contract_ticker_symbol?: string;
  delta?: string;
};

type GoldRushItem = {
  tx_hash?: string;
  block_height?: number | string;
  block_hash?: string;
  block_signed_at?: string;
  successful?: boolean;
  transfers?: GoldRushTransfer[];
};

type GoldRushResponse = {
  data?: {
    items?: GoldRushItem[];
    pagination?: {
      has_more?: boolean;
      page_number?: number;
    };
  };
  error?: boolean;
  error_message?: string | null;
};

export type GoldRushBaseTransfersCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createGoldRushBaseTransfersCollector(
  options: GoldRushBaseTransfersCollectorOptions,
): TransferCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.covalenthq.com";
  return {
    source: "goldrush",
    supportedChains: ["base"],
    async collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult> {
      if (input.window.chain !== "base")
        throw new Error("GoldRush Base collector requires base window");
      const transfers: NormalizedCollectorTransfer[] = [];
      let hasMore = false;
      let pageNumber: number | undefined;
      let requestCount = 0;

      for (const target of input.targets) {
        if (target.chain !== "base") continue;
        const response = (await getJson(fetchImpl, buildUrl(endpoint, target, input), {
          authorization: `Bearer ${options.apiKey}`,
        })) as GoldRushResponse;
        requestCount += 1;
        if (response.error) throw new Error(response.error_message ?? "GoldRush request failed");
        hasMore = response.data?.pagination?.has_more ?? hasMore;
        pageNumber = response.data?.pagination?.page_number ?? pageNumber;
        response.data?.items?.forEach((item) => {
          transfers.push(...normalizeGoldRushItem(target, item));
        });
      }

      return {
        source: "goldrush",
        transfers,
        ...(hasMore
          ? {
              nextCursor: {
                source: "goldrush",
                chain: "base",
                pageNumber: (pageNumber ?? 0) + 1,
                hasMore,
              },
            }
          : {}),
        rawRequestCount: requestCount,
      };
    },
  };
}

function buildUrl(endpoint: string, target: CollectorTarget, input: CollectTransfersInput): string {
  const url = new URL(`/v1/base-mainnet/address/${target.address}/transfers_v2/`, endpoint);
  if (target.assetAddress) url.searchParams.set("contract-address", target.assetAddress);
  url.searchParams.set("page-size", String(Math.min(input.limit ?? 100, 100)));
  if (input.window.chain === "base") {
    url.searchParams.set("starting-block", input.window.fromBlock.toString());
    if (input.window.toBlock !== "latest")
      url.searchParams.set("ending-block", input.window.toBlock.toString());
  }
  if (input.cursor?.source === "goldrush" && input.cursor.pageNumber !== undefined) {
    url.searchParams.set("page-number", String(input.cursor.pageNumber));
  }
  return url.toString();
}

function normalizeGoldRushItem(
  target: CollectorTarget,
  item: GoldRushItem,
): NormalizedCollectorTransfer[] {
  const transactionHash = required(item.tx_hash, "GoldRush tx_hash");
  return (item.transfers ?? [])
    .filter((transfer) => sameAddress(transfer.to_address, target.address))
    .filter(
      (transfer) =>
        !target.assetAddress || sameAddress(transfer.contract_address, target.assetAddress),
    )
    .map((transfer, index) => ({
      source: "goldrush",
      chain: "base",
      queryTarget: target,
      idempotencyKey: `goldrush:base:${transactionHash}:${index}:${transfer.contract_address ?? "unknown"}`,
      transactionHash,
      ...(item.block_height !== undefined ? { blockNumber: BigInt(item.block_height) } : {}),
      ...(item.block_hash ? { blockHash: item.block_hash } : {}),
      ...(item.block_signed_at ? { timestamp: item.block_signed_at } : {}),
      success: item.successful,
      ...(transfer.from_address ? { fromAddress: transfer.from_address } : {}),
      ...(transfer.to_address ? { toAddress: transfer.to_address } : {}),
      direction: "incoming",
      ...(transfer.contract_address ? { assetAddress: transfer.contract_address } : {}),
      ...(transfer.contract_ticker_symbol ? { assetSymbol: transfer.contract_ticker_symbol } : {}),
      amountBaseUnits: absoluteString(transfer.delta ?? "0"),
      rawPayload: { item, transfer },
    }));
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

function sameAddress(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function absoluteString(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}
