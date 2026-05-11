import { getJson } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  BalanceCollector,
  CollectBalancesInput,
  CollectBalancesResult,
  CollectorTarget,
  NormalizedCollectorBalance,
} from "../types.js";

type GoldRushBalance = {
  contract_address?: string;
  contract_ticker_symbol?: string;
  contract_name?: string;
  contract_decimals?: number;
  balance?: string;
  quote?: number;
};

type GoldRushBalancesResponse = {
  data?: {
    address?: string;
    items?: GoldRushBalance[];
    pagination?: { has_more?: boolean; page_number?: number };
  };
  error?: boolean;
  error_message?: string | null;
};

export type GoldRushSolanaBalancesCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createGoldRushSolanaBalancesCollector(
  options: GoldRushSolanaBalancesCollectorOptions,
): BalanceCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.covalenthq.com";
  return {
    source: "goldrush",
    supportedChains: ["solana"],
    async collectBalances(input: CollectBalancesInput): Promise<CollectBalancesResult> {
      const balances: NormalizedCollectorBalance[] = [];
      let hasMore = false;
      let pageNumber: number | undefined;
      let requestCount = 0;

      for (const target of input.targets) {
        if (target.chain !== "solana") continue;
        const response = (await getJson(fetchImpl, buildUrl(endpoint, target), {
          authorization: `Bearer ${options.apiKey}`,
        })) as GoldRushBalancesResponse;
        requestCount += 1;
        if (response.error) throw new Error(response.error_message ?? "GoldRush request failed");
        hasMore = response.data?.pagination?.has_more ?? hasMore;
        pageNumber = response.data?.pagination?.page_number ?? pageNumber;
        for (const balance of response.data?.items ?? []) {
          if (target.assetAddress && balance.contract_address !== target.assetAddress) continue;
          balances.push(
            normalizeBalance(target, response.data?.address ?? target.address, balance),
          );
        }
      }

      return {
        source: "goldrush",
        balances,
        ...(hasMore
          ? {
              nextCursor: {
                source: "goldrush",
                chain: "solana" as const,
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

function buildUrl(endpoint: string, target: CollectorTarget): string {
  return new URL(`/v1/solana-mainnet/address/${target.address}/balances_v2/`, endpoint).toString();
}

function normalizeBalance(
  target: CollectorTarget,
  walletAddress: string,
  balance: GoldRushBalance,
): NormalizedCollectorBalance {
  return {
    source: "goldrush",
    chain: "solana",
    queryTarget: target,
    walletAddress,
    assetAddress: balance.contract_address ?? "unknown",
    ...(balance.contract_ticker_symbol ? { assetSymbol: balance.contract_ticker_symbol } : {}),
    ...(balance.contract_name ? { assetName: balance.contract_name } : {}),
    amountBaseUnits: balance.balance ?? "0",
    ...(balance.contract_decimals !== undefined ? { decimals: balance.contract_decimals } : {}),
    ...(balance.quote !== undefined ? { valueUsd: balance.quote } : {}),
    rawPayload: balance,
  };
}
