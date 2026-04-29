import fs from "node:fs";
import path from "node:path";

import { createBffDatabaseContext } from "../src/db/context";

// Seed a persistent SQLite file with a realistic, multi-payer / multi-provider
// dataset so the frontend can render Customers, Wallet 360°, and Patterns
// against `bun run start`. Designed to be re-runnable: deletes any existing
// demo.db before re-creating tables and inserting fresh rows.

const databasePath = process.env.DATABASE_URL ?? "./demo.db";

const removeIfExists = (filePath: string) => {
  for (const suffix of ["", "-wal", "-shm"]) {
    const candidate = `${filePath}${suffix}`;
    if (fs.existsSync(candidate)) fs.rmSync(candidate);
  }
};

const absoluteDbPath = path.isAbsolute(databasePath)
  ? databasePath
  : path.resolve(process.cwd(), databasePath);

removeIfExists(absoluteDbPath);

const context = createBffDatabaseContext({ databasePath: absoluteDbPath });
const { database } = context;

const NOW_ISO = "2026-04-28T12:00:00.000Z";
const CHAIN_ID = 8453; // Base
const TOKEN = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"; // USDC-shaped placeholder
const RELAYER_PRIMARY = "0xrelayer000000000000000000000000000000001";
const RELAYER_SECONDARY = "0xrelayer000000000000000000000000000000002";

type Provider = {
  payTo: string;
  entityId: string;
  providerName: string;
  serviceName: string;
};

type Payer = {
  wallet: string;
  label: string | null;
};

const providers: Provider[] = [
  {
    payTo: "0xprovider0000000000000000000000000000price",
    entityId: "acme-price",
    providerName: "Acme Price API",
    serviceName: "Market Data",
  },
  {
    payTo: "0xprovider000000000000000000000000000vector",
    entityId: "vectormind",
    providerName: "VectorMind AI",
    serviceName: "LLM",
  },
  {
    payTo: "0xprovider0000000000000000000000000000route",
    entityId: "routezero",
    providerName: "RouteZero DEX",
    serviceName: "DEX Aggregator",
  },
  {
    payTo: "0xprovider000000000000000000000000000signal",
    entityId: "signalport",
    providerName: "SignalPort",
    serviceName: "Notifications",
  },
];

const payers: Payer[] = [
  { wallet: "0xpayer00000000000000000000000000000000bot1", label: "Trading bot α" },
  { wallet: "0xpayer00000000000000000000000000000claude", label: null },
  { wallet: "0xpayer00000000000000000000000000000cursor", label: null },
  { wallet: "0xpayer00000000000000000000000000000n8nflow", label: "n8n workflow" },
  { wallet: "0xpayer000000000000000000000000000000curl1", label: null },
];

type ObservationSeed = {
  observationId: number;
  caseId: string;
  txHash: string;
  blockNumber: number;
  blockTimestamp: number;
  payerIndex: number;
  providerIndex: number;
  amountAtomic: string;
  relayer: string;
};

const observations: ObservationSeed[] = [];

const SECONDS_PER_DAY = 86_400;
const baseTimestamp = 1_777_000_000; // ~2026-04-21 base

const pushObservation = (seed: Omit<ObservationSeed, "observationId">) => {
  observations.push({ observationId: observations.length + 1, ...seed });
};

// Designed shape:
// - bot1 → all 4 providers, accelerating activity → high upsell
// - claude → 2 providers (price + vector), steady → medium upsell
// - cursor → 1 provider (price), steady → low upsell
// - n8nflow → 2 providers (price + signal), declining → medium upsell
// - curl1 → 1 provider (route), one-off → low upsell
const bot1Times: Array<{ provider: number; offsetDays: number; amount: string; relayer: string }> =
  [
    { provider: 0, offsetDays: 0.0, amount: "150000", relayer: RELAYER_PRIMARY },
    { provider: 1, offsetDays: 0.05, amount: "320000", relayer: RELAYER_PRIMARY },
    { provider: 2, offsetDays: 0.07, amount: "1400000", relayer: RELAYER_PRIMARY },
    { provider: 3, offsetDays: 0.08, amount: "40000", relayer: RELAYER_PRIMARY },
    { provider: 0, offsetDays: 5.0, amount: "180000", relayer: RELAYER_PRIMARY },
    { provider: 1, offsetDays: 5.05, amount: "360000", relayer: RELAYER_PRIMARY },
    { provider: 2, offsetDays: 5.07, amount: "1580000", relayer: RELAYER_PRIMARY },
    { provider: 3, offsetDays: 5.08, amount: "40000", relayer: RELAYER_PRIMARY },
    { provider: 0, offsetDays: 6.0, amount: "260000", relayer: RELAYER_PRIMARY },
    { provider: 1, offsetDays: 6.05, amount: "420000", relayer: RELAYER_PRIMARY },
    { provider: 2, offsetDays: 6.07, amount: "2110000", relayer: RELAYER_PRIMARY },
    { provider: 3, offsetDays: 6.08, amount: "40000", relayer: RELAYER_PRIMARY },
  ];
