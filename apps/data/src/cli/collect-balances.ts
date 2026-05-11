#!/usr/bin/env bun
import { createDuneSimSolanaBalancesCollector } from "../collectors/dune-sim/solana-balances.js";
import { createGoldRushSolanaBalancesCollector } from "../collectors/goldrush/solana-balances.js";
import { PAY_SH_SOLANA_USDC_COLLECTION_TARGETS } from "../collectors/targets/pay-sh-solana.js";
import type { BalanceCollector, CollectorTarget } from "../collectors/types.js";

type CollectBalancesCliOptions = {
  source: "dune-sim" | "goldrush";
  chain: "solana";
  dryRun: boolean;
  limit: number;
};

function parseArgs(args: readonly string[]): CollectBalancesCliOptions {
  const options: CollectBalancesCliOptions = {
    source: "dune-sim",
    chain: "solana",
    dryRun: false,
    limit: 10,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      const value = args[++index];
      if (value !== "dune-sim" && value !== "goldrush") {
        throw new Error("--source must be dune-sim or goldrush");
      }
      options.source = value;
    } else if (arg === "--chain") {
      const value = args[++index];
      if (value !== "solana") throw new Error("--chain must be solana");
      options.chain = value;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(requiredValue(args[++index], "--limit"), 10);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collector = createCollector(options);
  const result = await collector.collectBalances({
    targets: defaultTargets(options),
    limit: options.limit,
  });
  console.log(jsonStringify({ mode: options.dryRun ? "dry-run" : "stdout-only", result }));
}

function createCollector(options: CollectBalancesCliOptions): BalanceCollector {
  if (options.source === "dune-sim") {
    return createDuneSimSolanaBalancesCollector({ apiKey: requiredEnv("DUNE_SIM_API_KEY") });
  }
  return createGoldRushSolanaBalancesCollector({ apiKey: requiredEnv("GOLDRUSH_API_KEY") });
}

function defaultTargets(options: CollectBalancesCliOptions): CollectorTarget[] {
  return PAY_SH_SOLANA_USDC_COLLECTION_TARGETS.slice(0, options.limit).map((target) => ({
    chain: options.chain,
    address: target.payToAddress,
    assetAddress: target.tokenMintAddress,
    providerId: target.providerFqn,
  }));
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function requiredValue(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`Missing value for ${flag}`);
  return value;
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
