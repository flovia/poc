import fs from "node:fs";
import path from "node:path";
import { BASE_CHAIN_ID } from "./constants";
import type { HexAddress, HexData, RawReceipt, RawTransaction, TxLog } from "./schema";

type JsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: number | string;
  result?: T | null;
  error?: { code: number; message: string };
};

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type RpcTransactionPayload = {
  hash: string;
  chainId?: string | number | null;
  from: string;
  to: string | null;
  input?: string;
  data?: string;
  blockNumber: string | number;
  nonce?: string;
};

export type RpcReceiptPayload = {
  transactionHash: string;
  blockHash: string;
  blockNumber: string | number;
  logs: Array<{
    address: string;
    data: string;
    topics: string[];
    blockHash: string;
    blockNumber: string | number;
    transactionHash: string;
    transactionIndex: string;
    logIndex: string;
    removed?: boolean;
  }>;
  status: string;
};

export type RpcBlockPayload = {
  timestamp: string | number;
};

export type FetchRpcFixtureOptions = {
  rpcUrl: string;
  txHash: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
};

type WriteRpcFixtureOptions = { caseId: string; outputDir: string; force?: boolean };

const isHex = (value: string): value is `0x${string}` => /^0x[0-9a-fA-F]*$/.test(value);

const isQuantity = (value: string): value is `0x${string}` => /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value);

const requireHex = (value: string, label: string): `0x${string}` => {
  if (!isHex(value)) throw new Error(`${label} must be hex: ${value}`);
  return value;
};

const requireHexLength = (value: string, label: string, bytes: number): `0x${string}` => {
  const hex = requireHex(value, label);
  if (hex.length !== 2 + bytes * 2) throw new Error(`${label} must be ${bytes} bytes: ${value}`);
  return hex;
};

const toNumber = (value: string | number, label: string): number => {
  if (typeof value === "string" && value.startsWith("0x") && !isQuantity(value)) throw new Error(`${label} must be a JSON-RPC quantity`);
  const parsed = typeof value === "number" ? value : value.startsWith("0x") ? Number(BigInt(value)) : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative safe integer`);
  return parsed;
};

const toDecimalString = (value: string | number, label: string) => String(toNumber(value, label));

const toChainId = (value: string | number | null | undefined) => {
  if (value == null) return BASE_CHAIN_ID;
  return toNumber(value, "chainId");
};

export const normalizeRpcTransaction = (tx: RpcTransactionPayload, block: RpcBlockPayload): RawTransaction => {
  const input = tx.input ?? tx.data;
  if (input == null) throw new Error("RPC transaction missing input");

  return {
    hash: requireHexLength(tx.hash, "transaction hash", 32) as HexAddress,
    chainId: toChainId(tx.chainId),
    from: requireHexLength(tx.from, "transaction from", 20) as HexAddress,
    to: tx.to == null ? null : (requireHexLength(tx.to, "transaction to", 20) as HexAddress),
    input: requireHex(input, "transaction input") as HexData,
    blockNumber: toDecimalString(tx.blockNumber, "transaction blockNumber"),
    blockTimestamp: toNumber(block.timestamp, "block timestamp"),
    nonce: tx.nonce,
  };
};

const normalizeLog = (log: RpcReceiptPayload["logs"][number]): TxLog => ({
  address: requireHexLength(log.address, "log address", 20) as HexAddress,
  data: requireHex(log.data, "log data") as HexData,
  topics: log.topics.map((topic, index) => requireHexLength(topic, `log topic ${index}`, 32) as HexData),
  blockHash: requireHexLength(log.blockHash, "log blockHash", 32) as HexAddress,
  blockNumber: toDecimalString(log.blockNumber, "log blockNumber"),
  transactionHash: requireHexLength(log.transactionHash, "log transactionHash", 32) as HexAddress,
  transactionIndex: log.transactionIndex,
  logIndex: log.logIndex,
  removed: Boolean(log.removed),
});

export const normalizeRpcReceipt = (receipt: RpcReceiptPayload): RawReceipt => ({
  transactionHash: requireHexLength(receipt.transactionHash, "receipt transactionHash", 32) as HexAddress,
  blockHash: requireHexLength(receipt.blockHash, "receipt blockHash", 32) as HexAddress,
  blockNumber: toDecimalString(receipt.blockNumber, "receipt blockNumber"),
  logs: receipt.logs.map(normalizeLog),
  status: receipt.status,
});

const assertSame = (label: string, left: string | number, right: string | number) => {
  if (String(left).toLowerCase() !== String(right).toLowerCase()) throw new Error(`${label} mismatch: ${left} !== ${right}`);
};

const assertFixtureConsistency = (requestedHash: `0x${string}`, tx: RawTransaction, receipt: RawReceipt) => {
  assertSame("requested tx hash", requestedHash, tx.hash);
  assertSame("receipt transaction hash", tx.hash, receipt.transactionHash);
  assertSame("transaction block number", tx.blockNumber, receipt.blockNumber);

  for (const [index, log] of receipt.logs.entries()) {
    assertSame(`log ${index} transaction hash`, tx.hash, log.transactionHash);
    assertSame(`log ${index} block number`, receipt.blockNumber, log.blockNumber);
    assertSame(`log ${index} block hash`, receipt.blockHash, log.blockHash);
  }
};

const rpcCall = async <T>(rpcUrl: string, method: string, params: unknown[], fetchFn: FetchLike, timeoutMs: number): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status} for ${method}`);
    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (payload.error) throw new Error(`RPC ${method} failed: ${payload.error.message}`);
    if (payload.result == null) throw new Error(`RPC ${method} returned null result`);
    return payload.result;
  } finally {
    clearTimeout(timer);
  }
};

