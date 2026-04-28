import path from "node:path";
import fs from "node:fs";
import { env, ensureDir } from "../lib/db";
import {
  listAttributionCandidates,
  listDailyMetrics,
  listPaymentObservations,
  listPayerProfiles,
  listRecipientSummaries,
  listRelayerSummaries,
} from "../lib/aggregates/summaries";
import { buildWalletUsageGraph } from "../lib/attribution/wallet-graph";

const buildMarkdown = (summary: Record<string, unknown>) => {
  const observations = listPaymentObservations();
  const candidates = listAttributionCandidates();
  const daily = listDailyMetrics();
  const payerProfiles = listPayerProfiles();
  const recipientProfiles = listRecipientSummaries();
  const relayerProfiles = listRelayerSummaries();
  const walletGraph = buildWalletUsageGraph();

  const observationLines = observations
    .map((row) => `${row.case_id} ${row.tx_hash} payer=${row.payer_wallet} recipient=${row.recipient_wallet} amount=${row.amount_atomic}`)
    .join("\n");

  const candidateLines = candidates
    .map((row) => `obs=${row.observation_id} type=${row.candidate_type} matched=${row.matched_fingerprint_type}:${row.matched_fingerprint_value} confidence=${row.confidence}`)
    .join("\n");

  const dailyLines = daily
    .map((row) => `${row.day}: observations=${row.observation_count} candidates=${row.candidate_count} total_amount=${row.total_amount_atomic}`)
    .join("\n");

  return `# Offline Payment Observation Report

Generated at ${new Date().toISOString()}

## Counts

- Observations: ${observations.length}
- Attribution Candidates: ${candidates.length}
- Daily Metrics: ${daily.length}
- Payer Profiles: ${payerProfiles.length}
- Recipient Summaries: ${recipientProfiles.length}
- Relayer Summaries: ${relayerProfiles.length}
- Wallet Usage Graph Provider Wallets: ${walletGraph.providerWallets.length}

## Scope Note

This report describes payer-wallet intelligence only. It does not identify human users and excludes ENS, social, KYC, email, IP address, and other offchain identity enrichment.

## Observations

${observationLines || "No observations"}

## Attribution Candidates

${candidateLines || "No attribution candidates"}

## Daily Metrics

${dailyLines || "No daily metrics"}

## Payer Profiles

${payerProfiles
  .map((row) => `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`)
  .join("\n") || "No payer profiles"}

## Recipient Summaries

${recipientProfiles
  .map((row) => `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`)
  .join("\n") || "No recipient summaries"}

## Relayer Summaries

${relayerProfiles
  .map((row) => `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`)
  .join("\n") || "No relayer summaries"}
`;
};

const buildSummary = () => {
  const observations = listPaymentObservations();
  const candidates = listAttributionCandidates();
  const dailyMetrics = listDailyMetrics();
  const payerProfiles = listPayerProfiles();
  const recipientSummaries = listRecipientSummaries();
  const relayerSummaries = listRelayerSummaries();
  const walletUsageGraph = buildWalletUsageGraph();

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      observations: observations.length,
      attributionCandidates: candidates.length,
      dailyMetrics: dailyMetrics.length,
      payerWalletProfiles: payerProfiles.length,
      recipientSummaries: recipientSummaries.length,
      relayerSummaries: relayerSummaries.length,
      walletUsageGraphProviderWallets: walletUsageGraph.providerWallets.length,
    },
    scopeNote: "payer-wallet intelligence only; no human identity enrichment",
    observations,
    attributionCandidates: candidates,
    dailyMetrics,
    payerWalletProfiles: payerProfiles,
    recipientSummaries,
    relayerSummaries,
    walletUsageGraph,
  };
};

export const runReport = () => {
  ensureDir(env.reportsDir);
  const summary = buildSummary();
  const summaryJsonPath = path.join(env.reportsDir, "summary.json");
  const summaryMarkdownPath = path.join(env.reportsDir, "summary.md");

  fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(summaryMarkdownPath, buildMarkdown(summary));

  return {
    summaryJsonPath,
    summaryMarkdownPath,
    counts: summary.counts,
  };
};

const main = () => {
  const result = runReport();
  console.log(JSON.stringify(result, null, 2));
};

if (import.meta.main) {
  main();
}
