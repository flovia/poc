import path from "node:path";
import fs from "node:fs";
import { db, initDb, resetDb, env } from "../lib/db";
import { runIngest } from "./ingest-fixtures";
import { buildAttributionCandidates } from "../lib/attribution/score";
import { seedKnownFingerprintsFromFile } from "../lib/attribution/fingerprints";
import { seedProviderEndpointClaimsFromFile } from "../lib/attribution/provider-claims";
import { seedSettlementFingerprintPacksFromFile } from "../lib/attribution/settlement-fingerprints";
import { buildWalletUsageGraph } from "../lib/attribution/wallet-graph";
import { buildDailyMetrics } from "../lib/aggregates/daily";
import { rebuildWalletProfiles } from "../lib/aggregates/wallets";
import { listAttributionCandidates, listPaymentObservations } from "../lib/aggregates/summaries";
import { runReport } from "./report";
import { validateFixtureManifest, type RawReceipt, type RawTransaction } from "../lib/schema";
import { buildPaymentObservations } from "../lib/observations/build-observation";

const readExpected = <T>(filePath: string): T => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected file not found: ${absolutePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as T;
};

const sortObservations = (observations: Array<Record<string, unknown>>) =>
  observations
    .slice()
    .sort(
      (left, right) =>
        String(left.case_id).localeCompare(String(right.case_id)) ||
        String(left.tx_hash).localeCompare(String(right.tx_hash)),
    );

const sortCandidates = (candidates: Array<Record<string, unknown>>) =>
  candidates
    .slice()
    .sort(
      (left, right) =>
        String(left.case_id).localeCompare(String(right.case_id)) ||
        String(left.candidate_type).localeCompare(String(right.candidate_type)) ||
        String(left.matched_fingerprint_value).localeCompare(
          String(right.matched_fingerprint_value),
        ) ||
        String(left.role ?? "").localeCompare(String(right.role ?? "")),
    );

const normalize = (observation: Record<string, unknown>) => {
  const clone = structuredClone(observation);
  return clone;
};

resetDb();
initDb();

seedKnownFingerprintsFromFile();
seedProviderEndpointClaimsFromFile();
seedSettlementFingerprintPacksFromFile();
runIngest();
buildAttributionCandidates();
buildDailyMetrics();
rebuildWalletProfiles();

const observed = listPaymentObservations().map((row) => ({
  case_id: row.case_id,
  tx_hash: row.tx_hash,
  block_number: row.block_number,
  block_timestamp: row.block_timestamp,
  relayer_wallet: row.relayer_wallet,
  payer_wallet: row.payer_wallet,
  recipient_wallet: row.recipient_wallet,
  token_address: row.token_address,
  amount_atomic: row.amount_atomic,
  method: row.method,
  top_level_selector: row.top_level_selector,
  stable_hash: row.stable_hash,
}));

const expected = readExpected<{ observations: Array<Record<string, unknown>> }>(
  path.join(env.fixturesDir, "expected", "observations.json"),
);
const expectedCandidates = readExpected<{ candidates: Array<Record<string, unknown>> }>(
  path.join(env.fixturesDir, "expected", "attribution_candidates.json"),
);
const expectedWalletGraph = readExpected<{ graph: Record<string, unknown> }>(
  path.join(env.fixturesDir, "expected", "wallet_usage_graph.json"),
);

const manifest = validateFixtureManifest(readExpected<Record<string, unknown>>(env.manifestPath));
const negativeObservationCount = manifest.cases
  .filter((fixtureCase) => fixtureCase.caseType === "negative")
  .flatMap((fixtureCase) => {
    const tx = readExpected<RawTransaction>(path.join(env.fixturesDir, fixtureCase.txFile));
    const receipt = readExpected<RawReceipt>(path.join(env.fixturesDir, fixtureCase.receiptFile));
    return buildPaymentObservations(fixtureCase.caseId, tx, receipt);
  }).length;

const observedSorted = sortObservations(observed.map(normalize));
const expectedSorted = sortObservations(expected.observations.map((row) => normalize(row)));

if (JSON.stringify(observedSorted) !== JSON.stringify(expectedSorted)) {
  console.error("Observed payment observations do not match expected/observations.json");
  console.error(`Observed: ${observedSorted.length}`);
  console.error(`Expected: ${expectedSorted.length}`);
  process.exit(1);
}

if (observedSorted.length !== 10) {
  console.error(`Expected 10 payment observations, got ${observedSorted.length}`);
  process.exit(1);
}

if (negativeObservationCount !== 0) {
  console.error(`Negative fixtures produced ${negativeObservationCount} observations`);
  process.exit(1);
}

const paymentColumns = db.prepare("PRAGMA table_info(payment_observations)").all() as Array<{
  name: string;
}>;
const paymentColumnNames = paymentColumns.map((column) => column.name);
if (
  paymentColumnNames.includes("provider_label") ||
  paymentColumnNames.includes("middleman_label")
) {
  console.error("payment_observations must not contain provider or middleman final labels");
  process.exit(1);
}

const candidateRows = listAttributionCandidates();
if (candidateRows.length === 0) {
  console.error("Expected attribution candidates");
  process.exit(1);
}
for (const candidate of candidateRows) {
  if (
    candidate.confidence <= 0 ||
    JSON.parse(candidate.reasons_json).length === 0 ||
    JSON.parse(candidate.evidence_refs_json).length === 0
  ) {
    console.error("Attribution candidate missing confidence, reasons, or evidence refs");
    process.exit(1);
  }
}

const observationsById = new Map(listPaymentObservations().map((row) => [row.observation_id, row]));
const observedCandidates = candidateRows.map((row) => {
  const observation = observationsById.get(row.observation_id);
  if (!observation)
    throw new Error(
      `Candidate ${row.candidate_id} references missing observation ${row.observation_id}`,
    );
  return {
    case_id: observation.case_id,
    candidate_type: row.candidate_type,
    matched_fingerprint_type: row.matched_fingerprint_type,
    matched_fingerprint_value: row.matched_fingerprint_value,
    matched_claim_id: row.matched_claim_id,
    matched_settlement_fingerprint_id: row.matched_settlement_fingerprint_id,
    entity_id: row.entity_id,
    role: row.role,
    confidence: row.confidence,
    reasons: JSON.parse(row.reasons_json) as string[],
    evidence_refs: JSON.parse(row.evidence_refs_json) as string[],
  };
});

const observedCandidatesSorted = sortCandidates(observedCandidates.map(normalize));
const expectedCandidatesSorted = sortCandidates(
  expectedCandidates.candidates.map((row) => normalize(row)),
);

if (JSON.stringify(observedCandidatesSorted) !== JSON.stringify(expectedCandidatesSorted)) {
  console.error(
    "Observed attribution candidates do not match expected/attribution_candidates.json",
  );
  console.error(`Observed: ${observedCandidatesSorted.length}`);
  console.error(`Expected: ${expectedCandidatesSorted.length}`);
  process.exit(1);
}

const observedWalletGraph = buildWalletUsageGraph();
if (JSON.stringify(observedWalletGraph) !== JSON.stringify(expectedWalletGraph.graph)) {
  console.error("Observed wallet usage graph does not match expected/wallet_usage_graph.json");
  process.exit(1);
}

await runReport();

console.log(
  JSON.stringify(
    {
      status: "ok",
      observationCount: observedSorted.length,
      attributionCandidateCount: observedCandidatesSorted.length,
      walletGraphProviderWallets: observedWalletGraph.providerWallets.length,
    },
    null,
    2,
  ),
);
