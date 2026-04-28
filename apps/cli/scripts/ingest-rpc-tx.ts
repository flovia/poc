import { env, initDb } from "../lib/db";
import { buildObservationsFromFixture } from "../lib/observations/build-observation";
import { storePaymentObservations } from "../lib/observations/store-observations";
import { fetchRpcFixture, type FetchLike } from "../lib/rpc-fixtures";

type RunRpcTxIngestOptions = {
  rpcUrl: string;
  txHash: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
};

export type RpcTxIngestResult = {
  txHash: string;
  observationCount: number;
  insertedObservations: number;
  evidenceRowsUpdated: number;
  databasePath: string;
  skippedReason?: "missing_rpc_data" | "failed_receipt" | "no_observations";
};

const readArg = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};

const readTimeoutMs = () => {
  const value = Number(process.env.RPC_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("RPC_REQUEST_TIMEOUT_MS must be a positive integer");
  return value;
};

export const runRpcTxIngest = async ({
  rpcUrl,
  txHash,
  timeoutMs = 30_000,
  fetchFn,
}: RunRpcTxIngestOptions): Promise<RpcTxIngestResult> => {
  initDb();

  let fixture: Awaited<ReturnType<typeof fetchRpcFixture>>;
  try {
    fixture = await fetchRpcFixture({ rpcUrl, txHash, timeoutMs, fetchFn });
  } catch (error) {
    if (error instanceof Error && error.message.includes("returned null result")) {
      return {
        txHash,
        observationCount: 0,
        insertedObservations: 0,
        evidenceRowsUpdated: 0,
        databasePath: env.databasePath,
        skippedReason: "missing_rpc_data",
      };
    }
    throw error;
  }

  if (fixture.receipt.status !== "0x1") {
    return {
      txHash: fixture.tx.hash,
      observationCount: 0,
      insertedObservations: 0,
      evidenceRowsUpdated: 0,
      databasePath: env.databasePath,
      skippedReason: "failed_receipt",
    };
  }

  const caseId = `rpc-${fixture.tx.hash.slice(2, 14)}`;
  const observations = buildObservationsFromFixture(caseId, fixture.tx, fixture.receipt);

  if (observations.length === 0) {
    return {
      txHash: fixture.tx.hash,
      observationCount: 0,
      insertedObservations: 0,
      evidenceRowsUpdated: 0,
      databasePath: env.databasePath,
      skippedReason: "no_observations",
    };
  }

  const stored = storePaymentObservations(observations);
  return {
    txHash: fixture.tx.hash,
    observationCount: observations.length,
    insertedObservations: stored.insertedObservations,
    evidenceRowsUpdated: stored.evidenceRowsUpdated,
    databasePath: env.databasePath,
  };
};

export const runRpcTxIngestFromCli = async () => {
  const txHash = readArg("--tx-hash") ?? process.argv[2];
  const rpcUrl = process.env.BASE_RPC_URL;
  if (!txHash || !rpcUrl) {
    throw new Error("Usage: bun scripts/ingest-rpc-tx.ts --tx-hash <tx-hash>\nEnvironment: BASE_RPC_URL, RPC_REQUEST_TIMEOUT_MS");
  }

  return runRpcTxIngest({ rpcUrl, txHash, timeoutMs: readTimeoutMs() });
};

if (import.meta.main) {
  try {
    const result = await runRpcTxIngestFromCli();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
