import fs from "node:fs";
import path from "node:path";
import { encodeAbiParameters, encodeFunctionData, pad } from "viem";
import {
  BASE_CHAIN_ID,
  BASE_USDC_ADDRESS,
  EVENT_AUTHORIZATION_USED_TOPIC,
  EVENT_TRANSFER_TOPIC,
  MULTICALL3_ADDRESS,
  MULTICALL3_AGGREGATE3_ABI,
  USDC_TRANSFER_WITH_AUTHORIZATION_ABI,
} from "../lib/constants";
import type { FixtureManifest, FixtureCase, RawReceipt, RawTransaction } from "../lib/schema";
import { buildObservationsFromFixture } from "../lib/observations/build-observation";

type HexData = `0x${string}`;

type FixtureCaseFiles = {
  case: FixtureCase;
  tx: RawTransaction;
  receipt: RawReceipt;
};

const fixtureDir = path.resolve(process.cwd(), "fixtures");
const rawDir = path.join(fixtureDir, "raw");
const expectedDir = path.join(fixtureDir, "expected");

const toHex = (value: number, bytes: number): HexData => `0x${value.toString(16).padStart(bytes * 2, "0")}`;
const hexAddress = (seed: number): HexData => toHex(seed, 20).padEnd(42, "0") as HexData;
const hex32 = (seed: number): HexData => toHex(seed, 32);

const directFunction = USDC_TRANSFER_WITH_AUTHORIZATION_ABI[0];
const aggregate3Function = MULTICALL3_AGGREGATE3_ABI[0];

const encodeIndexedEventLog = (topic0: HexData, topics: HexData[], data: HexData) => ({
  data,
  topics: [topic0, ...topics],
});

const eventTopicsAuthorization = (authorizer: HexData, nonce: HexData) => [
  pad(authorizer, { size: 32 }) as `0x${string}`,
  pad(nonce, { size: 32 }) as `0x${string}`,
];

const eventTopicsTransfer = (from: HexData, to: HexData) => [
  pad(from, { size: 32 }) as `0x${string}`,
  pad(to, { size: 32 }) as `0x${string}`,
];

const eventDataTransfer = (value: bigint) =>
  encodeAbiParameters(
    [
      {
        type: "uint256",
      },
    ],
    [value],
  ) as `0x${string}`;

const positiveDirectCases = [
  "orthogonal-serper",
  "orthogonal-olostep",
  "orthogonal-andi",
  "coingecko",
  "coinstats-news",
  "origindao-quest-board",
] as const;

const positiveMulticallCases = ["bluepages", "paysponge-perplexity", "paysponge-wolframalpha", "aimo-search"] as const;

const buildDirectCase = (caseId: string, caseIndex: number): FixtureCaseFiles => {
  const relayer = hexAddress(0x11_00 + caseIndex);
  const payer = hexAddress(0x22_00 + caseIndex);
  const recipient = hexAddress(0x33_00 + caseIndex);
  const amount = 1_000_000_000n + BigInt(caseIndex) * 1000n;
  const blockNumber = 10_000 + caseIndex;
  const blockTimestamp = 1_700_000_000 + caseIndex;
  const txHash = hex32(0xAAA + caseIndex);
  const blockHash = hex32(0xBBB + caseIndex);
  const nonce = hex32(0x1000 + caseIndex);

  const input = encodeFunctionData({
    abi: [directFunction],
    functionName: "transferWithAuthorization",
    args: [payer, recipient, amount, 0n, 0n, nonce, 27 + caseIndex, hex32(0x222 + caseIndex), hex32(0x333 + caseIndex)],
  });

  const authorizationLog = encodeIndexedEventLog(EVENT_AUTHORIZATION_USED_TOPIC, eventTopicsAuthorization(payer, nonce), "0x");
  const transferLog = encodeIndexedEventLog(EVENT_TRANSFER_TOPIC, eventTopicsTransfer(payer, recipient), eventDataTransfer(amount));

  const tx: RawTransaction = {
    hash: txHash,
    chainId: BASE_CHAIN_ID,
    from: relayer,
    to: BASE_USDC_ADDRESS,
    input,
    blockNumber: String(blockNumber),
    blockTimestamp,
    nonce: hex32(0),
  };

  const receipt: RawReceipt = {
    transactionHash: txHash,
    blockHash,
    blockNumber: String(blockNumber),
    status: "0x1",
    logs: [
      {
        address: BASE_USDC_ADDRESS,
        data: authorizationLog.data,
        topics: authorizationLog.topics,
        blockHash,
        blockNumber: String(blockNumber),
        transactionHash: txHash,
        transactionIndex: toHex(0, 4),
        logIndex: toHex(0, 4),
        removed: false,
      },
      {
        address: BASE_USDC_ADDRESS,
        data: transferLog.data,
        topics: transferLog.topics,
        blockHash,
        blockNumber: String(blockNumber),
        transactionHash: txHash,
        transactionIndex: toHex(0, 4),
        logIndex: toHex(1, 4),
        removed: false,
      },
    ],
  };

  const manifestCase: FixtureCase = {
    caseId,
    caseType: "positive",
    method: "direct",
    txFile: `raw/${caseId}.transaction.json`,
    receiptFile: `raw/${caseId}.receipt.json`,
    catalogEntries: [
      { type: "relayer", value: relayer, label: `${caseId} relayer`, confidence: 95, source: "catalog-seed" },
      { type: "recipient", value: recipient, label: `${caseId} recipient`, confidence: 95, source: "catalog-seed" },
      { type: "payer", value: payer, label: `${caseId} payer`, confidence: 70, source: "catalog-seed" },
    ],
    expectedObservation: true,
  };

  return {
    case: manifestCase,
    tx,
    receipt,
  };
};

