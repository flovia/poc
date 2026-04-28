import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";
import { encodeFunctionData, toEventSelector, toFunctionSelector } from "viem";
import {
  BASE_CHAIN_ID,
  BASE_USDC_ADDRESS,
  EVENT_AUTHORIZATION_USED_TOPIC,
  EVENT_TRANSFER_TOPIC,
  EXECUTE_WITH_AUTHORIZATION_SELECTOR,
  MULTICALL3_ADDRESS,
  MULTICALL3_AGGREGATE3_ABI,
  MULTICALL3_AGGREGATE3_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  USDC_TRANSFER_WITH_AUTHORIZATION_ABI,
} from "../lib/constants";
import { extractTopLevelSelector } from "../lib/decoder/selectors";
import { decodeTransferWithAuthorization } from "../lib/decoder/direct-usdc";
import { decodeAggregate3, extractUsdcCallsFromMulticall } from "../lib/decoder/multicall3";
import { decodeReceiptLogsForUsdc } from "../lib/decoder/logs";
import { buildObservationsFromFixture } from "../lib/observations/build-observation";
import { db, initDb, resetDb } from "../lib/db";
import { runIngest } from "../scripts/ingest-fixtures";
import { isRpcRangeCandidate, runRpcRangeIngest } from "../scripts/ingest-rpc-range";
import { runRpcTxIngest } from "../scripts/ingest-rpc-tx";
import { buildAttributionCandidates } from "../lib/attribution/score";
import { listAttributionCandidates, listPaymentObservations } from "../lib/aggregates/summaries";
import type { FixtureManifest, RawReceipt, RawTransaction } from "../lib/schema";
import { fetchRpcFixture, normalizeRpcReceipt, normalizeRpcTransaction, type RpcReceiptPayload, type RpcTransactionPayload } from "../lib/rpc-fixtures";
import { resolveBaseRpcUrl, resolveRpcRequestTimeoutMs } from "../lib/rpc-config";

const fixtureRoot = path.resolve(import.meta.dir, "..", "fixtures");

const readJson = <T>(relativePath: string): T => JSON.parse(fs.readFileSync(path.join(fixtureRoot, relativePath), "utf8")) as T;

const manifest = () => readJson<FixtureManifest>("manifest.json");

const fixture = (caseId: string) => {
  const fixtureCase = manifest().cases.find((item) => item.caseId === caseId);
  if (!fixtureCase) throw new Error(`Missing fixture ${caseId}`);
  return {
    fixtureCase,
    tx: readJson<RawTransaction>(fixtureCase.txFile),
    receipt: readJson<RawReceipt>(fixtureCase.receiptFile),
  };
};

describe("constants", () => {
  test("Base, USDC, Multicall3, selectors, and event topics are pinned", () => {
    expect(BASE_CHAIN_ID).toBe(8453);
    expect(BASE_USDC_ADDRESS).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    expect(MULTICALL3_ADDRESS).toBe("0xcA11bde05977b3631167028862bE2a173976CA11");
    expect(TRANSFER_WITH_AUTHORIZATION_SELECTOR).toBe("0xe3ee160e");
    expect(EXECUTE_WITH_AUTHORIZATION_SELECTOR).toBe("0xcf092995");
    expect(MULTICALL3_AGGREGATE3_SELECTOR).toBe("0x82ad56cb");
    expect(toFunctionSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[0])).toBe(TRANSFER_WITH_AUTHORIZATION_SELECTOR);
    expect(toFunctionSelector(MULTICALL3_AGGREGATE3_ABI[0])).toBe(MULTICALL3_AGGREGATE3_SELECTOR);
    expect(toEventSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[2])).toBe(EVENT_AUTHORIZATION_USED_TOPIC);
    expect(toEventSelector(USDC_TRANSFER_WITH_AUTHORIZATION_ABI[3])).toBe(EVENT_TRANSFER_TOPIC);
  });
});

