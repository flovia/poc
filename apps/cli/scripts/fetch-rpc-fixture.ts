import path from "node:path";
import { fetchRpcFixture, writeRpcFixtureFiles } from "../lib/rpc-fixtures";

const usage = () => `Usage: bun scripts/fetch-rpc-fixture.ts --case-id <case-id> --tx-hash <tx-hash> [--out-dir fixtures/raw] [--force]

Environment:
  BASE_RPC_URL                 Base JSON-RPC endpoint
  RPC_REQUEST_TIMEOUT_MS       Optional request timeout in milliseconds
`;

const readArg = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};

const hasArg = (name: string) => process.argv.includes(name);

const readTimeoutMs = () => {
  const value = Number(process.env.RPC_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("RPC_REQUEST_TIMEOUT_MS must be a positive integer");
  return value;
};

export const runFetchRpcFixture = async () => {
  const caseId = readArg("--case-id");
  const txHash = readArg("--tx-hash");
  const outputDir = readArg("--out-dir") ?? path.resolve(process.cwd(), "fixtures", "raw");
  const rpcUrl = process.env.BASE_RPC_URL;
  const timeoutMs = readTimeoutMs();
  const force = hasArg("--force");

  if (!caseId || !txHash || !rpcUrl) {
    throw new Error(usage());
  }

  const fixture = await fetchRpcFixture({ rpcUrl, txHash, timeoutMs });
  const files = writeRpcFixtureFiles(fixture, { caseId, outputDir: path.resolve(process.cwd(), outputDir), force });

  return {
    caseId,
    txHash: fixture.tx.hash,
    blockNumber: fixture.tx.blockNumber,
    blockTimestamp: fixture.tx.blockTimestamp,
    ...files,
  };
};

if (import.meta.main) {
  try {
    const result = await runFetchRpcFixture();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