export const fetchRpcFixture = async ({
  rpcUrl,
  txHash,
  timeoutMs = 30_000,
  fetchFn = fetch,
}: FetchRpcFixtureOptions): Promise<{ tx: RawTransaction; receipt: RawReceipt }> => {
  const normalizedHash = requireHex(txHash, "txHash");
  const chainId = await rpcCall<string>(rpcUrl, "eth_chainId", [], fetchFn, timeoutMs);
  const normalizedChainId = toNumber(chainId, "eth_chainId");
  if (normalizedChainId !== BASE_CHAIN_ID) throw new Error(`RPC chainId mismatch: expected ${BASE_CHAIN_ID}, got ${normalizedChainId}`);

  const tx = await rpcCall<RpcTransactionPayload>(rpcUrl, "eth_getTransactionByHash", [normalizedHash], fetchFn, timeoutMs);
  const receipt = await rpcCall<RpcReceiptPayload>(rpcUrl, "eth_getTransactionReceipt", [normalizedHash], fetchFn, timeoutMs);
  const block = await rpcCall<RpcBlockPayload>(rpcUrl, "eth_getBlockByNumber", [receipt.blockNumber, false], fetchFn, timeoutMs);

  const fixture = {
    tx: normalizeRpcTransaction(tx, block),
    receipt: normalizeRpcReceipt(receipt),
  };
  assertFixtureConsistency(normalizedHash, fixture.tx, fixture.receipt);
  return fixture;
};

export const writeRpcFixtureFiles = (
  fixture: { tx: RawTransaction; receipt: RawReceipt },
  options: WriteRpcFixtureOptions,
) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(options.caseId)) throw new Error(`Invalid fixture caseId: ${options.caseId}`);

  fs.mkdirSync(options.outputDir, { recursive: true });
  const root = path.resolve(options.outputDir);
  const txPath = path.resolve(root, `${options.caseId}.transaction.json`);
  const receiptPath = path.resolve(root, `${options.caseId}.receipt.json`);
  if (!txPath.startsWith(`${root}${path.sep}`) || !receiptPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Fixture output path escaped outputDir");
  }
  if (!options.force && (fs.existsSync(txPath) || fs.existsSync(receiptPath))) {
    throw new Error(`Fixture files already exist for ${options.caseId}; pass --force to overwrite`);
  }

  fs.writeFileSync(txPath, `${JSON.stringify(fixture.tx, null, 2)}\n`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(fixture.receipt, null, 2)}\n`);

  return { txPath, receiptPath };
};