for (const [i, row] of bot1Times.entries()) {
  pushObservation({
    caseId: `bot1-${i + 1}`,
    txHash: `0xtxbot1${i.toString().padStart(2, "0")}`,
    blockNumber: 100_000 + i,
    blockTimestamp: baseTimestamp + Math.round(row.offsetDays * SECONDS_PER_DAY),
    payerIndex: 0,
    providerIndex: row.provider,
    amountAtomic: row.amount,
    relayer: row.relayer,
  });
}

const claudeRows = [
  { provider: 0, offsetDays: 0.5, amount: "120000" },
  { provider: 1, offsetDays: 0.55, amount: "240000" },
  { provider: 0, offsetDays: 2.5, amount: "120000" },
  { provider: 1, offsetDays: 2.55, amount: "260000" },
  { provider: 0, offsetDays: 5.5, amount: "140000" },
  { provider: 1, offsetDays: 5.55, amount: "280000" },
];
for (const [i, row] of claudeRows.entries()) {
  pushObservation({
    caseId: `claude-${i + 1}`,
    txHash: `0xtxclaude${i.toString().padStart(2, "0")}`,
    blockNumber: 110_000 + i,
    blockTimestamp: baseTimestamp + Math.round(row.offsetDays * SECONDS_PER_DAY),
    payerIndex: 1,
    providerIndex: row.provider,
    amountAtomic: row.amount,
    relayer: RELAYER_PRIMARY,
  });
}

const cursorRows = [
  { offsetDays: 1.5, amount: "90000" },
  { offsetDays: 3.5, amount: "90000" },
  { offsetDays: 4.5, amount: "100000" },
  { offsetDays: 6.5, amount: "100000" },
];
for (const [i, row] of cursorRows.entries()) {
  pushObservation({
    caseId: `cursor-${i + 1}`,
    txHash: `0xtxcursor${i.toString().padStart(2, "0")}`,
    blockNumber: 120_000 + i,
    blockTimestamp: baseTimestamp + Math.round(row.offsetDays * SECONDS_PER_DAY),
    payerIndex: 2,
    providerIndex: 0,
    amountAtomic: row.amount,
    relayer: RELAYER_PRIMARY,
  });
}

const n8nRows = [
  { provider: 0, offsetDays: 0.2, amount: "200000" },
  { provider: 3, offsetDays: 0.25, amount: "30000" },
  { provider: 0, offsetDays: 1.2, amount: "180000" },
  { provider: 3, offsetDays: 1.25, amount: "30000" },
  { provider: 0, offsetDays: 4.2, amount: "120000" },
];
for (const [i, row] of n8nRows.entries()) {
  pushObservation({
    caseId: `n8n-${i + 1}`,
    txHash: `0xtxn8n${i.toString().padStart(2, "0")}`,
    blockNumber: 130_000 + i,
    blockTimestamp: baseTimestamp + Math.round(row.offsetDays * SECONDS_PER_DAY),
    payerIndex: 3,
    providerIndex: row.provider,
    amountAtomic: row.amount,
    relayer: RELAYER_SECONDARY,
  });
}

const curlRows = [{ offsetDays: 3.0, amount: "750000" }];
for (const [i, row] of curlRows.entries()) {
  pushObservation({
    caseId: `curl-${i + 1}`,
    txHash: `0xtxcurl${i.toString().padStart(2, "0")}`,
    blockNumber: 140_000 + i,
    blockTimestamp: baseTimestamp + Math.round(row.offsetDays * SECONDS_PER_DAY),
    payerIndex: 4,
    providerIndex: 2,
    amountAtomic: row.amount,
    relayer: RELAYER_SECONDARY,
  });
}

// --------- INSERTS ---------

