import fs from "node:fs";
import path from "node:path";
import {
  listAttributionCandidates,
  listDailyMetrics,
  listPayerProfiles,
  listPaymentObservations,
  listRecipientSummaries,
  listRelayerSummaries,
} from "../../lib/aggregates/summaries";
import { buildReportSummary } from "../../lib/api/summary";
import { buildWalletUsageGraph } from "../../lib/attribution/wallet-graph";
import { ensureDir, env } from "../../lib/db";

const buildMarkdown = (summary: Record<string, unknown>) => {
  const observations = listPaymentObservations();
  const candidates = listAttributionCandidates();
  const daily = listDailyMetrics();
  const payerProfiles = listPayerProfiles();
  const recipientProfiles = listRecipientSummaries();
  const relayerProfiles = listRelayerSummaries();
  const walletGraph = buildWalletUsageGraph();

  const observationLines = observations
    .map(
      (row) =>
        `${row.case_id} ${row.tx_hash} payer=${row.payer_wallet} recipient=${row.recipient_wallet} amount=${row.amount_atomic}`,
    )
    .join("\n");

  const candidateLines = candidates
    .map(
      (row) =>
        `obs=${row.observation_id} type=${row.candidate_type} matched=${row.matched_fingerprint_type}:${row.matched_fingerprint_value} confidence=${row.confidence}`,
    )
    .join("\n");

  const dailyLines = daily
    .map(
      (row) =>
        `${row.day}: observations=${row.observation_count} candidates=${row.candidate_count} total_amount=${row.total_amount_atomic}`,
    )
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

${
  payerProfiles
    .map(
      (row) =>
        `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`,
    )
    .join("\n") || "No payer profiles"
}

## Recipient Summaries

${
  recipientProfiles
    .map(
      (row) =>
        `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`,
    )
    .join("\n") || "No recipient summaries"
}

## Relayer Summaries

${
  relayerProfiles
    .map(
      (row) =>
        `${row.wallet}: observations=${row.observation_count} total_amount=${row.total_amount_atomic}`,
    )
    .join("\n") || "No relayer summaries"
}
`;
};

export const runReport = () => {
  ensureDir(env.reportsDir);
  const summary = buildReportSummary();
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
