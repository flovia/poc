import { getJson } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  CollectTransfersInput,
  CollectTransfersResult,
  CollectorTarget,
  NormalizedCollectorTransfer,
  TransferCollector,
} from "../types.js";

type DuneSimActivity = {
  tx_hash?: string;
  block_number?: number | string;
  block_time?: string;
  from?: string;
  to?: string;
  token_address?: string;
  value?: string | number;
  type?: string;
  success?: boolean;
  token_metadata?: {
    symbol?: string;
    decimals?: number;
  };
};

type DuneSimActivityResponse = {
  activity?: DuneSimActivity[];
  next_offset?: string;
  warnings?: unknown[];
};

export type DuneSimBaseActivityCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createDuneSimBaseActivityCollector(
  options: DuneSimBaseActivityCollectorOptions,
): TransferCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.sim.dune.com";
  return {
    source: "dune-sim",
    supportedChains: ["base"],
    async collectTransfers(input: CollectTransfersInput): Promise<CollectTransfersResult> {
      if (input.window.chain !== "base")
        throw new Error("Dune Sim Base collector requires base window");
      const transfers: NormalizedCollectorTransfer[] = [];
      let nextOffset: string | undefined;
      let requestCount = 0;
      const warnings: string[] = [];

      for (const target of input.targets) {
        if (target.chain !== "base") continue;
        const response = (await getJson(fetchImpl, buildUrl(endpoint, target, input), {
          "x-sim-api-key": options.apiKey,
        })) as DuneSimActivityResponse;
        requestCount += 1;
        nextOffset = response.next_offset ?? nextOffset;
        if (response.warnings?.length)
          warnings.push(`Dune Sim warnings: ${response.warnings.length}`);
        response.activity?.forEach((activity, index) => {
          transfers.push(normalizeDuneActivity(target, activity, index));
        });
      }

      return {
        source: "dune-sim",
        transfers,
        ...(nextOffset ? { nextCursor: { source: "dune-sim", chain: "base", nextOffset } } : {}),
        rawRequestCount: requestCount,
        ...(warnings.length ? { warnings } : {}),
      };
    },
  };
}

function buildUrl(endpoint: string, target: CollectorTarget, input: CollectTransfersInput): string {
  const url = new URL(`/v1/evm/activity/${target.address}`, endpoint);
  url.searchParams.set("chain_ids", "8453");
  url.searchParams.set("activity_type", "receive");
  url.searchParams.set("asset_type", "erc20");
  url.searchParams.set("limit", String(Math.min(input.limit ?? 100, 100)));
  if (target.assetAddress) url.searchParams.set("token_address", target.assetAddress);
  if (input.cursor?.source === "dune-sim" && input.cursor.nextOffset) {
    url.searchParams.set("offset", input.cursor.nextOffset);
  }
  return url.toString();
}

function normalizeDuneActivity(
  target: CollectorTarget,
  activity: DuneSimActivity,
  index: number,
): NormalizedCollectorTransfer {
  const transactionHash = required(activity.tx_hash, "Dune Sim tx_hash");
  return {
    source: "dune-sim",
    chain: "base",
    queryTarget: target,
    idempotencyKey: `dune-sim:base:${transactionHash}:${index}`,
    transactionHash,
    ...(activity.block_number !== undefined ? { blockNumber: BigInt(activity.block_number) } : {}),
    ...(activity.block_time ? { timestamp: activity.block_time } : {}),
    success: activity.success,
    ...(activity.from ? { fromAddress: activity.from } : {}),
    ...(activity.to ? { toAddress: activity.to } : { toAddress: target.address }),
    direction: "incoming",
    ...(activity.token_address ? { assetAddress: activity.token_address } : {}),
    ...(activity.token_metadata?.symbol ? { assetSymbol: activity.token_metadata.symbol } : {}),
    amountBaseUnits: activity.value?.toString() ?? "0",
    rawPayload: activity,
  };
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}
