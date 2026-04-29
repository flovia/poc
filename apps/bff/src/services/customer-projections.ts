import {
  listAttributionCandidates,
  listPayerProfiles,
  listPaymentObservations,
} from "../../../cli/lib/aggregates/summaries";
import type { AppDatabase } from "../../../cli/lib/db";
import type {
  CustomerInsightDto,
  CustomerListItemDto,
  CustomerMetricsDto,
  CustomerProfileDto,
  CustomerProviderUsageDto,
  CustomerTimelineEventDto,
  RetentionMetricDto,
  UpsellOpportunity,
} from "../api/customer-dto";

const CUSTOMER_CAVEAT =
  "Customer projections are wallet-address based and do not claim verified human identity.";
const D14_RETENTION_CAVEAT =
  "D14 retention is computed from payer wallet first paid and last paid timestamps; it is wallet-address based and not verified human identity retention.";
const D14_SECONDS = 14 * 24 * 60 * 60;

type Observation = ReturnType<typeof listPaymentObservations>[number];
type Candidate = ReturnType<typeof listAttributionCandidates>[number];

type ProviderMeta = {
  providerId: string;
  name: string;
};

export const listCustomerProjections = (database: AppDatabase): CustomerListItemDto[] => {
  const observations = listPaymentObservations(database);
  const candidates = listAttributionCandidates(database);
  const payerProfiles = listPayerProfiles(database);

  return payerProfiles.map((profile) => {
    const customerObservations = observations.filter((row) => row.payer_wallet === profile.wallet);
    const providerCount = new Set(customerObservations.map((row) => row.recipient_wallet)).size;
    const activityGrowth = calculateActivityGrowth(customerObservations);
    const freeTierProgress = calculateFreeTierProgress(profile.total_amount_atomic);
    const entryPointRatio = calculateEntryPointRatio(customerObservations, candidates);

    return {
      address: profile.wallet,
      label: null,
      observationCount: profile.observation_count,
      spendAtomic: profile.total_amount_atomic,
      providerCount,
      lastSeenAt: profile.last_seen_at,
      activityGrowth,
      upsellOpportunity: classifyUpsellOpportunity({
        providerCount,
        freeTierProgress,
        activityGrowth,
        entryPointRatio,
      }),
    };
  });
};

export const getCustomerProfileProjection = (
  database: AppDatabase,
  address: string,
): CustomerProfileDto | null => {
  const normalizedAddress = address.toLowerCase();
  const observations = listPaymentObservations(database).filter(
    (row) => row.payer_wallet.toLowerCase() === normalizedAddress,
  );

  if (observations.length === 0) {
    return null;
  }

  const candidates = listAttributionCandidates(database);
  const profile = listPayerProfiles(database).find(
    (row) => row.wallet.toLowerCase() === normalizedAddress,
  );
  const spendAtomic =
    profile?.total_amount_atomic ?? sumAtomic(observations.map((row) => row.amount_atomic));
  const providers = buildProviderUsage(observations, candidates);
  const metrics = buildCustomerMetrics(observations, candidates, spendAtomic, providers.length);

  return {
    customer: {
      address: profile?.wallet ?? observations[0]?.payer_wallet ?? address,
      label: null,
      role: "payer_wallet",
      identityBasis: "wallet_address",
      caveat: CUSTOMER_CAVEAT,
    },
    metrics,
    providers,
    timeline: buildTimeline(observations, candidates, metrics),
    insights: buildInsights(metrics, providers),
  };
};

export const getD14RetentionMetric = (database: AppDatabase): RetentionMetricDto => {
  const cohorts = new Map<string, { cohortSize: number; retainedCount: number }>();

  for (const profile of listPayerProfiles(database)) {
    const cohortDate = toIsoDate(profile.first_seen_at).slice(0, 10);
    const retained = profile.last_seen_at - profile.first_seen_at >= D14_SECONDS;
    const cohort = cohorts.get(cohortDate) ?? { cohortSize: 0, retainedCount: 0 };

    cohort.cohortSize += 1;
    if (retained) {
      cohort.retainedCount += 1;
    }
    cohorts.set(cohortDate, cohort);
  }

  const cohortRows = [...cohorts.entries()]
    .map(([cohortDate, cohort]) => ({
      cohortDate,
      cohortSize: cohort.cohortSize,
      retainedCount: cohort.retainedCount,
      retentionRate: calculateRetentionRate(cohort.retainedCount, cohort.cohortSize),
    }))
    .sort((left, right) => left.cohortDate.localeCompare(right.cohortDate));
  const cohortSize = cohortRows.reduce((total, cohort) => total + cohort.cohortSize, 0);
  const retainedCount = cohortRows.reduce((total, cohort) => total + cohort.retainedCount, 0);

  return {
    metric: "d14_retention",
    retentionDays: 14,
    cohortBasis: "first_paid_at",
    retainedBasis: "last_paid_at_at_or_after_d14",
    cohortSize,
    retainedCount,
    retentionRate: calculateRetentionRate(retainedCount, cohortSize),
    cohorts: cohortRows,
    caveat: D14_RETENTION_CAVEAT,
  };
};

