import fs from "node:fs";
import path from "node:path";
import { BASE_CHAIN_ID } from "../../lib/constants";
import { env, initDb, db, type AppDatabase } from "../../lib/db";
import {
  loadPaidProbeResultsFromFile,
  type PaidProbeResult,
  type PaidProbeResults,
} from "../../lib/endpoint-manifest";
import { buildPaymentObservations } from "../../lib/observations/build-observation";
import { storePaymentObservations } from "../../lib/observations/store-observations";
import { fetchRpcFixture } from "../../lib/rpc-fixtures";
import { resolveBaseRpcUrl, resolveRpcRequestTimeoutMs } from "../../lib/rpc-config";
import {
  validateKnownFingerprintsSeed,
  validateSettlementFingerprintPacksSeed,
  type HexAddress,
  type KnownFingerprintSeedEntry,
  type KnownFingerprintsSeed,
  type PaymentObservationInput,
  type RawReceipt,
  type RawTransaction,
  type SettlementFingerprintPack,
  type SettlementFingerprintPacksSeed,
} from "../../lib/schema";

type PaidArtifactInput = {
  path: string;
  artifact: PaidProbeResults;
};

type PaidProbeFingerprintCandidate = {
  sourcePath: string;
  sourceCollectedAt: string;
  result: PaidProbeResult;
};

type FetchFixture = typeof fetchRpcFixture;

type CliOptions = {
  paidPaths: string[];
  outputPath: string;
  knownOutputPath: string | null;
  settlementOutputPath: string | null;
  rpcUrl: string | null;
  timeoutMs: number;
  limit: number | null;
  storeDb: boolean;
};

type FingerprintSkipReason =
  | "missing_tx_hash"
  | "missing_rpc_data"
  | "failed_receipt"
  | "no_observations"
  | "no_matching_challenge_observations";

type EnrichedObservation = PaymentObservationInput & {
  topLevelTo: HexAddress;
  innerSelector: string | null;
};

type PaidProbeFingerprintResult = {
  caseId: string;
  providerName: string;
  serviceName: string;
  routeKind: PaidProbeResult["routeKind"] | null;
  sourcePath: string;
  txHash: string | null;
  status: "fingerprinted" | "skipped";
  skippedReason?: FingerprintSkipReason;
  observationCount: number;
  insertedObservations: number;
  evidenceRowsUpdated: number;
  observations: EnrichedObservation[];
};

type PaidProbeFingerprintArtifact = {
  schemaVersion: "1";
  generatedAt: string;
  mode: "paid_probe_fingerprint_enrichment";
  inputs: Array<{ path: string; collectedAt: string; results: number }>;
  totals: {
    candidates: number;
    fingerprinted: number;
    skipped: number;
    observations: number;
    knownFingerprints: number;
    settlementFingerprints: number;
    insertedObservations: number;
    evidenceRowsUpdated: number;
  };
  results: PaidProbeFingerprintResult[];
  knownFingerprints: KnownFingerprintsSeed;
  settlementFingerprintPacks: SettlementFingerprintPacksSeed;
};

const acquisitionPath = (...segments: string[]) =>
  path.join(process.cwd(), "fixtures", "acquisition", ...segments);

const acquisitionDerivedPath = (...segments: string[]) => acquisitionPath("derived", ...segments);

