import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";
import { toEventSelector, toFunctionSelector } from "viem";
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
import { buildAttributionCandidates } from "../lib/attribution/score";
import { listAttributionCandidates, listPaymentObservations } from "../lib/aggregates/summaries";
import type { FixtureManifest, RawReceipt, RawTransaction } from "../lib/schema";
import { fetchRpcFixture, normalizeRpcReceipt, normalizeRpcTransaction, type RpcReceiptPayload, type RpcTransactionPayload } from "../lib/rpc-fixtures";

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
    expect(decoded.args.value.toString()).toBe("1000001000");
  });

  test("decodes Multicall3 aggregate3 and inner USDC authorization call", () => {
    const { tx } = fixture("bluepages");
    expect(extractTopLevelSelector(tx.input)).toBe(MULTICALL3_AGGREGATE3_SELECTOR);
    const aggregate = decodeAggregate3(tx.input);
    expect(aggregate.calls).toHaveLength(1);
    const inner = extractUsdcCallsFromMulticall(tx.input);
    expect(inner).toHaveLength(1);
    expect(inner[0]?.args.value.toString()).toBe("2000002000");
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
    expect(observation.amountAtomic).toBe("1000002000");
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