const insertObservation = database.prepare(`
  INSERT INTO payment_observations (
    observation_id, chain_id, tx_hash, block_number, block_timestamp,
    relayer_wallet, payer_wallet, recipient_wallet, token_address,
    amount_atomic, method, top_level_selector, case_id, stable_hash,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const obs of observations) {
  const provider = providers[obs.providerIndex];
  const payer = payers[obs.payerIndex];
  insertObservation.run(
    obs.observationId,
    CHAIN_ID,
    obs.txHash,
    obs.blockNumber,
    obs.blockTimestamp,
    obs.relayer,
    payer.wallet,
    provider.payTo,
    TOKEN,
    obs.amountAtomic,
    "transferWithAuthorization",
    "0xe3ee160e",
    obs.caseId,
    `stable-${obs.observationId}`,
    NOW_ISO,
    NOW_ISO,
  );
}

const insertProviderClaim = database.prepare(`
  INSERT INTO provider_endpoint_claims (
    claim_id, entity_id, provider_name, service_name, endpoint_url,
    resource_url, request_host, pay_to_wallet, network, asset_address,
    amount_atomic, tx_hash, evidence_class, roles_json, confidence,
    source_name, evidence_refs_json, provenance_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const provider of providers) {
  insertProviderClaim.run(
    `claim-${provider.entityId}`,
    provider.entityId,
    provider.providerName,
    provider.serviceName,
    null,
    null,
    null,
    provider.payTo,
    "base",
    TOKEN,
    null,
    null,
    "catalog",
    JSON.stringify(["provider"]),
    80,
    "demo-seed",
    JSON.stringify([`claim:${provider.entityId}`]),
    JSON.stringify([]),
    NOW_ISO,
    NOW_ISO,
  );
}

const insertCandidate = database.prepare(`
  INSERT INTO attribution_candidates (
    observation_id, candidate_type, matched_fingerprint_type,
    matched_fingerprint_value, matched_claim_id, matched_settlement_fingerprint_id,
    entity_id, role, confidence, reasons_json, evidence_refs_json,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const candidateLimitByPayerIndex = new Map<number, number>([
  [2, 1],
  [4, 0],
]);
const candidateCountByPayerIndex = new Map<number, number>();
const candidateObservationIds = new Set<number>();

for (const obs of observations) {
  const candidateLimit = candidateLimitByPayerIndex.get(obs.payerIndex) ?? Number.POSITIVE_INFINITY;
  const candidateCount = candidateCountByPayerIndex.get(obs.payerIndex) ?? 0;
  if (candidateCount >= candidateLimit) continue;

  const provider = providers[obs.providerIndex];
  insertCandidate.run(
    obs.observationId,
    "provider_candidate",
    "recipient_wallet",
    provider.payTo,
    `claim-${provider.entityId}`,
    null,
    provider.entityId,
    "provider",
    75,
    JSON.stringify([`recipient_wallet matches claim ${provider.entityId}`]),
    JSON.stringify([`observation:${obs.observationId}`]),
    NOW_ISO,
    NOW_ISO,
  );
  candidateCountByPayerIndex.set(obs.payerIndex, candidateCount + 1);
  candidateObservationIds.add(obs.observationId);
}

// --------- AGGREGATES ---------

type WalletAggregate = {
  wallet: string;
  observationCount: number;
  totalAmountAtomic: bigint;
  recipients: Set<string>;
  payers: Set<string>;
  relayers: Set<string>;
  firstSeen: number;
  lastSeen: number;
};

const initAggregate = (wallet: string): WalletAggregate => ({
  wallet,
  observationCount: 0,
  totalAmountAtomic: 0n,
  recipients: new Set(),
  payers: new Set(),
  relayers: new Set(),
  firstSeen: Number.POSITIVE_INFINITY,
  lastSeen: 0,
});

const payerAggregates = new Map<string, WalletAggregate>();
const recipientAggregates = new Map<string, WalletAggregate>();
const relayerAggregates = new Map<string, WalletAggregate>();
const dailyAggregates = new Map<
  string,
  {
    observationCount: number;
    candidateCount: number;
    payers: Set<string>;
    recipients: Set<string>;
    relayers: Set<string>;
    totalAmountAtomic: bigint;
  }
>();

const upsertAggregate = (
  store: Map<string, WalletAggregate>,
  wallet: string,
  amount: string,
  blockTimestamp: number,
  related: { recipients?: string; payers?: string; relayers?: string },
) => {
  const aggregate = store.get(wallet) ?? initAggregate(wallet);
  aggregate.observationCount += 1;
  aggregate.totalAmountAtomic += BigInt(amount);
  if (related.recipients) aggregate.recipients.add(related.recipients);
  if (related.payers) aggregate.payers.add(related.payers);
  if (related.relayers) aggregate.relayers.add(related.relayers);
  aggregate.firstSeen = Math.min(aggregate.firstSeen, blockTimestamp);
  aggregate.lastSeen = Math.max(aggregate.lastSeen, blockTimestamp);
  store.set(wallet, aggregate);
};

for (const obs of observations) {
  const payer = payers[obs.payerIndex];
  const provider = providers[obs.providerIndex];

  upsertAggregate(payerAggregates, payer.wallet, obs.amountAtomic, obs.blockTimestamp, {
    recipients: provider.payTo,
    relayers: obs.relayer,
  });

  upsertAggregate(recipientAggregates, provider.payTo, obs.amountAtomic, obs.blockTimestamp, {
    payers: payer.wallet,
    relayers: obs.relayer,
  });

  upsertAggregate(relayerAggregates, obs.relayer, obs.amountAtomic, obs.blockTimestamp, {
    payers: payer.wallet,
    recipients: provider.payTo,
  });

  const day = new Date(obs.blockTimestamp * 1000).toISOString().slice(0, 10);
  const daily = dailyAggregates.get(day) ?? {
    observationCount: 0,
    candidateCount: 0,
    payers: new Set<string>(),
    recipients: new Set<string>(),
    relayers: new Set<string>(),
    totalAmountAtomic: 0n,
  };
  daily.observationCount += 1;
  if (candidateObservationIds.has(obs.observationId)) daily.candidateCount += 1;
  daily.payers.add(payer.wallet);
  daily.recipients.add(provider.payTo);
  daily.relayers.add(obs.relayer);
  daily.totalAmountAtomic += BigInt(obs.amountAtomic);
  dailyAggregates.set(day, daily);
}

const insertPayerProfile = database.prepare(`
  INSERT INTO payer_wallet_profiles (
    wallet, observation_count, total_amount_atomic, unique_recipients,
    unique_relayers, first_seen_at, last_seen_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const aggregate of payerAggregates.values()) {
  insertPayerProfile.run(
    aggregate.wallet,
    aggregate.observationCount,
    aggregate.totalAmountAtomic.toString(),
    aggregate.recipients.size,
    aggregate.relayers.size,
    aggregate.firstSeen,
    aggregate.lastSeen,
    NOW_ISO,
  );
}

const insertRecipientSummary = database.prepare(`
  INSERT INTO recipient_summaries (
    wallet, observation_count, total_amount_atomic, unique_payers,
    unique_relayers, first_seen_at, last_seen_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const aggregate of recipientAggregates.values()) {
  insertRecipientSummary.run(
    aggregate.wallet,
    aggregate.observationCount,
    aggregate.totalAmountAtomic.toString(),
    aggregate.payers.size,
    aggregate.relayers.size,
    aggregate.firstSeen,
    aggregate.lastSeen,
    NOW_ISO,
  );
}

const insertRelayerSummary = database.prepare(`
  INSERT INTO relayer_summaries (
    wallet, observation_count, total_amount_atomic, unique_payers,
    unique_recipients, first_seen_at, last_seen_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const aggregate of relayerAggregates.values()) {
  insertRelayerSummary.run(
    aggregate.wallet,
    aggregate.observationCount,
    aggregate.totalAmountAtomic.toString(),
    aggregate.payers.size,
    aggregate.recipients.size,
    aggregate.firstSeen,
    aggregate.lastSeen,
    NOW_ISO,
  );
}

const insertDailyMetric = database.prepare(`
  INSERT INTO daily_metrics (
    day, observation_count, candidate_count, unique_payers, unique_recipients,
    unique_relayers, total_amount_atomic, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const [day, metric] of dailyAggregates.entries()) {
  insertDailyMetric.run(
    day,
    metric.observationCount,
    metric.candidateCount,
    metric.payers.size,
    metric.recipients.size,
    metric.relayers.size,
    metric.totalAmountAtomic.toString(),
    NOW_ISO,
    NOW_ISO,
  );
}

context.close();

console.log(
  `seed-demo: wrote ${observations.length} observations, ${payers.length} payers, ${providers.length} providers to ${absoluteDbPath}`,
);