const defaultPaidPaths = () =>
  ["paid_probe_results.json", "paid_probe_retry_results.json"]
    .map((fileName) => acquisitionPath(fileName))
    .filter((filePath) => fs.existsSync(filePath));

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    paidPaths: [],
    outputPath: acquisitionDerivedPath("paid_probe_fingerprints.json"),
    knownOutputPath: null,
    settlementOutputPath: null,
    rpcUrl: process.env.BASE_RPC_URL ?? null,
    timeoutMs: resolveRpcRequestTimeoutMs(),
    limit: null,
    storeDb: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--paid") options.paidPaths.push(String(argv[++index] ?? ""));
    else if (arg === "--output") options.outputPath = String(argv[++index] ?? options.outputPath);
    else if (arg === "--known-output") options.knownOutputPath = String(argv[++index] ?? "");
    else if (arg === "--settlement-output")
      options.settlementOutputPath = String(argv[++index] ?? "");
    else if (arg === "--rpc-url") options.rpcUrl = String(argv[++index] ?? "");
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index] ?? options.timeoutMs);
    else if (arg === "--limit") options.limit = Number(argv[++index] ?? "0");
    else if (arg === "--store-db") options.storeDb = true;
  }

  return {
    ...options,
    paidPaths: options.paidPaths.length > 0 ? options.paidPaths : defaultPaidPaths(),
  };
};

const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