describe("pure decoders", () => {
  test("extracts and decodes direct USDC transferWithAuthorization calldata", () => {
    const { tx } = fixture("orthogonal-serper");
    expect(extractTopLevelSelector(tx.input)).toBe(TRANSFER_WITH_AUTHORIZATION_SELECTOR);
    const decoded = decodeTransferWithAuthorization(tx.input);
    expect(decoded.args.from).not.toBe(tx.from);
    expect(decoded.args.to).not.toBe(tx.to);
    expect(decoded.args.value).toBeGreaterThan(0n);
  });

  test("decodes Multicall3 aggregate3 and filters non-USDC inner calls", () => {
    const { tx } = fixture("non-usdc-multicall3");
    expect(extractTopLevelSelector(tx.input)).toBe(MULTICALL3_AGGREGATE3_SELECTOR);
    const aggregate = decodeAggregate3(tx.input);
    expect(aggregate.calls).toHaveLength(1);
    const inner = extractUsdcCallsFromMulticall(tx.input);
    expect(inner).toHaveLength(0);
  });

  test("ignores USDC Multicall3 inner calls that are not authorization transfers", () => {
    const calldata = encodeFunctionData({
      abi: MULTICALL3_AGGREGATE3_ABI,
      functionName: "aggregate3",
      args: [[{ target: BASE_USDC_ADDRESS, allowFailure: false, callData: "0xa9059cbb00" }]],
    });

    expect(extractUsdcCallsFromMulticall(calldata)).toHaveLength(0);
  });

  test("decodes USDC AuthorizationUsed and Transfer receipt logs", () => {
    const { receipt } = fixture("coingecko");
    const events = decodeReceiptLogsForUsdc(receipt.logs);
    expect(events.map((event) => event.kind)).toEqual(["authorization", "transfer"]);
  });
});

describe("observation builder", () => {
  test("builds direct observations from authorization fields, not transaction envelope", () => {
    const { fixtureCase, tx, receipt } = fixture("orthogonal-olostep");
    const observations = buildObservationsFromFixture(fixtureCase.caseId, tx, receipt);
    expect(observations).toHaveLength(1);
    const observation = observations[0]!;
    expect(observation.relayer).toBe(tx.from);
    expect(observation.payer).not.toBe(tx.from);
    expect(observation.recipient).not.toBe(tx.to);
    expect(BigInt(observation.amountAtomic)).toBeGreaterThan(0n);
  });

  test("builds Multicall3 observations and rejects incomplete or negative fixtures", () => {
    const multicall = fixture("paysponge-perplexity");
    expect(buildObservationsFromFixture(multicall.fixtureCase.caseId, multicall.tx, multicall.receipt)).toHaveLength(1);

    for (const caseId of ["normal-erc20-transfer", "non-usdc-multicall3", "missing-required-logs", "unrelated-base-tx"]) {
      const negative = fixture(caseId);
      expect(buildObservationsFromFixture(negative.fixtureCase.caseId, negative.tx, negative.receipt), caseId).toHaveLength(0);
    }
  });
});

describe("storage and attribution", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("ingest is idempotent and catalog entries do not create observations", () => {
    const first = runIngest();
    const second = runIngest();
    expect(first.insertedObservations).toBe(10);
    expect(second.insertedObservations).toBe(0);
    expect(first.fixtureCases).toBe(14);
    expect(listPaymentObservations()).toHaveLength(10);
  });

  test("attribution candidates include confidence, reasons, evidence refs, and observations have no final labels", () => {
    runIngest();
    const result = buildAttributionCandidates();
    expect(result.observationCount).toBe(10);
    expect(result.candidateCount).toBeGreaterThanOrEqual(20);

    const candidates = listAttributionCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(JSON.parse(candidate.reasons_json).length).toBeGreaterThan(0);
      expect(JSON.parse(candidate.evidence_refs_json).length).toBeGreaterThan(0);
    }

    const columns = db.prepare("PRAGMA table_info(payment_observations)").all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).not.toContain("provider_label");
    expect(columns.map((column) => column.name)).not.toContain("middleman_label");
  });
});

