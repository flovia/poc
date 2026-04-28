import { BASE_CHAIN_ID } from "./constants";

export const isHex = (value: string) => /^0x[0-9a-fA-F]*$/.test(value);

export type HexAddress = `0x${string}`;
export type HexData = `0x${string}`;

export type TxLog = {
  address: HexAddress;
  data: HexData;
  topics: HexData[];
  blockHash: HexAddress;
  blockNumber: string;
  transactionHash: HexAddress;
  transactionIndex: string;
  logIndex: string;
  removed: boolean;
};

export type RawTransaction = {
  hash: HexAddress;
  chainId: number;
  from: HexAddress;
  to: HexAddress | null;
  input: HexData;
  blockNumber: string;
  blockTimestamp: number;
  nonce?: string;
};

export type RawReceipt = {
  transactionHash: HexAddress;
  blockHash: HexAddress;
  blockNumber: string;
  logs: TxLog[];
  status: string;
};

export type FixtureCase = {
  caseId: string;
  caseType: "positive" | "negative";
  method: "direct" | "multicall3" | "other";
  txFile: string;
  receiptFile: string;
  catalogEntries?: Array<{ type: "recipient" | "relayer" | "payer"; value: HexAddress; label?: string | null; confidence?: number; source?: string | null }>;
  expectedObservation?: boolean;
};

export type FixtureManifest = {
  generatedAt: string;
  chainId: number;
  version: string;
  cases: FixtureCase[];
};

export type TransferWithAuthorizationArgs = {
  from: HexAddress;
  to: HexAddress;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: HexData;
  v: number;
  r: HexData;
  s: HexData;
};

export type DecodedMulticallCall = {
  target: HexAddress;
  allowFailure: boolean;
  callData: HexData;
};

export type DecodedMulticall = {
  calls: DecodedMulticallCall[];
};
export type DecodedLogEvent = {
  kind: "authorization" | "transfer";
  index: number;
  txHash: HexAddress;
  from?: HexAddress;
  to?: HexAddress;
  amount?: bigint;
  authorizer?: HexAddress;
  nonce?: HexData;
};
export type SettledEvidence = {
  type: "authorization" | "transfer" | "multicall" | "fixture";
  detail: string;
  raw: unknown;
};

export type PaymentObservationInput = {
  chainId: number;
  txHash: HexAddress;
  txIndex: number;
  blockNumber: number;
  blockTimestamp: number;
  relayer: HexAddress;
  payer: HexAddress;
  recipient: HexAddress;
  amountAtomic: string;
  tokenAddress: HexAddress;
  method: "direct_transferWithAuthorization" | "multicall3_aggregate3";
  topLevelSelector: string;
  caseId: string;
  stableHash: string;
  evidence: SettledEvidence[];
};

export type PaymentObservationRecord = PaymentObservationInput & {
  observationId: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogEntry = {
  caseId: string;
  type: "recipient" | "relayer" | "payer";
  value: HexAddress;
  label?: string | null;
  confidence: number;
  source?: string | null;
};

export type KnownFingerprint = {
  fingerprintType: "recipient" | "relayer" | "payer";
  fingerprintValue: HexAddress;
  providerLabel?: string | null;
  middlemanLabel?: string | null;
  sourceName?: string | null;
  confidence: number;
};

export type AttributionCandidate = {
  candidateType: "recipient_match" | "relayer_match";
  observationId: number;
  matchedValue: HexAddress;
  confidence: number;
  reasons: string[];
  evidenceRefs: string[];
};

export const assertPositiveInt = (value: number | null): value is number => value !== null && Number.isInteger(value) && value >= 0;

export const validateFixtureManifest = (value: unknown): FixtureManifest => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Manifest must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const chainId = Number(candidate.chainId);
  const cases = Array.isArray(candidate.cases) ? candidate.cases : [];

  if (chainId !== BASE_CHAIN_ID) {
    throw new Error(`Manifest chainId mismatch: expected ${BASE_CHAIN_ID}, got ${chainId}`);
  }

  if (!Array.isArray(cases) || cases.length < 1) {
    throw new Error("Manifest must include cases");
  }

  const parsedCases: FixtureCase[] = cases.map((row, index) => {
    if (typeof row !== "object" || row === null) {
      throw new Error(`Case ${index} is invalid`);
    }
    const record = row as Record<string, unknown>;
    if (typeof record.caseId !== "string" || record.caseId.length < 1) {
      throw new Error(`Case ${index} missing caseId`);
    }
    return {
      caseId: record.caseId,
      caseType: (record.caseType as FixtureCase["caseType"]) ?? "negative",
      method: (record.method as FixtureCase["method"]) ?? "other",
      txFile: String(record.txFile),
      receiptFile: String(record.receiptFile),
      catalogEntries: Array.isArray(record.catalogEntries)
        ? record.catalogEntries
            .filter((entry): entry is NonNullable<FixtureCase["catalogEntries"]>[number] =>
              typeof entry === "object" && entry !== null && typeof (entry as Record<string, unknown>).type === "string")
        : [],
      expectedObservation: Boolean(record.expectedObservation),
    } as FixtureCase;
  });

  return {
    generatedAt: String(candidate.generatedAt ?? ""),
    chainId,
    version: String(candidate.version ?? "1"),
    cases: parsedCases,
  };
};
