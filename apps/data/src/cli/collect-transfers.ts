#!/usr/bin/env bun
import { createAlchemyBaseTransfersCollector } from "../collectors/alchemy/base-transfers.js";
import { normalizeHttpsUrl } from "../collectors/http.js";
import { createSolanaRpcTransferCollector } from "../collectors/solana/rpc-transfers.js";
import {
  PAY_SH_SOLANA_USDC_COLLECTION_TARGETS,
  toCollectorTargets,
} from "../collectors/targets/pay-sh-solana.js";
import type { CollectorTarget, TransferCollector } from "../collectors/types.js";

const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913";
const BASE_MPP_PAY_TO = "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f";

type CollectTransfersCliOptions = {
  source: "alchemy" | "rpc-fast";
  chain: "base" | "solana";
  dryRun: boolean;
  limit: number;
  fromBlock?: bigint;
  toBlock: bigint | "latest";
};

function parseArgs(args: readonly string[]): CollectTransfersCliOptions {
  const options: CollectTransfersCliOptions = {
    source: "alchemy",
    chain: "base",
    dryRun: false,
    limit: 10,
    toBlock: "latest",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      const value = args[++index];
      if (value !== "alchemy" && value !== "rpc-fast")
        throw new Error("--source must be alchemy or rpc-fast");
      options.source = value;
    } else if (arg === "--chain") {
      const value = args[++index];
      if (value !== "base" && value !== "solana") throw new Error("--chain must be base or solana");
      options.chain = value;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(requiredValue(args[++index], "--limit"), 10);
    } else if (arg === "--from-block") {
      options.fromBlock = BigInt(requiredValue(args[++index], "--from-block"));
    } else if (arg === "--to-block") {
      const value = requiredValue(args[++index], "--to-block");
      options.toBlock = value === "latest" ? "latest" : BigInt(value);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (options.source === "rpc-fast" && options.chain !== "solana") {
    throw new Error("rpc-fast collector only supports solana");
  }
  if (options.chain === "base" && options.fromBlock === undefined) {
    throw new Error("--from-block is required for base collection");
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collector = createCollector(options);
  const targets = defaultTargets(options);
  const result = await collector.collectTransfers({
    targets,
    limit: options.limit,
    window:
      options.chain === "base"
        ? { chain: "base", fromBlock: options.fromBlock ?? 0n, toBlock: options.toBlock }
        : { chain: "solana" },
  });
  console.log(jsonStringify({ mode: options.dryRun ? "dry-run" : "stdout-only", result }));
}

function createCollector(options: CollectTransfersCliOptions): TransferCollector {
  if (options.source === "alchemy" && options.chain === "base") {
    return createAlchemyBaseTransfersCollector({ apiKey: requiredEnv("ALCHEMY_API_KEY") });
  }
  if (options.source === "alchemy" && options.chain === "solana") {
    return createSolanaRpcTransferCollector({
      source: "alchemy",
      endpoint: `https://solana-mainnet.g.alchemy.com/v2/${requiredEnv("ALCHEMY_API_KEY")}`,
    });
  }
  return createSolanaRpcTransferCollector({
    source: "rpc-fast",
    endpoint: normalizeHttpsUrl(requiredEnv("RPC_FAST_SOLANA_RPC_URL")),
    headers: { "x-token": requiredEnv("RPC_FAST_API_KEY") },
  });
}

function defaultTargets(options: CollectTransfersCliOptions): CollectorTarget[] {
  if (options.chain === "base") {
    return [{ chain: "base", address: BASE_MPP_PAY_TO, assetAddress: BASE_USDC }];
  }
  return toCollectorTargets(PAY_SH_SOLANA_USDC_COLLECTION_TARGETS).slice(0, options.limit);
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