const buildCustomerMetrics = (
  observations: Observation[],
  candidates: Candidate[],
  spendAtomic: string,
  providerCount: number,
): CustomerMetricsDto => {
  const activityGrowth = calculateActivityGrowth(observations);
  const freeTierProgress = calculateFreeTierProgress(spendAtomic);
  const entryPointRatio = calculateEntryPointRatio(observations, candidates);

  return {
    spendAtomic,
    activityGrowth,
    freeTierProgress,
    entryPointRatio,
    upsellOpportunity: classifyUpsellOpportunity({
      providerCount,
      freeTierProgress,
      activityGrowth,
      entryPointRatio,
    }),
  };
};

const buildProviderUsage = (
  observations: Observation[],
  candidates: Candidate[],
): CustomerProviderUsageDto[] => {
  const byRecipient = new Map<string, Observation[]>();

  for (const observation of observations) {
    const rows = byRecipient.get(observation.recipient_wallet) ?? [];
    rows.push(observation);
    byRecipient.set(observation.recipient_wallet, rows);
  }

  return [...byRecipient.entries()]
    .map(([payToWallet, rows]) => {
      const provider = providerMetaFor(payToWallet, rows, candidates);
      const timestamps = rows.map((row) => row.block_timestamp);

      return {
        providerId: provider.providerId,
        name: provider.name,
        payToWallet,
        spendAtomic: sumAtomic(rows.map((row) => row.amount_atomic)),
        transactionCount: rows.length,
        firstSeenAt: Math.min(...timestamps),
        lastSeenAt: Math.max(...timestamps),
      };
    })
    .sort(
      (left, right) =>
        right.transactionCount - left.transactionCount || left.name.localeCompare(right.name),
    );
};

const providerMetaFor = (
  payToWallet: string,
  observations: Observation[],
  candidates: Candidate[],
): ProviderMeta => {
  const observationIds = new Set(observations.map((row) => row.observation_id));
  const candidate = candidates.find(
    (row) =>
      observationIds.has(row.observation_id) &&
      row.role === "provider" &&
      (row.matched_fingerprint_value.toLowerCase() === payToWallet.toLowerCase() || row.entity_id),
  );

  if (candidate?.entity_id) {
    return { providerId: candidate.entity_id, name: humanizeIdentifier(candidate.entity_id) };
  }

  return { providerId: `pay-to:${payToWallet}`, name: `Pay-to ${shortAddress(payToWallet)}` };
};

const buildTimeline = (
  observations: Observation[],
  candidates: Candidate[],
  metrics: CustomerMetricsDto,
): CustomerTimelineEventDto[] => {
  const paymentEvents = observations.map((observation) => {
    const provider = providerMetaFor(observation.recipient_wallet, [observation], candidates);

    return {
      date: toIsoDate(observation.block_timestamp),
      timestamp: observation.block_timestamp,
      type: "payment" as const,
      title: `Payment to ${provider.name}`,
      description: `Observed onchain payment from payer wallet to ${provider.name}.`,
      amountAtomic: observation.amount_atomic,
      providerId: provider.providerId,
      txHash: observation.tx_hash,
    };
  });

  const lastTimestamp = Math.max(...observations.map((row) => row.block_timestamp));
  const signalEvents: CustomerTimelineEventDto[] = [];

  if (metrics.activityGrowth > 0) {
    signalEvents.push({
      date: toIsoDate(lastTimestamp),
      timestamp: lastTimestamp,
      type: "growth",
      title: "Activity increased",
      description: "Recent activity is higher than the earlier observed baseline for this wallet.",
    });
  }

  if (metrics.upsellOpportunity !== "low") {
    signalEvents.push({
      date: toIsoDate(lastTimestamp),
      timestamp: lastTimestamp,
      type: "upsell_signal",
      title: "Upsell signal detected",
      description: `Opportunity level is ${metrics.upsellOpportunity} based on spend, provider usage, and activity heuristics.`,
    });
  }

  return [...paymentEvents, ...signalEvents].sort(
    (left, right) => left.timestamp - right.timestamp || left.title.localeCompare(right.title),
  );
};

