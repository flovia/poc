import { getJson } from "../http.js";
import type { FetchLike } from "../http.js";
import type {
  BalanceCollector,
  CollectBalancesInput,
  CollectBalancesResult,
  CollectorTarget,
  NormalizedCollectorBalance,
} from "../types.js";

type DuneSimBalance = {
  chain?: string;
  address?: string;
  symbol?: string;
  name?: string;
  amount?: string | number;
  raw_balance?: string;
  balance?: string | number;
  decimals?: number;
  value_usd?: number;
};

type DuneSimBalancesResponse = {
  wallet_address?: string;
  balances?: DuneSimBalance[];
  next_offset?: string;
  warnings?: unknown[];
};

export type DuneSimSolanaBalancesCollectorOptions = {
  apiKey: string;
  fetch?: FetchLike;
  endpoint?: string;
};

export function createDuneSimSolanaBalancesCollector(
  options: DuneSimSolanaBalancesCollectorOptions,
): BalanceCollector {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "https://api.sim.dune.com";
  return {
    source: "dune-sim",
    supportedChains: ["solana"],
    async collectBalances(input: CollectBalancesInput): Promise<CollectBalancesResult> {
      const balances: NormalizedCollectorBalance[] = [];
      const warnings: string[] = [];
      let nextOffset: string | undefined;
      let requestCount = 0;

      for (const target of input.targets) {
        if (target.chain !== "solana") continue;
        const response = (await getJson(fetchImpl, buildUrl(endpoint, target, input), {
          "x-sim-api-key": options.apiKey,
        })) as DuneSimBalancesResponse;
        requestCount += 1;
        nextOffset = response.next_offset ?? nextOffset;
        if (response.warnings?.length)
          warnings.push(`Dune Sim warnings: ${response.warnings.length}`);
        for (const balance of response.balances ?? []) {
          if (target.assetAddress && balance.address !== target.assetAddress) continue;
          balances.push(
            normalizeBalance(target, response.wallet_address ?? target.address, balance),
          );
        }
      }

      return {
        source: "dune-sim",
        balances,
        ...(nextOffset ? { nextCursor: { source: "dune-sim", chain: "solana", nextOffset } } : {}),
        rawRequestCount: requestCount,
        ...(warnings.length ? { warnings } : {}),
      };
    },
  };
}

function buildUrl(endpoint: string, target: CollectorTarget, input: CollectBalancesInput): string {
  const url = new URL(`/beta/svm/balances/${target.address}`, endpoint);
  url.searchParams.set("chains", "solana");
  url.searchParams.set(
    "limit",
    String(Math.min(target.assetAddress ? 100 : (input.limit ?? 100), 1000)),
  );
  if (input.cursor?.source === "dune-sim" && input.cursor.nextOffset) {
    url.searchParams.set("offset", input.cursor.nextOffset);
  }
  return url.toString();
}

function normalizeBalance(
  target: CollectorTarget,
  walletAddress: string,
  balance: DuneSimBalance,
): NormalizedCollectorBalance {
  return {
    source: "dune-sim",
    chain: "solana",
    queryTarget: target,
    walletAddress,
    assetAddress: balance.address ?? "unknown",
    ...(balance.symbol ? { assetSymbol: balance.symbol } : {}),
    ...(balance.name ? { assetName: balance.name } : {}),
    amountBaseUnits: (balance.amount ?? balance.raw_balance ?? balance.balance ?? "0").toString(),
    ...(balance.decimals !== undefined ? { decimals: balance.decimals } : {}),
    ...(balance.value_usd !== undefined ? { valueUsd: balance.value_usd } : {}),
    rawPayload: balance,
  };
}
