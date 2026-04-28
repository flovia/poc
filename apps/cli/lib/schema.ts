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

export type FingerprintType = "recipient" | "relayer" | "payer";

export type FingerprintProvenance = {
  source?: string | null;
  sourceId?: string | null;
  docPath?: string | null;
  caseId?: string | null;
  transaction?: string | null;
  requestUrl?: string | null;
  collectedAt?: string | null;
};

export type KnownFingerprintSeedEntry = {
  type: FingerprintType;
  value: HexAddress;
  providerLabel?: string | null;
  middlemanLabel?: string | null;
  facilitatorLabel?: string | null;
  confidence: number;
  sourceName?: string | null;
  provenance?: FingerprintProvenance[];
};

export type KnownFingerprintsSeed = {
  schemaVersion: string;
  chainId: number;
  collectedAt: string;
  fingerprints: KnownFingerprintSeedEntry[];
};

export type KnownFingerprint = {
  fingerprintType: FingerprintType;
  fingerprintValue: HexAddress;
  providerLabel?: string | null;
  middlemanLabel?: string | null;
  facilitatorLabel?: string | null;
  sourceName?: string | null;
  confidence: number;
  provenance?: FingerprintProvenance[];
};

export type AttributionCandidate = {
  candidateType: "recipient_match" | "relayer_match";
  observationId: number;
  matchedFingerprintType: FingerprintType;
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
    for (const forbidden of ["catalogEntries", "fingerprints", "confidence", "label", "source", "sourceName"] as const) {
      if (forbidden in record) {
        throw new Error(`Case ${record.caseId} must not include attribution seed field: ${forbidden}`);
      }
    }
    return {
      caseId: record.caseId,
      caseType: (record.caseType as FixtureCase["caseType"]) ?? "negative",
      method: (record.method as FixtureCase["method"]) ?? "other",
      txFile: String(record.txFile),
      receiptFile: String(record.receiptFile),
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

const validateFingerprintType = (value: unknown): FingerprintType => {
  if (value === "recipient" || value === "relayer" || value === "payer") return value;
  throw new Error(`Invalid fingerprint type: ${String(value)}`);
};

const validateHexAddress = (value: unknown, label: string): HexAddress => {
  if (typeof value === "string" && isHex(value) && value.length === 42) return value as HexAddress;
  throw new Error(`Invalid ${label}: ${String(value)}`);
};

const optionalString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const validateConfidence = (value: unknown): number => {
  const confidence = Number(value);
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 100) {
    throw new Error(`Fingerprint confidence must be an integer from 1 to 100, got ${String(value)}`);
  }
  return confidence;
};

const validateProvenance = (value: unknown): FingerprintProvenance[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Fingerprint provenance must be an array");
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) throw new Error(`Fingerprint provenance ${index} is invalid`);
    const record = entry as Record<string, unknown>;
    return {
      source: optionalString(record.source),
      sourceId: optionalString(record.sourceId),
      docPath: optionalString(record.docPath),
      caseId: optionalString(record.caseId),
      transaction: optionalString(record.transaction),
      requestUrl: optionalString(record.requestUrl),
      collectedAt: optionalString(record.collectedAt),
    };
  });
};

export const validateKnownFingerprintsSeed = (value: unknown): KnownFingerprintsSeed => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Known fingerprint seed must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const chainId = Number(candidate.chainId);
  if (chainId !== BASE_CHAIN_ID) {
    throw new Error(`Known fingerprint seed chainId mismatch: expected ${BASE_CHAIN_ID}, got ${chainId}`);
  }
  if (!Array.isArray(candidate.fingerprints)) {
    throw new Error("Known fingerprint seed must include fingerprints");
  }

  return {
    schemaVersion: String(candidate.schemaVersion ?? "1"),
    chainId,
    collectedAt: String(candidate.collectedAt ?? ""),
    fingerprints: candidate.fingerprints.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) throw new Error(`Fingerprint ${index} is invalid`);
      const record = entry as Record<string, unknown>;
      return {
        type: validateFingerprintType(record.type),
        value: validateHexAddress(record.value, `fingerprint ${index} value`),
        providerLabel: optionalString(record.providerLabel),
        middlemanLabel: optionalString(record.middlemanLabel),
        facilitatorLabel: optionalString(record.facilitatorLabel),
        confidence: validateConfidence(record.confidence),
        sourceName: optionalString(record.sourceName),
        provenance: validateProvenance(record.provenance),
      };
    }),
  };
};
