#!/usr/bin/env bun
import { createAlchemyBaseTransfersCollector } from "../collectors/alchemy/base-transfers.js";
import { RPC_FAST_SOLANA_RPC_URL } from "../collectors/config.js";
import { createDuneSimBaseActivityCollector } from "../collectors/dune-sim/base-activity.js";
import { createEvmErc20TransfersCollector } from "../collectors/evm/erc20-transfers.js";
import { createGoldRushBaseTransfersCollector } from "../collectors/goldrush/base-transfers.js";
import { createSolanaRpcTransferCollector } from "../collectors/solana/rpc-transfers.js";
import {
  PAY_SH_SOLANA_USDC_COLLECTION_TARGETS,
  QUICKNODE_SOLANA_USDC_COLLECTION_TARGET,
  toCollectorTargets,
} from "../collectors/targets/pay-sh-solana.js";
import type {
  CollectorCursor,
  CollectorTarget,
  CollectTransfersResult,
  TransferCollector,
} from "../collectors/types.js";
import { createBunPostgresExecutor, closeBunPostgres } from "../storage/bun-postgres.js";
import { upsertTransferObservations } from "../storage/transfer-observations.js";

const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913";
const BASE_MPP_PAY_TO = "0x93053f1e7a5efeda532fe69cbbe43cbec3a0f13f";
const QUICKNODE_BASE_PAY_TO = "0xF46394adDdA95A3d5bCC1124605E3d15D204623C";
const TEMPO_RPC_URL = "https://rpc.tempo.xyz";
const TEMPO_USD_TOKEN = "0x20C000000000000000000000b9537d11c60E8b50";

type CollectTransfersCliOptions = {
  source: "alchemy" | "tempo-rpc" | "rpc-fast" | "dune-sim" | "goldrush";
  chain: "base" | "solana" | "tempo";
  dryRun: boolean;
  limit: number;
  fromBlock?: bigint;
  toBlock: bigint | "latest";
  target: "mpp" | "quicknode";
  payTo?: string;
  providerId?: string;
  maxPages: number;
  summary: boolean;
};