const buildMulticallCase = (caseId: string, caseIndex: number): FixtureCaseFiles => {
  const relayer = hexAddress(0x44_00 + caseIndex);
  const payer = hexAddress(0x55_00 + caseIndex);
  const recipient = hexAddress(0x66_00 + caseIndex);
  const amount = 2_000_000_000n + BigInt(caseIndex) * 2000n;
  const blockNumber = 20_000 + caseIndex;
  const blockTimestamp = 1_700_100_000 + caseIndex;
  const txHash = hex32(0x111 + caseIndex);
  const blockHash = hex32(0x222 + caseIndex);
  const nonce = hex32(0x2000 + caseIndex);

  const innerCallData = encodeFunctionData({
    abi: [directFunction],
    functionName: "transferWithAuthorization",
    args: [payer, recipient, amount, 0n, 0n, nonce, 27 + caseIndex, hex32(0x444 + caseIndex), hex32(0x555 + caseIndex)],
  });

  const input = encodeFunctionData({
    abi: [aggregate3Function],
    functionName: "aggregate3",
    args: [[{ target: BASE_USDC_ADDRESS, allowFailure: false, callData: innerCallData }]],
  });

  const authorizationLog = encodeIndexedEventLog(EVENT_AUTHORIZATION_USED_TOPIC, eventTopicsAuthorization(payer, nonce), "0x");
  const transferLog = encodeIndexedEventLog(EVENT_TRANSFER_TOPIC, eventTopicsTransfer(payer, recipient), eventDataTransfer(amount));

  const tx: RawTransaction = {
    hash: txHash,
    chainId: BASE_CHAIN_ID,
    from: relayer,
    to: MULTICALL3_ADDRESS,
    input,
    blockNumber: String(blockNumber),
    blockTimestamp,
    nonce: hex32(1),
  };

  const receipt: RawReceipt = {
    transactionHash: txHash,
    blockHash,
    blockNumber: String(blockNumber),
    status: "0x1",
    logs: [
      {
        address: BASE_USDC_ADDRESS,
        data: authorizationLog.data,
        topics: authorizationLog.topics,
        blockHash,
        blockNumber: String(blockNumber),
        transactionHash: txHash,
        transactionIndex: toHex(0, 4),
        logIndex: toHex(0, 4),
        removed: false,
      },
      {
        address: BASE_USDC_ADDRESS,
        data: transferLog.data,
        topics: transferLog.topics,
        blockHash,
        blockNumber: String(blockNumber),
        transactionHash: txHash,
        transactionIndex: toHex(0, 4),
        logIndex: toHex(1, 4),
        removed: false,
      },
    ],
  };

  const manifestCase: FixtureCase = {
    caseId,
    caseType: "positive",
    method: "multicall3",
    txFile: `raw/${caseId}.transaction.json`,
    receiptFile: `raw/${caseId}.receipt.json`,
    catalogEntries: [
      { type: "relayer", value: relayer, label: `${caseId} relayer`, confidence: 95, source: "catalog-seed" },
      { type: "recipient", value: recipient, label: `${caseId} recipient`, confidence: 95, source: "catalog-seed" },
      { type: "payer", value: payer, label: `${caseId} payer`, confidence: 70, source: "catalog-seed" },
    ],
    expectedObservation: true,
  };

  return {
    case: manifestCase,
    tx,
    receipt,
  };
};

