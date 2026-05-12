#!/usr/bin/env bun
import { createCoinGeckoSolanaBalancesCollector } from "../collectors/coingecko/solana-balances.js";
import { createDuneSimSolanaBalancesCollector } from "../collectors/dune-sim/solana-balances.js";
import { createGoldRushSolanaBalancesCollector } from "../collectors/goldrush/solana-balances.js";
import { createNansenSolanaBalancesCollector } from "../collectors/nansen/solana-balances.js";
import { createSolanaRpcTransferCollector } from "../collectors/solana/rpc-transfers.js";
import type { BalanceCollector } from "../collectors/types.js";
import type {
  ProviderEnrichmentBalanceSummary,
  ProviderEnrichmentSnapshot,
} from "../enrichment/provider-snapshot.js";
import { enrichPayShSolanaTarget } from "../enrichment/pay-sh-solana.js";

type DemoProviderEnrichmentSummary = {
  feature: "provider-balance-enrichment";
  target: {
    providerId: string;
    chain: string;
    walletAddress: string;
    asset: string;
  };
  uiLabel?: string;
  partnerProof: Array<{
    source: string;
    endpoint: string;
    role: string;
    formattedBalance?: string;
  }>;
};

type EnrichProviderCliOptions = {
  target: "pay-sh-solana:first";
  transferSource: "alchemy";
  dryRun: boolean;
};

function parseArgs(args: readonly string[]): EnrichProviderCliOptions {
  const options: EnrichProviderCliOptions = {
    target: "pay-sh-solana:first",
    transferSource: "alchemy",
    dryRun: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target") {
      const value = args[++index];
      if (value !== "pay-sh-solana:first") throw new Error("--target must be pay-sh-solana:first");
      options.target = value;
    } else if (arg === "--transfer-source") {
      const value = args[++index];
      if (value !== "alchemy") throw new Error("--transfer-source must be alchemy");
      options.transferSource = value;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = await enrichPayShSolanaTarget({
    targetIndex: options.target === "pay-sh-solana:first" ? 0 : 0,
    transferCollector: createSolanaRpcTransferCollector({
      source: options.transferSource,
      endpoint: `https://solana-mainnet.g.alchemy.com/v2/${requiredEnv("ALCHEMY_API_KEY")}`,
    }),
    balanceCollectors: [
      createDuneSimSolanaBalancesCollector({ apiKey: requiredEnv("DUNE_SIM_API_KEY") }),
      createGoldRushSolanaBalancesCollector({ apiKey: requiredEnv("GOLDRUSH_API_KEY") }),
      ...optionalBalanceCollectors(),
    ],
  });

  console.log(
    jsonStringify({
      mode: options.dryRun ? "dry-run" : "stdout-only",
      demo: buildDemoProviderEnrichmentSummary(snapshot),
      snapshot,
    }),
  );
}

function optionalBalanceCollectors(): BalanceCollector[] {
  const collectors: BalanceCollector[] = [];
  const coinGeckoApiKey = optionalEnv("COINGECKO_API_KEY");
  if (coinGeckoApiKey) {
    collectors.push(createCoinGeckoSolanaBalancesCollector({ apiKey: coinGeckoApiKey }));
  }
  const nansenApiKey = optionalEnv("NANSEN_API_KEY");
  if (nansenApiKey) {
    collectors.push(createNansenSolanaBalancesCollector({ apiKey: nansenApiKey }));
  }
  return collectors;
}

export function buildDemoProviderEnrichmentSummary(
  snapshot: ProviderEnrichmentSnapshot,
): DemoProviderEnrichmentSummary {
  const duneSimBalance = findAssetBalance(snapshot, "dune-sim");
  const goldRushBalance = findAssetBalance(snapshot, "goldrush");
  const coinGeckoBalance = findAssetBalance(snapshot, "coingecko");
  const nansenBalance = findAssetBalance(snapshot, "nansen");
  const primaryBalance = duneSimBalance ?? snapshot.balances[0];
  const formattedBalance = primaryBalance ? formatDisplayBalance(primaryBalance) : undefined;

  return {
    feature: "provider-balance-enrichment",
    target: {
      providerId: snapshot.target.providerId,
      chain: snapshot.target.chain,
      walletAddress: snapshot.target.payToAddress,
      asset: snapshot.target.asset,
    },
    ...(formattedBalance ? { uiLabel: `Balance ${formattedBalance}` } : {}),
    partnerProof: [
      ...(duneSimBalance
        ? [
            {
              source: "dune-sim",
              endpoint: "GET /beta/svm/balances/{address}?chains=solana",
              role: "live Solana SVM provider wallet balance enrichment",
              formattedBalance: formatDisplayBalance(duneSimBalance),
            },
          ]
        : []),
      ...(goldRushBalance
        ? [
            {
              source: "goldrush",
              endpoint: "GET /v1/solana-mainnet/address/{address}/balances_v2/",
              role: "secondary Solana token balance enrichment",
              formattedBalance: formatDisplayBalance(goldRushBalance),
            },
          ]
        : []),
      ...(coinGeckoBalance
        ? [
            {
              source: "coingecko",
              endpoint:
                "GET /api/v3/simple/token_price/solana + Solana RPC getTokenAccountsByOwner",
              role: "USDC price enrichment paired with wallet token-account balance reads",
              formattedBalance: formatDisplayBalance(coinGeckoBalance),
            },
          ]
        : []),
      ...(nansenBalance
        ? [
            {
              source: "nansen",
              endpoint: "POST /api/v1/profiler/address/current-balance",
              role: "current Solana address balance enrichment",
              formattedBalance: formatDisplayBalance(nansenBalance),
            },
          ]
        : []),
      ...(snapshot.latestTransfer
        ? [
            {
              source: snapshot.latestTransfer.source,
              endpoint: "Solana JSON-RPC getSignaturesForAddress/getTransaction",
              role: "latest payment transfer observation",
            },
          ]
        : []),
    ],
  };
}

function findAssetBalance(
  snapshot: ProviderEnrichmentSnapshot,
  source: ProviderEnrichmentBalanceSummary["source"],
): ProviderEnrichmentBalanceSummary | undefined {
  return snapshot.balances.find(
    (balance) => balance.source === source && balance.assetSymbol === snapshot.target.asset,
  );
}

function formatDisplayBalance(balance: ProviderEnrichmentBalanceSummary): string {
  if (balance.decimals === undefined)
    return `${balance.amountBaseUnits} ${balance.assetSymbol ?? "units"}`;
  const value = Math.trunc((Number(balance.amountBaseUnits) / 10 ** balance.decimals) * 100) / 100;
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} ${balance.assetSymbol ?? "units"}`;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