function parseArgs(args: readonly string[]): CollectTransfersCliOptions {
  const options: CollectTransfersCliOptions = {
    source: "alchemy",
    chain: "base",
    dryRun: false,
    limit: 10,
    toBlock: "latest",
    target: "quicknode",
    maxPages: 1,
    summary: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      const value = args[++index];
      if (
        value !== "alchemy" &&
        value !== "tempo-rpc" &&
        value !== "rpc-fast" &&
        value !== "dune-sim" &&
        value !== "goldrush"
      ) {
        throw new Error("--source must be alchemy, tempo-rpc, rpc-fast, dune-sim, or goldrush");
      }
      options.source = value;
    } else if (arg === "--chain") {
      const value = args[++index];
      if (value !== "base" && value !== "solana" && value !== "tempo") {
        throw new Error("--chain must be base, solana, or tempo");
      }
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
    } else if (arg === "--target") {
      const value = requiredValue(args[++index], "--target");
      if (value !== "mpp" && value !== "quicknode")
        throw new Error("--target must be mpp or quicknode");
      options.target = value;
    } else if (arg === "--pay-to") {
      options.payTo = requiredValue(args[++index], "--pay-to");
    } else if (arg === "--provider-id") {
      options.providerId = requiredValue(args[++index], "--provider-id");
    } else if (arg === "--max-pages") {
      options.maxPages = Number.parseInt(requiredValue(args[++index], "--max-pages"), 10);
    } else if (arg === "--summary") {
      options.summary = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(options.maxPages) || options.maxPages < 1) {
    throw new Error("--max-pages must be a positive integer");
  }
  if (options.source === "rpc-fast" && options.chain !== "solana") {
    throw new Error("rpc-fast collector only supports solana");
  }
  if (options.source === "tempo-rpc" && options.chain !== "tempo") {
    throw new Error("tempo-rpc collector only supports tempo");
  }
  if (
    (options.source === "dune-sim" || options.source === "goldrush") &&
    options.chain !== "base"
  ) {
    throw new Error(`${options.source} collector currently supports base validation only`);
  }
  if ((options.chain === "base" || options.chain === "tempo") && options.fromBlock === undefined) {
    throw new Error("--from-block is required for base and tempo collection");
  }
  if (options.chain === "tempo" && !options.payTo) {
    throw new Error("--pay-to is required for tempo collection");
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collector = createCollector(options);
  const targets = defaultTargets(options);
  const results: CollectTransfersResult[] = [];
  let cursor: CollectorCursor | undefined;
  let upsert = { base: 0, tempo: 0, solana: 0, skipped: 0 };
  const executor = options.dryRun ? undefined : createBunPostgresExecutor();
  try {
    for (let page = 0; page < options.maxPages; page += 1) {
      const result = await collector.collectTransfers({
        targets,
        limit: options.limit,
        ...(cursor ? { cursor } : {}),
        window:
          options.chain === "base" || options.chain === "tempo"
            ? { chain: options.chain, fromBlock: options.fromBlock ?? 0n, toBlock: options.toBlock }
            : { chain: "solana" },
      });
      results.push(result);
      if (executor) {
        const pageUpsert = await upsertTransferObservations(executor, result.transfers);
        upsert = {
          base: upsert.base + pageUpsert.base,
          tempo: upsert.tempo + pageUpsert.tempo,
          solana: upsert.solana + pageUpsert.solana,
          skipped: upsert.skipped + pageUpsert.skipped,
        };
      }
      if (!hasContinuation(result.nextCursor)) break;
      cursor = result.nextCursor;
    }
  } finally {
    if (executor) await closeBunPostgres();
  }
  if (options.dryRun) {
    console.log(jsonStringify(outputPayload(options, "dry-run", results)));
    return;
  }
  console.log(jsonStringify(outputPayload(options, "upsert", results, upsert)));
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
  if (options.source === "tempo-rpc") {
    return createEvmErc20TransfersCollector({
      source: "tempo-rpc",
      chain: "tempo",
      endpoint: process.env.TEMPO_RPC_URL?.trim() || TEMPO_RPC_URL,
    });
  }
  if (options.source === "dune-sim") {
    return createDuneSimBaseActivityCollector({ apiKey: requiredEnv("DUNE_SIM_API_KEY") });
  }
  if (options.source === "goldrush") {
    return createGoldRushBaseTransfersCollector({ apiKey: requiredEnv("GOLDRUSH_API_KEY") });
  }
  return createSolanaRpcTransferCollector({
    source: "rpc-fast",
    endpoint: RPC_FAST_SOLANA_RPC_URL,
    headers: { "x-token": requiredEnv("RPC_FAST_API_KEY") },
  });
}

function defaultTargets(options: CollectTransfersCliOptions): CollectorTarget[] {
  if (options.chain === "tempo") {
    return [
      {
        chain: "tempo",
        address: requiredValue(options.payTo, "--pay-to"),
        assetAddress: TEMPO_USD_TOKEN,
        providerId: options.providerId ?? `mpp/tempo/${options.payTo}`,
      },
    ];
  }
  if (options.chain === "base") {
    return [
      {
        chain: "base",
        address: options.target === "quicknode" ? QUICKNODE_BASE_PAY_TO : BASE_MPP_PAY_TO,
        assetAddress: BASE_USDC,
        providerId: options.target === "quicknode" ? "quicknode/rpc" : "mpp/base/usdc",
      },
    ];
  }
  if (options.target === "quicknode")
    return toCollectorTargets([QUICKNODE_SOLANA_USDC_COLLECTION_TARGET]);
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

function hasContinuation(cursor: CollectorCursor | undefined): cursor is CollectorCursor {
  if (!cursor) return false;
  if (cursor.source === "alchemy" && cursor.chain === "base") return Boolean(cursor.pageKey);
  if ((cursor.source === "alchemy" || cursor.source === "rpc-fast") && cursor.chain === "solana") {
    return Boolean(cursor.oldestSeenSignature);
  }
  if (cursor.source === "dune-sim") return Boolean(cursor.nextOffset);
  if (cursor.source === "goldrush") return Boolean(cursor.hasMore);
  return false;
}

function outputPayload(
  options: CollectTransfersCliOptions,
  mode: "dry-run" | "upsert",
  results: readonly CollectTransfersResult[],
  upsert?: { base: number; tempo: number; solana: number; skipped: number },
) {
  if (!options.summary) return { mode, results, ...(upsert ? { upsert } : {}) };
  return {
    mode,
    pages: results.length,
    transfers: results.reduce((sum, result) => sum + result.transfers.length, 0),
    rawRequestCount: results.reduce((sum, result) => sum + result.rawRequestCount, 0),
    nextCursor: results.at(-1)?.nextCursor,
    ...(upsert ? { upsert } : {}),
    warnings: results.flatMap((result) => result.warnings ?? []),
  };
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