const buildNegativeCase = (caseId: string, caseIndex: number): FixtureCaseFiles => {
  const relayer = hexAddress(0x77_00 + caseIndex);
  const payer = hexAddress(0x88_00 + caseIndex);
  const recipient = hexAddress(0x99_00 + caseIndex);
  const otherToken = hexAddress(0xaa_00 + caseIndex);
  const amount = 3_000_000_000n + BigInt(caseIndex) * 3000n;
  const blockNumber = 30_000 + caseIndex;
  const blockTimestamp = 1_700_200_000 + caseIndex;
  const txHash = hex32(0x300 + caseIndex);
  const blockHash = hex32(0x400 + caseIndex);
  const nonce = hex32(0x3000 + caseIndex);

  const directInput = encodeFunctionData({
    abi: [directFunction],
    functionName: "transferWithAuthorization",
    args: [payer, recipient, amount, 0n, 0n, nonce, 27, hex32(0x666 + caseIndex), hex32(0x777 + caseIndex)],
  });
  const nonUsdcInner = encodeFunctionData({
    abi: [aggregate3Function],
    functionName: "aggregate3",
    args: [[{ target: otherToken, allowFailure: false, callData: directInput }]],
  });
  const erc20TransferInput = `0xa9059cbb${recipient.slice(2).padStart(64, "0")}${amount.toString(16).padStart(64, "0")}` as HexData;

  const tx: RawTransaction = {
    hash: txHash,
    chainId: BASE_CHAIN_ID,
    from: relayer,
    to:
      caseId === "normal-erc20-transfer"
        ? BASE_USDC_ADDRESS
        : caseId === "non-usdc-multicall3"
          ? MULTICALL3_ADDRESS
          : caseId === "missing-required-logs"
            ? BASE_USDC_ADDRESS
            : relayer,
    input:
      caseId === "normal-erc20-transfer"
        ? erc20TransferInput
        : caseId === "non-usdc-multicall3"
          ? nonUsdcInner
          : caseId === "missing-required-logs"
            ? directInput
            : "0x12345678",
    blockNumber: String(blockNumber),
    blockTimestamp,
  };

  const authorizationLog = encodeIndexedEventLog(EVENT_AUTHORIZATION_USED_TOPIC, eventTopicsAuthorization(payer, nonce), "0x");
  const transferLog = encodeIndexedEventLog(EVENT_TRANSFER_TOPIC, eventTopicsTransfer(payer, recipient), eventDataTransfer(amount));

  const logs: RawReceipt["logs"] =
    caseId === "missing-required-logs"
      ? [
          {
            address: BASE_USDC_ADDRESS as HexData,
            data: authorizationLog.data,
            topics: authorizationLog.topics,
            blockHash,
            blockNumber: String(blockNumber),
            transactionHash: txHash,
            transactionIndex: toHex(0, 4),
            logIndex: toHex(0, 4),
            removed: false,
          },
        ]
      : caseId === "normal-erc20-transfer"
        ? [
            {
              address: BASE_USDC_ADDRESS as HexData,
              data: transferLog.data,
              topics: transferLog.topics,
              blockHash,
              blockNumber: String(blockNumber),
              transactionHash: txHash,
              transactionIndex: toHex(0, 4),
              logIndex: toHex(0, 4),
              removed: false,
            },
          ]
        : [];

  return {
    case: {
      caseId,
      caseType: "negative",
      method: caseId === "non-usdc-multicall3" ? "multicall3" : caseId === "missing-required-logs" ? "direct" : "other",
      txFile: `raw/${caseId}.transaction.json`,
      receiptFile: `raw/${caseId}.receipt.json`,
      catalogEntries: [{ type: "recipient", value: recipient, label: `${caseId} catalog-only`, confidence: 90, source: "catalog-seed" }],
      expectedObservation: false,
    },
    tx,
    receipt: { transactionHash: txHash, blockHash, blockNumber: String(blockNumber), status: "0x1", logs },
  };
};

const writeFixtures = () => {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(expectedDir, { recursive: true });

  const cases = [
    ...positiveDirectCases.map((caseId, idx) => buildDirectCase(caseId, idx + 1)),
    ...positiveMulticallCases.map((caseId, idx) => buildMulticallCase(caseId, idx + 1)),
    ...["normal-erc20-transfer", "non-usdc-multicall3", "missing-required-logs", "unrelated-base-tx"].map((caseId, idx) =>
      buildNegativeCase(caseId, idx + 1),
    ),
  ];

  const manifest: FixtureManifest = {
    generatedAt: new Date().toISOString(),
    chainId: BASE_CHAIN_ID,
    version: "1",
    cases: cases.map((entry) => entry.case),
  };

  for (const entry of cases) {
    fs.writeFileSync(path.join(fixtureDir, entry.case.txFile), JSON.stringify(entry.tx, null, 2));
    fs.writeFileSync(path.join(fixtureDir, entry.case.receiptFile), JSON.stringify(entry.receipt, null, 2));
  }

  fs.writeFileSync(path.join(fixtureDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  return cases;
};

const cases = writeFixtures();

const expected = {
  generatedAt: new Date().toISOString(),
  observations: cases
    .filter((entry) => entry.case.expectedObservation ?? false)
    .flatMap((entry) =>
      buildObservationsFromFixture(entry.case.caseId, entry.tx, entry.receipt).map((observation) => ({
        case_id: observation.caseId,
        tx_hash: observation.txHash,
        block_number: observation.blockNumber,
        block_timestamp: observation.blockTimestamp,
        relayer_wallet: observation.relayer,
        payer_wallet: observation.payer,
        recipient_wallet: observation.recipient,
        token_address: observation.tokenAddress,
        amount_atomic: observation.amountAtomic,
        method: observation.method,
        top_level_selector: observation.topLevelSelector,
        stable_hash: observation.stableHash,
      })),
    ),
};

fs.writeFileSync(path.join(expectedDir, "observations.json"), JSON.stringify(expected, null, 2));
console.log(`Generated ${cases.length} fixture cases under ${fixtureDir}`);
