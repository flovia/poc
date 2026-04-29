import {
  listAttributionCandidates,
  listDailyMetrics,
  listPayerProfiles,
  listPaymentObservations,
  listRecipientSummaries,
  listRelayerSummaries,
} from "../aggregates/summaries";
import { buildWalletUsageGraph } from "../attribution/wallet-graph";
import type { AppDatabase } from "../db";
import {
  type ReportSummaryDto,
  toAttributionCandidateDto,
  toDailyMetricDto,
  toPaymentObservationDto,
  toWalletProfileDto,
} from "./dto";

export const buildReportSummary = (database?: AppDatabase): ReportSummaryDto => {
  const observations = listPaymentObservations(database);
  const candidates = listAttributionCandidates(database);
  const dailyMetrics = listDailyMetrics(database);
  const payerProfiles = listPayerProfiles(database);
  const recipientSummaries = listRecipientSummaries(database);
  const relayerSummaries = listRelayerSummaries(database);
  const walletUsageGraph = buildWalletUsageGraph(database);

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
    observations: observations.map(toPaymentObservationDto),
    attributionCandidates: candidates.map(toAttributionCandidateDto),
    dailyMetrics: dailyMetrics.map(toDailyMetricDto),
    payerWalletProfiles: payerProfiles.map(toWalletProfileDto),
    recipientSummaries: recipientSummaries.map(toWalletProfileDto),
    relayerSummaries: relayerSummaries.map(toWalletProfileDto),
    walletUsageGraph,
  };
};
