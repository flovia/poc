#!/usr/bin/env bun
import { createDuneSimSolanaBalancesCollector } from "../collectors/dune-sim/solana-balances.js";
import { createGoldRushSolanaBalancesCollector } from "../collectors/goldrush/solana-balances.js";
import { createSolanaRpcTransferCollector } from "../collectors/solana/rpc-transfers.js";
import { enrichPayShSolanaTarget } from "../enrichment/pay-sh-solana.js";

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
    ],
  });

  console.log(jsonStringify({ mode: options.dryRun ? "dry-run" : "stdout-only", snapshot }));
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
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
