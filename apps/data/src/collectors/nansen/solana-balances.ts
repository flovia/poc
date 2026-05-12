import type { FetchLike } from "../http.js";
import type {
  BalanceCollector,
  CollectBalancesInput,
  CollectBalancesResult,
  CollectorTarget,
  NormalizedCollectorBalance,
} from "../types.js";

type NansenBalance = {
  chain?: string;
  address?: string;
  token_address?: string;
  token_symbol?: string;
  token_name?: string;
  token_amount?: number | string;
  price_usd?: number;
  value_usd?: number;
};

type NansenCurrentBalanceResponse = {
  data?: NansenBalance[];
  pagination?: {
    page?: number;
    is_last_page?: boolean;
  };
};

export type NansenSolanaBalancesCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createNansenSolanaBalancesCollector(
  options: NansenSolanaBalancesCollectorOptions,
): BalanceCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.nansen.ai";
  return {
    source: "nansen",
    supportedChains: ["solana"],
    async collectBalances(input: CollectBalancesInput): Promise<CollectBalancesResult> {
      const balances: NormalizedCollectorBalance[] = [];
      let requestCount = 0;
      let hasMore = false;
      let pageNumber: number | undefined;

      for (const target of input.targets) {
        if (target.chain !== "solana") continue;
        const response = await postNansenCurrentBalance(
          fetchImpl,
          endpoint,
          options.apiKey,
          target,
          input,
        );
        requestCount += 1;
        hasMore = response.pagination?.is_last_page === false || hasMore;
        pageNumber = response.pagination?.page ?? pageNumber;
        for (const balance of response.data ?? []) {
          if (target.assetAddress && balance.token_address !== target.assetAddress) continue;
          balances.push(normalizeBalance(target, balance));
        }
      }

      return {
        source: "nansen",
        balances,
        ...(hasMore
          ? {
              nextCursor: {
                source: "nansen",
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

async function postNansenCurrentBalance(
  fetchImpl: FetchLike,
  endpoint: string,
  apiKey: string,
  target: CollectorTarget,
  input: CollectBalancesInput,
): Promise<NansenCurrentBalanceResponse> {
  const response = await fetchImpl(
    new URL("/api/v1/profiler/address/current-balance", endpoint).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json", apiKey },
      body: JSON.stringify({
        address: target.address,
        chain: "solana",
        hide_spam_token: true,
        pagination: {
          page: input.cursor?.source === "nansen" ? (input.cursor.pageNumber ?? 1) : 1,
          per_page: Math.min(input.limit ?? 100, 100),
        },
      }),
    },
  );
  const payload = (await response.json().catch(() => undefined)) as
    | NansenCurrentBalanceResponse
    | undefined;
  if (!response.ok) throw new Error(`Nansen request failed with HTTP ${response.status}`);
  return payload ?? {};
}

function normalizeBalance(
  target: CollectorTarget,
  balance: NansenBalance,
): NormalizedCollectorBalance {
  return {
    source: "nansen",
    chain: "solana",
    queryTarget: target,
    walletAddress: balance.address ?? target.address,
    assetAddress: balance.token_address ?? "unknown",
    ...(balance.token_symbol ? { assetSymbol: balance.token_symbol } : {}),
    ...(balance.token_name ? { assetName: balance.token_name } : {}),
    amountBaseUnits: toBaseUnits(balance.token_amount ?? 0, 6),
    decimals: 6,
    ...(balance.value_usd !== undefined ? { valueUsd: balance.value_usd } : {}),
    rawPayload: balance,
  };
}

function toBaseUnits(amount: number | string, decimals: number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  return Math.trunc(value * 10 ** decimals).toString();
}
