import {
  BASE_USDC_ADDRESS,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_ADDRESS,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
} from "../lib/constants";
import { db, env, initDb, nowIso } from "../lib/db";
import { buildObservationsFromFixture } from "../lib/observations/build-observation";
import { storePaymentObservations } from "../lib/observations/store-observations";
import { resolveBaseRpcUrl, resolveRpcRequestTimeoutMs } from "../lib/rpc-config";
import {
  assertRpcFixtureConsistency,
  fetchRpcBlockRange,
  fetchRpcReceipt,
  normalizeRpcTransaction,
  type FetchLike,
  type RpcBlockWithTransactionsPayload,
  type RpcTransactionPayload,
} from "../lib/rpc-fixtures";

type RunRpcRangeIngestOptions = {
  rpcUrl: string;
  fromBlock: number;
  toBlock: number;
  maxBlocks?: number;
  timeoutMs?: number;
  fetchFn?: FetchLike;
};

export type RpcRangeIngestResult = {
  runId: number;
  fromBlock: number;
  toBlock: number;
  scannedBlocks: number;
  scannedTransactions: number;
  candidateTransactions: number;
  receiptFetches: number;
  observationCount: number;
  insertedObservations: number;
  evidenceRowsUpdated: number;
  skippedMissingReceipts: number;
  skippedFailedReceipts: number;
  databasePath: string;
};

const AUTHORIZATION_SELECTORS = new Set([TRANSFER_WITH_AUTHORIZATION_SELECTOR, EXECUTE_WITH_AUTHORIZATION_SELECTOR].map((selector) => selector.toLowerCase()));

const readArg = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};

const parseBlockNumber = (value: string | null, name: string) => {
  if (value == null) throw new Error(`Missing ${name}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
};

const parseMaxBlocks = (value: string | null) => {
  if (value == null) return 100;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("--max-blocks must be a positive integer");
  return parsed;
};

const sameAddress = (left: string | null | undefined, right: string) => left?.toLowerCase() === right.toLowerCase();

const topLevelSelector = (input: string | undefined) => input?.slice(0, 10).toLowerCase();

export const isRpcRangeCandidate = (tx: Pick<RpcTransactionPayload, "to" | "input" | "data">) => {
  const selector = topLevelSelector(tx.input ?? tx.data);
  if (sameAddress(tx.to, BASE_USDC_ADDRESS)) return selector != null && AUTHORIZATION_SELECTORS.has(selector);
  return sameAddress(tx.to, MULTICALL3_ADDRESS) && selector === MULTICALL3_AGGREGATE3_SELECTOR.toLowerCase();
};

const caseIdForTx = (txHash: string) => `rpc-range-${txHash.slice(2, 14)}`;

const assertRangeWithinLimit = (fromBlock: number, toBlock: number, maxBlocks: number) => {
  if (!Number.isSafeInteger(maxBlocks) || maxBlocks < 1) throw new Error(`maxBlocks must be a positive safe integer: ${maxBlocks}`);
  const blockCount = toBlock - fromBlock + 1;
  if (blockCount > maxBlocks) {
    throw new Error(`RPC range too large: ${blockCount} blocks exceeds max ${maxBlocks}. Pass --max-blocks to override.`);
  }
};

const recordIngestionRun = (result: Omit<RpcRangeIngestResult, "runId">) => {
  const now = nowIso();
  const row = db
    .prepare(
      `INSERT INTO ingestion_runs (
        source, from_block, to_block, scanned_blocks, scanned_transactions,
        candidate_transactions, receipt_fetches, observation_count,
        inserted_observations, evidence_rows_updated, skipped_missing_receipts,
        skipped_failed_receipts, status, raw_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING run_id`,
    )
    .get(
      "rpc_range",
      result.fromBlock,
      result.toBlock,
      result.scannedBlocks,
      result.scannedTransactions,
      result.candidateTransactions,
      result.receiptFetches,
      result.observationCount,
      result.insertedObservations,
      result.evidenceRowsUpdated,
      result.skippedMissingReceipts,
      result.skippedFailedReceipts,
      "completed",
      JSON.stringify(result),
      now,
    ) as { run_id: number };
  return row.run_id;
};

export const runRpcRangeIngest = async ({
  rpcUrl,
  fromBlock,
  toBlock,
  maxBlocks = 100,
  timeoutMs = 30_000,
  fetchFn,
}: RunRpcRangeIngestOptions): Promise<RpcRangeIngestResult> => {
  initDb();
  assertRangeWithinLimit(fromBlock, toBlock, maxBlocks);

  const blocks = await fetchRpcBlockRange({ rpcUrl, fromBlock, toBlock, timeoutMs, fetchFn });
  const result: Omit<RpcRangeIngestResult, "runId"> = {
    fromBlock,
    toBlock,
    scannedBlocks: blocks.length,
    scannedTransactions: 0,
    candidateTransactions: 0,
    receiptFetches: 0,
    observationCount: 0,
    insertedObservations: 0,
    evidenceRowsUpdated: 0,
    skippedMissingReceipts: 0,
    skippedFailedReceipts: 0,
    databasePath: env.databasePath,
  };

  for (const block of blocks) {
    result.scannedTransactions += block.transactions.length;
    for (const rpcTx of block.transactions) {
      if (!isRpcRangeCandidate(rpcTx)) continue;
      result.candidateTransactions += 1;
      result.receiptFetches += 1;

      let receipt: Awaited<ReturnType<typeof fetchRpcReceipt>>;
      try {
        receipt = await fetchRpcReceipt({ rpcUrl, txHash: rpcTx.hash, timeoutMs, fetchFn });
      } catch (error) {
        if (error instanceof Error && error.message.includes("returned null result")) {
          result.skippedMissingReceipts += 1;
          continue;
        }
        throw error;
      }

      if (receipt.status !== "0x1") {
        result.skippedFailedReceipts += 1;
        continue;
      }

      const tx = normalizeRpcTransaction(rpcTx, block);
      assertRpcFixtureConsistency(tx.hash, tx, receipt);
      const observations = buildObservationsFromFixture(caseIdForTx(tx.hash), tx, receipt);
      result.observationCount += observations.length;

      const stored = storePaymentObservations(observations);
      result.insertedObservations += stored.insertedObservations;
      result.evidenceRowsUpdated += stored.evidenceRowsUpdated;
    }
  }

  return { runId: recordIngestionRun(result), ...result };
};

export const runRpcRangeIngestFromCli = async () => {
  const fromBlock = parseBlockNumber(readArg("--from-block"), "--from-block");
  const toBlock = parseBlockNumber(readArg("--to-block"), "--to-block");
  const maxBlocks = parseMaxBlocks(readArg("--max-blocks"));
  return runRpcRangeIngest({ rpcUrl: resolveBaseRpcUrl(), fromBlock, toBlock, maxBlocks, timeoutMs: resolveRpcRequestTimeoutMs() });
};

if (import.meta.main) {
  try {
    const result = await runRpcRangeIngestFromCli();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