describe("RPC fixture capture", () => {
  const rpcTx: RpcTransactionPayload = {
    hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chainId: "0x2105",
    from: "0x0000000000000000000000000000000000000001",
    to: BASE_USDC_ADDRESS,
    input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00`,
    blockNumber: "0x2a",
    nonce: "0x7",
  };

  const rpcReceipt: RpcReceiptPayload = {
    transactionHash: rpcTx.hash,
    blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    blockNumber: "0x2a",
    status: "0x1",
    logs: [
      {
        address: BASE_USDC_ADDRESS,
        data: "0x",
        topics: [EVENT_AUTHORIZATION_USED_TOPIC],
        blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        blockNumber: "0x2a",
        transactionHash: rpcTx.hash,
        transactionIndex: "0x0",
        logIndex: "0x0",
        removed: false,
      },
    ],
  };

  test("normalizes RPC transaction and receipt payloads into frozen raw fixture shapes", () => {
    const tx = normalizeRpcTransaction(rpcTx, { timestamp: "0x65" });
    const receipt = normalizeRpcReceipt(rpcReceipt);

    expect(tx).toEqual({
      hash: rpcTx.hash as RawTransaction["hash"],
      chainId: BASE_CHAIN_ID,
      from: rpcTx.from as RawTransaction["from"],
      to: BASE_USDC_ADDRESS as RawTransaction["to"],
      input: rpcTx.input as RawTransaction["input"],
      blockNumber: "42",
      blockTimestamp: 101,
      nonce: "0x7",
    } satisfies RawTransaction);
    expect(receipt.blockNumber).toBe("42");
    expect(receipt.logs[0]?.blockNumber).toBe("42");
    expect(receipt.logs[0]?.removed).toBe(false);
  });

  test("fetches tx, receipt, and block timestamp through a mocked JSON-RPC transport", async () => {
    const calls: string[] = [];
    const fixture = await fetchRpcFixture({
      rpcUrl: "https://example.invalid",
      txHash: rpcTx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        calls.push(body.method);
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
            ? rpcTx
            : body.method === "eth_getTransactionReceipt"
              ? rpcReceipt
              : { timestamp: "0x65" };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(calls).toEqual(["eth_chainId", "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_getBlockByNumber"]);
    expect(fixture.tx.blockTimestamp).toBe(101);
    expect(String(fixture.receipt.transactionHash)).toBe(rpcTx.hash);
  });
});

describe("RPC env config", () => {
  test("prefers explicit Base RPC URL over Alchemy API key", () => {
    expect(resolveBaseRpcUrl({ BASE_RPC_URL: "https://rpc.example", ALCHEMY_API_KEY: "secret" })).toBe("https://rpc.example");
  });

  test("builds Base Alchemy endpoint when only Alchemy API key is present", () => {
    expect(resolveBaseRpcUrl({ ALCHEMY_API_KEY: "secret" })).toBe("https://base-mainnet.g.alchemy.com/v2/secret");
  });

  test("validates RPC timeout", () => {
    expect(resolveRpcRequestTimeoutMs({ RPC_REQUEST_TIMEOUT_MS: "1234" })).toBe(1234);
    expect(() => resolveRpcRequestTimeoutMs({ RPC_REQUEST_TIMEOUT_MS: "0" })).toThrow("positive integer");
  });
});

describe("RPC transaction ingest", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("ingests a user supplied tx hash idempotently through mocked RPC", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const calls: string[] = [];

    const fetchFn = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string };
      calls.push(body.method);
      const result =
        body.method === "eth_chainId"
          ? "0x2105"
          : body.method === "eth_getTransactionByHash"
            ? { ...tx, blockNumber: `0x${Number(tx.blockNumber).toString(16)}` }
            : body.method === "eth_getTransactionReceipt"
              ? { ...receipt, blockNumber: `0x${Number(receipt.blockNumber).toString(16)}` }
              : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    };

    const first = await runRpcTxIngest({ rpcUrl: "https://example.invalid", txHash: tx.hash, fetchFn });
    const second = await runRpcTxIngest({ rpcUrl: "https://example.invalid", txHash: tx.hash, fetchFn });

    expect(first.insertedObservations).toBe(1);
    expect(second.insertedObservations).toBe(0);
    expect(second.evidenceRowsUpdated).toBe(0);
    expect(first.observationCount).toBe(1);
    expect(second.observationCount).toBe(1);
    expect(listPaymentObservations()).toHaveLength(1);
    expect(calls.filter((method) => method === "eth_getTransactionReceipt")).toHaveLength(2);
  });

  test("does not duplicate a transaction already inserted from fixtures", async () => {
    runIngest();
    const { tx, receipt } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
              ? tx
              : body.method === "eth_getTransactionReceipt"
                ? receipt
                : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(result.observationCount).toBe(1);
    expect(result.insertedObservations).toBe(0);
    expect(listPaymentObservations()).toHaveLength(10);
  });

  test("does not create observations when RPC receipt failed", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const result =
          body.method === "eth_chainId"
            ? "0x2105"
            : body.method === "eth_getTransactionByHash"
              ? tx
              : body.method === "eth_getTransactionReceipt"
                ? { ...receipt, status: "0x0" }
                : { timestamp: `0x${tx.blockTimestamp.toString(16)}` };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
      },
    });

    expect(result.insertedObservations).toBe(0);
    expect(result.observationCount).toBe(0);
    expect(result.skippedReason).toBe("failed_receipt");
    expect(listPaymentObservations()).toHaveLength(0);
  });

  test("does not create observations when RPC receipt is missing", async () => {
    const { tx } = fixture("orthogonal-serper");
    const result = await runRpcTxIngest({
      rpcUrl: "https://example.invalid",
      txHash: tx.hash,
      fetchFn: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { method: string };
        const payload =
          body.method === "eth_getTransactionReceipt"
            ? { jsonrpc: "2.0", id: 1, result: null }
            : { jsonrpc: "2.0", id: 1, result: body.method === "eth_chainId" ? "0x2105" : tx };
        return new Response(JSON.stringify(payload), { status: 200 });
      },
    });

    expect(result.insertedObservations).toBe(0);
    expect(result.observationCount).toBe(0);
    expect(result.skippedReason).toBe("missing_rpc_data");
    expect(listPaymentObservations()).toHaveLength(0);
  });
});

describe("RPC range ingest", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  test("identifies only USDC authorization and Multicall3 aggregate3 candidates", () => {
    expect(isRpcRangeCandidate({ to: BASE_USDC_ADDRESS, input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00` })).toBe(true);
    expect(isRpcRangeCandidate({ to: BASE_USDC_ADDRESS, input: `${EXECUTE_WITH_AUTHORIZATION_SELECTOR}00` })).toBe(true);
    expect(isRpcRangeCandidate({ to: MULTICALL3_ADDRESS, input: `${MULTICALL3_AGGREGATE3_SELECTOR}00` })).toBe(true);
    expect(isRpcRangeCandidate({ to: BASE_USDC_ADDRESS, input: "0xa9059cbb00" })).toBe(false);
    expect(isRpcRangeCandidate({ to: "0x0000000000000000000000000000000000000002", input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00` })).toBe(false);
  });

  test("scans a bounded range, fetches receipts only for candidates, and remains idempotent", async () => {
    const { tx, receipt } = fixture("orthogonal-serper");
    const blockNumber = Number(tx.blockNumber);
    const blockNumberHex = `0x${blockNumber.toString(16)}`;
    const nonCandidate = {
      ...tx,
      hash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      to: "0x0000000000000000000000000000000000000002" as RawTransaction["to"],
      input: `${TRANSFER_WITH_AUTHORIZATION_SELECTOR}00` as RawTransaction["input"],
    };
    const irrelevantMulticall = {
      ...tx,
      hash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as RawTransaction["hash"],
      to: MULTICALL3_ADDRESS as RawTransaction["to"],
      input: encodeFunctionData({
        abi: MULTICALL3_AGGREGATE3_ABI,
        functionName: "aggregate3",
        args: [[{ target: BASE_USDC_ADDRESS, allowFailure: false, callData: "0xa9059cbb00" as `0x${string}` }]],
      }) as RawTransaction["input"],
    };
    const irrelevantMulticallReceipt: RawReceipt = { ...receipt, transactionHash: irrelevantMulticall.hash, logs: [] };
    const calls: Array<{ method: string; params: unknown[] }> = [];

    const fetchFn = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      calls.push({ method: body.method, params: body.params });

      if (body.method === "eth_chainId") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2105" }), { status: 200 });
      }

      if (body.method === "eth_getBlockByNumber") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              number: blockNumberHex,
              timestamp: `0x${tx.blockTimestamp.toString(16)}`,
              transactions: [
                { ...tx, blockNumber: blockNumberHex },
                { ...irrelevantMulticall, blockNumber: blockNumberHex },
                { ...nonCandidate, blockNumber: blockNumberHex },
              ],
            },
          }),
          { status: 200 },
        );
      }

      const result = body.params[0] === tx.hash ? receipt : irrelevantMulticallReceipt;
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    };

    const first = await runRpcRangeIngest({ rpcUrl: "https://example.invalid", fromBlock: blockNumber, toBlock: blockNumber, fetchFn });
    const second = await runRpcRangeIngest({ rpcUrl: "https://example.invalid", fromBlock: blockNumber, toBlock: blockNumber, fetchFn });

    expect(first.scannedBlocks).toBe(1);
    expect(first.runId).toBeGreaterThan(0);
    expect(first.scannedTransactions).toBe(3);
    expect(first.candidateTransactions).toBe(2);
    expect(first.receiptFetches).toBe(2);
    expect(first.observationCount).toBe(1);
    expect(first.insertedObservations).toBe(1);
    expect(second.insertedObservations).toBe(0);
    expect(second.evidenceRowsUpdated).toBe(0);
    expect(listPaymentObservations()).toHaveLength(1);
    expect(calls.filter((call) => call.method === "eth_getTransactionReceipt")).toHaveLength(4);
    expect(calls.filter((call) => call.method === "eth_getTransactionReceipt").map((call) => call.params[0])).toEqual([
      tx.hash,
      irrelevantMulticall.hash,
      tx.hash,
      irrelevantMulticall.hash,
    ]);
    expect(calls.filter((call) => call.method === "eth_getBlockByNumber")[0]?.params).toEqual([blockNumberHex, true]);

    const runs = db.prepare("SELECT source, from_block, to_block, observation_count, inserted_observations FROM ingestion_runs ORDER BY run_id").all() as Array<{
      source: string;
      from_block: number;
      to_block: number;
      observation_count: number;
      inserted_observations: number;
    }>;
    expect(runs).toEqual([
      { source: "rpc_range", from_block: blockNumber, to_block: blockNumber, observation_count: 1, inserted_observations: 1 },
      { source: "rpc_range", from_block: blockNumber, to_block: blockNumber, observation_count: 1, inserted_observations: 0 },
    ]);
  });

  test("rejects ranges above the configured max block guard before RPC calls", async () => {
    const calls: string[] = [];
    await expect(
      runRpcRangeIngest({
        rpcUrl: "https://example.invalid",
        fromBlock: 42,
        toBlock: 44,
        maxBlocks: 2,
        fetchFn: async (_url, init) => {
          calls.push(JSON.parse(String(init?.body)).method);
          return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2105" }), { status: 200 });
        },
      }),
    ).rejects.toThrow("RPC range too large");
    expect(calls).toHaveLength(0);
  });
});
