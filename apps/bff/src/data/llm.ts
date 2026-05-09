import {
  type CustomerIntelligenceResponse,
  type EvidenceLabel,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type PhaseBCustomerUpsellMetricsResponse,
  type PhaseBUpsellReasonCode,
  normalizePaymentRecipientAddress,
} from "contracts";
import { resolveBedrockBffLlmService } from "./llm-bedrock";
import { resolveQvacBffLlmService } from "./llm-qvac";
import {
  normalizeLlmProvider,
  type BffLlmService,
  type ResolveBffLlmServiceOptions,
} from "./llm-shared";

export {
  BffLlmInferenceError,
  BffLlmUnavailableError,
  type BffLlmService,
} from "./llm-shared";

const GENERATED_FROM = "phase-b-llm-upsell-metrics-v1";
const RECENT_ACTIVITY_DAYS = 7;
const HIGH_TX_COUNT_THRESHOLD = 5;
const FREE_TIER_NEAR_LIMIT_THRESHOLD = 0.8;
const TOP_SPENDER_PERCENTILE_THRESHOLD = 0.95;
const DAY_MS = 86_400_000;

const onchainReason: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "payer wallet transfer facts",
  sourceFields: ["payerWallet", "amount", "timestamp"],
};

const projectionReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "BFF upsell metric aggregation",
};

const heuristicReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "deterministic upsell thresholds",
};

const heuristicCaveats = [
  "activityGrowth is a PoC heuristic and not a strict live growth metric.",
  "freeTierProgress is a PoC heuristic and not an actual commercial plan limit.",
  "entryPointRatio is a simplified proxy and not a literal workflow entry-point metric.",
  "upsellOpportunity is a derived priority label and should be explained with supporting metrics.",
];

const compareAtomicDesc = (left: string, right: string) => {
  const l = BigInt(left);
  const r = BigInt(right);
  if (l === r) return 0;
  return l > r ? -1 : 1;
};

const daysBetween = (laterIso: string, earlierIso: string) =>
  Math.max(0, Math.floor((Date.parse(laterIso) - Date.parse(earlierIso)) / DAY_MS));

const percentileFromRank = (rank: number, total: number) => {
  if (total <= 1) return 1;
  return Number(((total - rank) / (total - 1)).toFixed(6));
};

type BuildUpsellMetricsByAddressInput = {
  customers: PhaseBCustomerListResponse;
  profilesByAddress: Record<string, PhaseBCustomerProfileResponse>;
  intelligenceByAddress?: Record<string, CustomerIntelligenceResponse>;
};

export const resolveBffLlmService = (
  options: ResolveBffLlmServiceOptions = {},
): BffLlmService | null => {
  const configuredProvider = normalizeLlmProvider(options.provider ?? process.env.BFF_LLM_PROVIDER);

  if (configuredProvider === "bedrock") {
    return resolveBedrockBffLlmService(options);
  }

  if (configuredProvider === "qvac") {
    return resolveQvacBffLlmService(options, true);
  }

  return resolveBedrockBffLlmService(options) ?? resolveQvacBffLlmService(options, false);
};

