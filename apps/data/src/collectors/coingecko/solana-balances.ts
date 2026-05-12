import { getJson, postJsonRpc } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  BalanceCollector,
  CollectBalancesInput,
  CollectBalancesResult,
  CollectorTarget,
  NormalizedCollectorBalance,
} from "../types.js";

type SolanaTokenAccountResponse = {
  result?: {
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              mint?: string;
              tokenAmount?: {
                amount?: string;
                decimals?: number;
                uiAmount?: number;
              };
            };
          };
        };
      };
    }>;
  };
};

type CoinGeckoTokenPriceResponse = Record<
  string,
  {
    usd?: number;
    last_updated_at?: number;
  }
>;

export type CoinGeckoSolanaBalancesCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
  rpcEndpoint?: string;
  authHeader?: "x-cg-demo-api-key" | "x-cg-pro-api-key";
};

export function createCoinGeckoSolanaBalancesCollector(
  options: CoinGeckoSolanaBalancesCollectorOptions,
): BalanceCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.coingecko.com/api/v3";
  const rpcEndpoint = options.rpcEndpoint ?? "https://api.mainnet-beta.solana.com";
  const authHeader = options.authHeader ?? "x-cg-demo-api-key";

  return {
    source: "coingecko",
    supportedChains: ["solana"],
    async collectBalances(input: CollectBalancesInput): Promise<CollectBalancesResult> {
      const balances: NormalizedCollectorBalance[] = [];
      let requestCount = 0;

      for (const target of input.targets) {
        if (target.chain !== "solana" || !target.assetAddress) continue;
        const amount = await fetchSolanaTokenAmount(fetchImpl, rpcEndpoint, target);
        requestCount += 1;
        const price = await fetchCoinGeckoUsdPrice(
          fetchImpl,
          endpoint,
          authHeader,
          options.apiKey,
          target,
        );
        requestCount += 1;
        balances.push(normalizeBalance(target, amount, price));
      }

      return { source: "coingecko", balances, rawRequestCount: requestCount };
    },
  };
}

async function fetchSolanaTokenAmount(
  fetchImpl: FetchLike,
  rpcEndpoint: string,
  target: CollectorTarget,
): Promise<{ amountBaseUnits: string; decimals?: number }> {
  const payload = (await postJsonRpc(fetchImpl, rpcEndpoint, {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      target.address,
      { mint: target.assetAddress },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ],
  })) as SolanaTokenAccountResponse;

  return (payload.result?.value ?? []).reduce(
    (sum, item) => {
      const tokenAmount = item.account?.data?.parsed?.info?.tokenAmount;
      return {
        amountBaseUnits: (
          BigInt(sum.amountBaseUnits) + BigInt(tokenAmount?.amount ?? "0")
        ).toString(),
        decimals: sum.decimals ?? tokenAmount?.decimals,
      };
    },
    { amountBaseUnits: "0", decimals: undefined as number | undefined },
  );
}

async function fetchCoinGeckoUsdPrice(
  fetchImpl: FetchLike,
  endpoint: string,
  authHeader: "x-cg-demo-api-key" | "x-cg-pro-api-key",
  apiKey: string,
  target: CollectorTarget,
): Promise<{ usd?: number; rawPayload: unknown }> {
  const url = new URL(`/api/v3/simple/token_price/solana`, endpoint);
  url.searchParams.set("contract_addresses", target.assetAddress ?? "");
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_last_updated_at", "true");
  const payload = (await getJson(fetchImpl, url.toString(), {
    [authHeader]: apiKey,
  })) as CoinGeckoTokenPriceResponse;
  return { usd: payload[target.assetAddress ?? ""]?.usd, rawPayload: payload };
}

function normalizeBalance(
  target: CollectorTarget,
  amount: { amountBaseUnits: string; decimals?: number },
  price: { usd?: number; rawPayload: unknown },
): NormalizedCollectorBalance {
  const uiAmount =
    amount.decimals === undefined
      ? undefined
      : Number(amount.amountBaseUnits) / 10 ** amount.decimals;
  return {
    source: "coingecko",
    chain: "solana",
    queryTarget: target,
    walletAddress: target.address,
    assetAddress: target.assetAddress ?? "unknown",
    assetSymbol: "USDC",
    assetName: "USD Coin",
    amountBaseUnits: amount.amountBaseUnits,
    ...(amount.decimals !== undefined ? { decimals: amount.decimals } : {}),
    ...(uiAmount !== undefined && price.usd !== undefined
      ? { valueUsd: uiAmount * price.usd }
      : {}),
    rawPayload: { price: price.rawPayload },
  };
}