const writeJson = (filePath: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, jsonReplacer, 2)}\n`);
};

const relativeSourcePath = (filePath: string) => path.relative(process.cwd(), filePath) || ".";

export const loadPaidArtifactInputs = (paidPaths: string[]): PaidArtifactInput[] =>
  paidPaths.map((filePath) => ({
    path: relativeSourcePath(filePath),
    artifact: loadPaidProbeResultsFromFile(filePath),
  }));

export const paidProbeFingerprintCandidates = (
  inputs: PaidArtifactInput[],
): PaidProbeFingerprintCandidate[] => {
  const latestByCase = new Map<string, PaidProbeFingerprintCandidate>();
  for (const input of inputs) {
    for (const result of input.artifact.results) {
      if (result.status !== "paid_with_tx") continue;
      const candidate = {
        sourcePath: input.path,
        sourceCollectedAt: input.artifact.collectedAt,
        result,
      };
      const existing = latestByCase.get(result.caseId);
      const existingTime = Date.parse(
        existing?.sourceCollectedAt ?? existing?.result.executedAt ?? "",
      );
      const candidateTime = Date.parse(input.artifact.collectedAt ?? result.executedAt ?? "");
      if (!existing || candidateTime >= existingTime) latestByCase.set(result.caseId, candidate);
    }
  }
  return [...latestByCase.values()];
};

const normalizeAddress = (value: string | null | undefined) => String(value ?? "").toLowerCase();

export const matchingChallengeObservations = (
  result: PaidProbeResult,
  observations: PaymentObservationInput[],
) => {
  const expectedRecipient = normalizeAddress(result.challenge?.payTo ?? result.payTo);
  const expectedAsset = normalizeAddress(result.challenge?.asset ?? result.asset);
  const expectedAmount = result.challenge?.amountAtomic ?? result.amountAtomic;

  return observations.filter(
    (observation) =>
      normalizeAddress(observation.recipient) === expectedRecipient &&
      normalizeAddress(observation.tokenAddress) === expectedAsset &&
      observation.amountAtomic === expectedAmount,
  );
};

const innerSelectorFromEvidence = (observation: PaymentObservationInput): string | null => {
  const multicall = observation.evidence.find((item) => item.type === "multicall")?.raw as
    | { call?: { callData?: unknown } }
    | undefined;
  const callData = multicall?.call?.callData;
  return typeof callData === "string" && /^0x[0-9a-fA-F]{8}/.test(callData)
    ? callData.slice(0, 10)
    : null;
};

export const enrichObservation = (
  observation: PaymentObservationInput,
  tx: RawTransaction,
): EnrichedObservation => ({
  ...observation,
  topLevelTo: tx.to as HexAddress,
  innerSelector: innerSelectorFromEvidence(observation),
});

const label = (value: string, suffix: string) => `${value} ${suffix}`;

export const buildKnownFingerprintSeedFromPaidProbeObservations = (
  results: PaidProbeFingerprintResult[],
  collectedAt: string,
): KnownFingerprintsSeed => {
  const fingerprints: KnownFingerprintSeedEntry[] = [];

  for (const result of results) {
    for (const observation of result.observations) {
      const provenance = [
        {
          source: "paid-probe-rpc-enrichment",
          sourceId: path.basename(result.sourcePath),
          caseId: result.caseId,
          transaction: observation.txHash,
          requestUrl: undefined,
          collectedAt,
        },
      ];
      fingerprints.push({
        type: "recipient",
        value: observation.recipient,
        providerLabel:
          result.routeKind === "provider_direct_x402"
            ? label(result.providerName, "recipient")
            : null,
        confidence: 75,
        sourceName: "paid-probe-rpc-enrichment",
        provenance,
      });
    }
  }

  return validateKnownFingerprintsSeed({
    schemaVersion: "1",
    chainId: BASE_CHAIN_ID,
    collectedAt,
    fingerprints,
  });
};

const settlementFingerprintId = (observation: EnrichedObservation) =>
  [
    observation.method,
    observation.topLevelTo,
    observation.topLevelSelector,
    observation.innerSelector,
  ]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const buildSettlementFingerprintPacksFromPaidProbeObservations = (
  results: PaidProbeFingerprintResult[],
  collectedAt: string,
): SettlementFingerprintPacksSeed => {
  const packs = new Map<string, SettlementFingerprintPack>();

  for (const result of results) {
    for (const observation of result.observations) {
      const fingerprintId = settlementFingerprintId(observation);
      const evidenceRef = `tx:${observation.txHash}:case:${result.caseId}`;
      const existing = packs.get(fingerprintId);
      if (existing) {
        if (!existing.evidenceRefs.includes(evidenceRef)) existing.evidenceRefs.push(evidenceRef);
        continue;
      }

      packs.set(fingerprintId, {
        fingerprintId,
        clusterId: `${observation.method}_${observation.topLevelSelector.slice(2)}`,
        displayName: `${observation.method} via ${observation.topLevelSelector}`,
        method: observation.method,
        topLevelTo: observation.topLevelTo,
        topLevelSelector: observation.topLevelSelector,
        innerSelector: observation.innerSelector,
        entityId: null,
        evidenceClass: "host_joined",
        baseConfidence: 90,
        reasons: [`observed ${observation.method} settlement in paid probe transaction`],
        evidenceRefs: [evidenceRef],
      });
    }
  }

  return validateSettlementFingerprintPacksSeed({
    schemaVersion: "1",
    chainId: BASE_CHAIN_ID,
    collectedAt,
    fingerprints: [...packs.values()],
  });
};

export const buildPaidProbeFingerprintArtifact = async ({
  inputs,
  rpcUrl,
  timeoutMs = 30_000,
  limit = null,
  fetchFixtureFn = fetchRpcFixture,
  storeDb = false,
  database = db,
}: {
  inputs: PaidArtifactInput[];
  rpcUrl: string;
  timeoutMs?: number;
  limit?: number | null;
  fetchFixtureFn?: FetchFixture;
  storeDb?: boolean;
  database?: AppDatabase;
}): Promise<PaidProbeFingerprintArtifact> => {
  if (storeDb) initDb(database);

  const generatedAt = new Date().toISOString();
  const candidates = paidProbeFingerprintCandidates(inputs).slice(0, limit ?? undefined);
  const results: PaidProbeFingerprintResult[] = [];

  for (const candidate of candidates) {
    const txHash = candidate.result.txHash ?? null;
    const baseResult = {
      caseId: candidate.result.caseId,
      providerName: candidate.result.providerName,
      serviceName: candidate.result.serviceName,
      routeKind: candidate.result.routeKind ?? null,
      sourcePath: candidate.sourcePath,
      txHash,
      observationCount: 0,
      insertedObservations: 0,
      evidenceRowsUpdated: 0,
      observations: [],
    } satisfies Omit<PaidProbeFingerprintResult, "status" | "skippedReason">;

    if (txHash === null) {
      results.push({ ...baseResult, status: "skipped", skippedReason: "missing_tx_hash" });
      continue;
    }

    let fixture: { tx: RawTransaction; receipt: RawReceipt };
    try {
      fixture = await fetchFixtureFn({ rpcUrl, txHash, timeoutMs });
    } catch (error) {
      if (error instanceof Error && error.message.includes("returned null result")) {
        results.push({ ...baseResult, status: "skipped", skippedReason: "missing_rpc_data" });
        continue;
      }
      throw error;
    }

    if (fixture.receipt.status !== "0x1") {
      results.push({ ...baseResult, status: "skipped", skippedReason: "failed_receipt" });
      continue;
    }

    const observations = buildPaymentObservations(
      candidate.result.caseId,
      fixture.tx,
      fixture.receipt,
    );
    if (observations.length === 0) {
      results.push({ ...baseResult, status: "skipped", skippedReason: "no_observations" });
      continue;
    }

    const matchedObservations = matchingChallengeObservations(candidate.result, observations);
    if (matchedObservations.length === 0) {
      results.push({
        ...baseResult,
        status: "skipped",
        skippedReason: "no_matching_challenge_observations",
      });
      continue;
    }

    const stored = storeDb
      ? storePaymentObservations(matchedObservations, database)
      : { insertedObservations: 0, evidenceRowsUpdated: 0 };
    results.push({
      ...baseResult,
      status: "fingerprinted",
      observationCount: matchedObservations.length,
      insertedObservations: stored.insertedObservations,
      evidenceRowsUpdated: stored.evidenceRowsUpdated,
      observations: matchedObservations.map((observation) =>
        enrichObservation(observation, fixture.tx),
      ),
    });
  }

  const knownFingerprints = buildKnownFingerprintSeedFromPaidProbeObservations(
    results,
    generatedAt,
  );
  const settlementFingerprintPacks = buildSettlementFingerprintPacksFromPaidProbeObservations(
    results,
    generatedAt,
  );

  return {
    schemaVersion: "1",
    generatedAt,
    mode: "paid_probe_fingerprint_enrichment",
    inputs: inputs.map((input) => ({
      path: input.path,
      collectedAt: input.artifact.collectedAt,
      results: input.artifact.results.length,
    })),
    totals: {
      candidates: candidates.length,
      fingerprinted: results.filter((result) => result.status === "fingerprinted").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      observations: results.reduce((sum, result) => sum + result.observationCount, 0),
      knownFingerprints: knownFingerprints.fingerprints.length,
      settlementFingerprints: settlementFingerprintPacks.fingerprints.length,
      insertedObservations: results.reduce((sum, result) => sum + result.insertedObservations, 0),
      evidenceRowsUpdated: results.reduce((sum, result) => sum + result.evidenceRowsUpdated, 0),
    },
    results,
    knownFingerprints,
    settlementFingerprintPacks,
  };
};

export const runX402PaidProbeFingerprints = async (options = parseArgs(Bun.argv.slice(2))) => {
  const rpcUrl = options.rpcUrl ?? resolveBaseRpcUrl();
  const artifact = await buildPaidProbeFingerprintArtifact({
    inputs: loadPaidArtifactInputs(options.paidPaths),
    rpcUrl,
    timeoutMs: options.timeoutMs,
    limit: options.limit,
    storeDb: options.storeDb,
  });

  writeJson(options.outputPath, artifact);
  if (options.knownOutputPath) writeJson(options.knownOutputPath, artifact.knownFingerprints);
  if (options.settlementOutputPath) {
    writeJson(options.settlementOutputPath, artifact.settlementFingerprintPacks);
  }

  return {
    status: "ok",
    outputPath: options.outputPath,
    databasePath: options.storeDb ? env.databasePath : null,
    totals: artifact.totals,
  };
};

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runX402PaidProbeFingerprints(), jsonReplacer, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