export const buildUpsellMetricsByAddress = ({
  customers,
  profilesByAddress,
  intelligenceByAddress = {},
}: BuildUpsellMetricsByAddressInput): Record<string, PhaseBCustomerUpsellMetricsResponse> => {
  const rankedCustomers = [...customers.customers].sort((left, right) => {
    const bySpend = compareAtomicDesc(left.spendAtomic, right.spendAtomic);
    if (bySpend !== 0) return bySpend;
    return left.address.localeCompare(right.address);
  });
  const rankByAddress = new Map(
    rankedCustomers.map((customer, index) => [
      normalizePaymentRecipientAddress(customer.address),
      index + 1,
    ]),
  );

  return Object.fromEntries(
    customers.customers.flatMap((customer) => {
      const address = normalizePaymentRecipientAddress(customer.address);
      const profile = profilesByAddress[address];
      if (!profile) return [];

      const intelligence = intelligenceByAddress[address];
      const spendRank = rankByAddress.get(address) ?? customers.customerCount;
      const spendPercentile = percentileFromRank(spendRank, customers.customerCount);
      const txCount = profile.profile.metrics.txCount ?? customer.observationCount;
      const providerCount = profile.profile.metrics.uniqueProviderCount ?? customer.providerCount;
      const firstSeenAt = profile.profile.metrics.firstSeenAt ?? null;
      const lastSeenAt = profile.profile.metrics.lastSeenAt ?? customer.lastSeenAt ?? null;
      const daysSinceLastSeen =
        lastSeenAt === null ? null : daysBetween(profile.generatedAt, lastSeenAt);
      const x402ServiceCount = intelligence?.x402Services.length ?? 0;

      const flags = {
        isTopSpender: spendPercentile >= TOP_SPENDER_PERCENTILE_THRESHOLD,
        isRecentlyActive: daysSinceLastSeen !== null && daysSinceLastSeen <= RECENT_ACTIVITY_DAYS,
        isMultiProvider: providerCount >= 2,
        hasHighTransactionCount: txCount >= HIGH_TX_COUNT_THRESHOLD,
        isNearFreeTierLimit:
          profile.profile.metrics.freeTierProgress >= FREE_TIER_NEAR_LIMIT_THRESHOLD,
        hasExternalX402Usage: x402ServiceCount > 0,
        isHighUpsellCandidate: profile.profile.metrics.upsellOpportunity === "high",
      } as const;

      const reasonCodes: PhaseBUpsellReasonCode[] = [
        flags.isTopSpender ? "top_spender" : null,
        flags.isRecentlyActive ? "recently_active" : null,
        flags.isMultiProvider ? "multi_provider_usage" : null,
        flags.hasHighTransactionCount ? "high_transaction_count" : null,
        flags.isNearFreeTierLimit ? "free_tier_near_limit" : null,
        flags.hasExternalX402Usage ? "external_x402_usage" : null,
        flags.isHighUpsellCandidate ? "high_upsell_score" : null,
      ].filter((value): value is PhaseBUpsellReasonCode => value !== null);

      const response: PhaseBCustomerUpsellMetricsResponse = {
        generatedAt: new Date().toISOString(),
        generatedFrom: GENERATED_FROM,
        address: customer.address,
        sourceGeneratedAt: profile.generatedAt,
        signals: {
          spendAtomic: profile.profile.metrics.totalSpendAtomic ?? customer.spendAtomic,
          spendRank,
          spendPercentile,
          customerCount: customers.customerCount,
          observationCount: customer.observationCount,
          providerCount,
          txCount,
          averageSpendAtomic: profile.profile.metrics.averageSpendAtomic ?? null,
          firstSeenAt,
          lastSeenAt,
          daysSinceLastSeen,
          freeTierProgress: profile.profile.metrics.freeTierProgress,
          activityGrowth: profile.profile.metrics.activityGrowth,
          entryPointRatio: profile.profile.metrics.entryPointRatio,
          upsellOpportunity: profile.profile.metrics.upsellOpportunity,
          x402ServiceCount,
        },
        flags: { ...flags },
        reasonCodes,
        caveats: heuristicCaveats,
        provenance: "derived_insight",
        provenanceByField: {
          address: "onchain_fact",
          sourceGeneratedAt: "derived_insight",
          signals: "derived_insight",
          flags: "derived_insight",
          reasonCodes: "derived_insight",
          caveats: "derived_insight",
        },
        evidence: intelligence
          ? [onchainReason, projectionReason, heuristicReason]
          : [onchainReason, heuristicReason],
        reasons: intelligence
          ? [onchainReason, projectionReason, heuristicReason]
          : [onchainReason, heuristicReason],
      };

      return [[address, response] as const];
    }),
  );
};