const buildInsights = (
  metrics: CustomerMetricsDto,
  providers: CustomerProviderUsageDto[],
): CustomerInsightDto[] => {
  const insights: CustomerInsightDto[] = [
    {
      severity: "info",
      title: "Wallet-address customer projection",
      description: CUSTOMER_CAVEAT,
    },
  ];

  if (providers.length > 1) {
    insights.push({
      severity: "opportunity",
      title: "Multi-provider usage",
      description: `This wallet paid ${providers.length} provider wallets, suggesting cross-provider usage worth reviewing.`,
    });
  }

  if (metrics.freeTierProgress >= 0.8) {
    insights.push({
      severity: "opportunity",
      title: "Free-tier threshold nearby",
      description: "Observed spend is close to or above the PoC free-tier threshold heuristic.",
    });
  }

  if (metrics.activityGrowth > 0) {
    insights.push({
      severity: "info",
      title: "Recent activity growth",
      description: "Later observations are more active than earlier observations for this wallet.",
    });
  }

  return insights;
};

const calculateActivityGrowth = (observations: Observation[]): number => {
  if (observations.length < 2) {
    return 0;
  }

  const sorted = [...observations].sort(
    (left, right) => left.block_timestamp - right.block_timestamp,
  );
  const firstTimestamp = sorted[0]?.block_timestamp;
  const lastTimestamp = sorted.at(-1)?.block_timestamp;

  if (
    firstTimestamp === undefined ||
    lastTimestamp === undefined ||
    firstTimestamp === lastTimestamp
  ) {
    return 0;
  }

  const midpointTimestamp = firstTimestamp + (lastTimestamp - firstTimestamp) / 2;
  const earlier = sorted.filter((row) => row.block_timestamp <= midpointTimestamp).length;
  const later = sorted.length - earlier;

  if (earlier === 0) {
    return 0;
  }

  return roundRatio((later - earlier) / earlier);
};

const calculateFreeTierProgress = (spendAtomic: string): number => {
  const thresholdAtomic = 3_000_000n;
  const spend = BigInt(spendAtomic);
  const basisPoints = spend >= thresholdAtomic ? 10_000n : (spend * 10_000n) / thresholdAtomic;

  return Number(basisPoints) / 10_000;
};

const calculateEntryPointRatio = (observations: Observation[], candidates: Candidate[]): number => {
  if (observations.length === 0) {
    return 0;
  }

  const candidateObservationIds = new Set(candidates.map((row) => row.observation_id));
  const matched = observations.filter((row) =>
    candidateObservationIds.has(row.observation_id),
  ).length;

  return roundRatio(matched / observations.length);
};

const classifyUpsellOpportunity = (input: {
  providerCount: number;
  freeTierProgress: number;
  activityGrowth: number;
  entryPointRatio: number;
}): UpsellOpportunity => {
  const score =
    (input.providerCount > 1 ? 1 : 0) +
    (input.freeTierProgress >= 0.8 ? 1 : 0) +
    (input.activityGrowth > 0 ? 1 : 0) +
    (input.entryPointRatio >= 0.5 ? 1 : 0);

  if (score >= 4) {
    return "high";
  }

  if (score >= 1) {
    return "medium";
  }

  return "low";
};

const sumAtomic = (values: string[]): string =>
  values.reduce((total, value) => total + BigInt(value), 0n).toString();

const roundRatio = (value: number): number => Math.round(value * 100) / 100;

const calculateRetentionRate = (retainedCount: number, cohortSize: number): number => {
  if (cohortSize === 0) {
    return 0;
  }

  return roundRatio(retainedCount / cohortSize);
};

const toIsoDate = (timestampSeconds: number): string =>
  new Date(timestampSeconds * 1000).toISOString();

const shortAddress = (address: string): string =>
  address.length <= 10 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;

const humanizeIdentifier = (identifier: string): string =>
  identifier
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
