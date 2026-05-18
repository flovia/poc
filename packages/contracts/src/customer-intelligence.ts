import { z } from "zod";
import {
  AtomicAmountSchema,
  DataProvenanceSchema,
  EvidenceLabelSchema,
  EvmAddressSchema,
  PaymentProtocolSchema,
  PaymentRecipientAddressSchema,
  ProvenanceByFieldSchema,
  SourceProvenanceSchema,
  TransactionHashSchema,
  LabelSchema,
  normalizeAsset,
  normalizeNetwork,
  withDerivedInsightReasons,
} from "./common";
import { PhaseBResponseScopeSchema } from "./phase-b";

export const PhaseBCustomerProfileIdentitySchema = withDerivedInsightReasons(
  z
    .object({
      address: PaymentRecipientAddressSchema,
      label: LabelSchema,
      network: z.string().min(1),
      asset: z.string().min(1),
      role: z.string().min(1),
      identityBasis: z.string().min(1),
      caveat: z.string().nullable(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerProfileIdentity = z.infer<typeof PhaseBCustomerProfileIdentitySchema>;

export const PhaseBCustomerProfileMetricsSchema = withDerivedInsightReasons(
  z
    .object({
      spendAtomic: AtomicAmountSchema,
      activityGrowth: z.number(),
      freeTierProgress: z.number().min(0).max(1),
      entryPointRatio: z.number().min(0).max(1),
      upsellOpportunity: z.enum(["low", "medium", "high"]),

      // Canonical legacy fields that are still in production payloads.
      totalSpendAtomic: AtomicAmountSchema.optional(),
      txCount: z.number().int().nonnegative().optional(),
      uniqueProviderCount: z.number().int().nonnegative().optional(),
      averageSpendAtomic: AtomicAmountSchema.optional(),

      firstSeenAt: z.string().datetime().optional(),
      lastSeenAt: z.string().datetime().optional(),

      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerProfileMetrics = z.infer<typeof PhaseBCustomerProfileMetricsSchema>;

export const PhaseBCustomerProfileProviderSchema = withDerivedInsightReasons(
  z
    .object({
      providerId: z.string().min(1),
      name: z.string().min(1),
      providerName: z.string().min(1).optional(),
      payToWallet: PaymentRecipientAddressSchema,
      spendAtomic: AtomicAmountSchema,
      transactionCount: z.number().int().nonnegative(),
      txCount: z.number().int().nonnegative().optional(),
      firstSeenAt: z.string().datetime().optional(),
      lastSeenAt: z.string().datetime().optional(),
      confidence: z.number().min(0).max(1),
      description: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      serviceUrl: z.string().url().optional(),
      protocol: PaymentProtocolSchema.optional(),
      chain: z.string().min(1).optional(),
      assetSymbol: z.string().min(1).optional(),
      apiPaths: z.array(z.string().min(1)).optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
      evidence: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerProfileProvider = z.infer<typeof PhaseBCustomerProfileProviderSchema>;

export const PhaseBWalletActivityTimelineSchema = withDerivedInsightReasons(
  z
    .object({
      at: z.string().datetime(),
      eventType: z.enum(["activation", "payment", "co_usage", "insight", "other"]),
      description: z.string().min(1),
      amountAtomic: AtomicAmountSchema.optional(),
      relatedProviderId: z.string().min(1).optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBWalletActivityTimeline = z.infer<typeof PhaseBWalletActivityTimelineSchema>;

export const PhaseBCustomerInsightSchema = withDerivedInsightReasons(
  z
    .object({
      key: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      confidence: z.number().min(0).max(1),
      classification: z.enum(["retention", "upsell", "partnership"]),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerInsight = z.infer<typeof PhaseBCustomerInsightSchema>;

export const PhaseBCustomerProfileSchema = withDerivedInsightReasons(
  z
    .object({
      identity: PhaseBCustomerProfileIdentitySchema,
      metrics: PhaseBCustomerProfileMetricsSchema,
      providers: z.array(PhaseBCustomerProfileProviderSchema).min(0),
      timeline: z.array(PhaseBWalletActivityTimelineSchema).min(0),
      insights: z.array(PhaseBCustomerInsightSchema).min(0),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerProfile = z.infer<typeof PhaseBCustomerProfileSchema>;

export const CustomerProfileSchema = PhaseBCustomerProfileSchema;
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

export const PhaseBCustomerProfileResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      scope: PhaseBResponseScopeSchema.optional(),
      profile: PhaseBCustomerProfileSchema,
      provenance: DataProvenanceSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerProfileResponse = z.infer<typeof PhaseBCustomerProfileResponseSchema>;

export const PhaseBUpsellReasonCodeSchema = z.enum([
  "top_spender",
  "recently_active",
  "multi_provider_usage",
  "high_transaction_count",
  "free_tier_near_limit",
  "external_x402_usage",
  "high_upsell_score",
]);

export type PhaseBUpsellReasonCode = z.infer<typeof PhaseBUpsellReasonCodeSchema>;

export const PhaseBCustomerUpsellSignalsSchema = z
  .object({
    spendAtomic: AtomicAmountSchema,
    spendRank: z.number().int().positive(),
    spendPercentile: z.number().min(0).max(1),
    customerCount: z.number().int().positive(),
    observationCount: z.number().int().nonnegative(),
    providerCount: z.number().int().nonnegative(),
    txCount: z.number().int().nonnegative().nullable(),
    averageSpendAtomic: AtomicAmountSchema.nullable(),
    firstSeenAt: z.string().datetime().nullable(),
    lastSeenAt: z.string().datetime().nullable(),
    daysSinceLastSeen: z.number().int().nonnegative().nullable(),
    freeTierProgress: z.number().min(0).max(1),
    activityGrowth: z.number(),
    entryPointRatio: z.number().min(0).max(1),
    upsellOpportunity: z.enum(["low", "medium", "high"]),
    x402ServiceCount: z.number().int().nonnegative(),
  })
  .strict();

export type PhaseBCustomerUpsellSignals = z.infer<typeof PhaseBCustomerUpsellSignalsSchema>;

export const PhaseBCustomerUpsellFlagsSchema = z
  .object({
    isTopSpender: z.boolean(),
    isRecentlyActive: z.boolean(),
    isMultiProvider: z.boolean(),
    hasHighTransactionCount: z.boolean(),
    isNearFreeTierLimit: z.boolean(),
    hasExternalX402Usage: z.boolean(),
    isHighUpsellCandidate: z.boolean(),
  })
  .strict();

export type PhaseBCustomerUpsellFlags = z.infer<typeof PhaseBCustomerUpsellFlagsSchema>;

export const PhaseBCustomerUpsellMetricsResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      address: PaymentRecipientAddressSchema,
      sourceGeneratedAt: z.string().datetime(),
      signals: PhaseBCustomerUpsellSignalsSchema,
      flags: PhaseBCustomerUpsellFlagsSchema,
      reasonCodes: z.array(PhaseBUpsellReasonCodeSchema).min(0),
      caveats: z.array(z.string().min(1)).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict(),
);

export type PhaseBCustomerUpsellMetricsResponse = z.infer<
  typeof PhaseBCustomerUpsellMetricsResponseSchema
>;

export const validatePhaseBCustomerUpsellMetricsResponse = (value: unknown) =>
  PhaseBCustomerUpsellMetricsResponseSchema.parse(value);

export const PhaseBCustomerUpsellExplanationModelSchema = z
  .object({
    provider: z.enum(["qvac", "bedrock"]),
    modelId: z.string().min(1),
    region: z.string().min(1).optional(),
    promptVersion: z.string().min(1),
  })
  .strict();

export type PhaseBCustomerUpsellExplanationModel = z.infer<
  typeof PhaseBCustomerUpsellExplanationModelSchema
>;

export const PhaseBCustomerUpsellExplanationInputSchema = z
  .object({
    signals: PhaseBCustomerUpsellSignalsSchema,
    flags: PhaseBCustomerUpsellFlagsSchema,
    reasonCodes: z.array(PhaseBUpsellReasonCodeSchema).min(0),
    caveats: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type PhaseBCustomerUpsellExplanationInput = z.infer<
  typeof PhaseBCustomerUpsellExplanationInputSchema
>;

export const PhaseBCustomerUpsellExplanationSchema = z
  .object({
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1),
    recommendedAction: z.string().min(1),
    caution: z.string().min(1),
  })
  .strict();

export type PhaseBCustomerUpsellExplanation = z.infer<typeof PhaseBCustomerUpsellExplanationSchema>;

export const PhaseBCustomerUpsellExplanationResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      address: PaymentRecipientAddressSchema,
      sourceGeneratedAt: z.string().datetime(),
      model: PhaseBCustomerUpsellExplanationModelSchema,
      input: PhaseBCustomerUpsellExplanationInputSchema,
      explanation: PhaseBCustomerUpsellExplanationSchema,
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict(),
);

export type PhaseBCustomerUpsellExplanationResponse = z.infer<
  typeof PhaseBCustomerUpsellExplanationResponseSchema
>;

export const validatePhaseBCustomerUpsellExplanationResponse = (value: unknown) =>
  PhaseBCustomerUpsellExplanationResponseSchema.parse(value);

export const PhaseBCustomerWorkflowIntentSessionProviderSchema = z
  .object({
    providerId: z.string().min(1).optional(),
    providerName: z.string().min(1),
    payToWallet: PaymentRecipientAddressSchema.optional(),
    eventCount: z.number().int().positive(),
    totalAmountAtomic: AtomicAmountSchema,
    activityLabels: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type PhaseBCustomerWorkflowIntentSessionProvider = z.infer<
  typeof PhaseBCustomerWorkflowIntentSessionProviderSchema
>;

export const PhaseBCustomerWorkflowIntentSessionEventSchema = z
  .object({
    at: z.string().datetime(),
    providerId: z.string().min(1).optional(),
    providerName: z.string().min(1),
    payToWallet: PaymentRecipientAddressSchema.optional(),
    activityLabel: z.string().min(1),
    description: z.string().min(1),
    amountAtomic: AtomicAmountSchema.optional(),
  })
  .strict();

export type PhaseBCustomerWorkflowIntentSessionEvent = z.infer<
  typeof PhaseBCustomerWorkflowIntentSessionEventSchema
>;

export const PhaseBCustomerWorkflowIntentSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    durationSeconds: z.number().int().nonnegative(),
    eventCount: z.number().int().positive(),
    distinctProviderCount: z.number().int().positive(),
    distinctActivityCount: z.number().int().positive(),
    totalAmountAtomic: AtomicAmountSchema,
    providers: z.array(PhaseBCustomerWorkflowIntentSessionProviderSchema).min(1),
    events: z.array(PhaseBCustomerWorkflowIntentSessionEventSchema).min(2),
  })
  .strict();

export type PhaseBCustomerWorkflowIntentSession = z.infer<
  typeof PhaseBCustomerWorkflowIntentSessionSchema
>;

export const PhaseBCustomerWorkflowIntentInputSchema = z
  .object({
    sessionWindowSeconds: z.number().int().positive(),
    sessions: z.array(PhaseBCustomerWorkflowIntentSessionSchema).min(1),
  })
  .strict();

export type PhaseBCustomerWorkflowIntentInput = z.infer<
  typeof PhaseBCustomerWorkflowIntentInputSchema
>;

export const validatePhaseBCustomerWorkflowIntentInput = (value: unknown) =>
  PhaseBCustomerWorkflowIntentInputSchema.parse(value);

export const PhaseBCustomerWorkflowIntentExplanationSchema = z
  .object({
    sessionId: z.string().min(1),
    summary: z.string().min(1),
    intent: z.string().min(1),
    scenarios: z.array(z.string().min(1)).min(2).max(3),
    evidence: z.array(z.string().min(1)).min(1),
    caution: z.string().min(1),
  })
  .strict();

export type PhaseBCustomerWorkflowIntentExplanation = z.infer<
  typeof PhaseBCustomerWorkflowIntentExplanationSchema
>;

export const PhaseBCustomerWorkflowIntentAnalysisStatusSchema = z.enum([
  "ready",
  "no_candidate_sessions",
  "unavailable",
  "failed",
]);

export type PhaseBCustomerWorkflowIntentAnalysisStatus = z.infer<
  typeof PhaseBCustomerWorkflowIntentAnalysisStatusSchema
>;

export const PhaseBCustomerWorkflowIntentResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      address: PaymentRecipientAddressSchema,
      sourceGeneratedAt: z.string().datetime(),
      sessionWindowSeconds: z.number().int().positive(),
      sessionCount: z.number().int().nonnegative(),
      remainingSessionCount: z.number().int().nonnegative(),
      analysisStatus: PhaseBCustomerWorkflowIntentAnalysisStatusSchema,
      model: PhaseBCustomerUpsellExplanationModelSchema.nullable(),
      input: PhaseBCustomerWorkflowIntentInputSchema.nullable(),
      explanations: z.array(PhaseBCustomerWorkflowIntentExplanationSchema).min(0),
      sessions: z.array(PhaseBCustomerWorkflowIntentSessionSchema).min(0),
      failureMessage: z.string().min(1).nullable().optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict(),
);

export type PhaseBCustomerWorkflowIntentResponse = z.infer<
  typeof PhaseBCustomerWorkflowIntentResponseSchema
>;

export const validatePhaseBCustomerWorkflowIntentResponse = (value: unknown) =>
  PhaseBCustomerWorkflowIntentResponseSchema.parse(value);

export const PhaseBWalletUsageGraphObservationSchema = withDerivedInsightReasons(
  z
    .object({
      providerId: z.string().min(1),
      providerName: z.string().min(1),
      serviceName: z.string().min(1),
      sharedSpendAtomic: AtomicAmountSchema,
      sharedTransactionCount: z.number().int().nonnegative(),
      overlapProviderCount: z.number().int().nonnegative(),
      confidence: z.number().min(0).max(1),
      firstSeenAt: z.string().datetime(),
      lastSeenAt: z.string().datetime(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBWalletUsageGraphObservation = z.infer<
  typeof PhaseBWalletUsageGraphObservationSchema
>;

export const PhaseBWalletUsageGraphOtherServiceCandidateSchema = withDerivedInsightReasons(
  z
    .object({
      providerId: z.string().min(1),
      providerName: z.string().min(1),
      serviceName: z.string().min(1),
      coUsageCount: z.number().int().nonnegative(),
      confidence: z.number().min(0).max(1),
      payToWallet: PaymentRecipientAddressSchema.optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBWalletUsageGraphOtherServiceCandidate = z.infer<
  typeof PhaseBWalletUsageGraphOtherServiceCandidateSchema
>;

export const PhaseBWalletUsageGraphPayerWalletSchema = withDerivedInsightReasons(
  z
    .object({
      address: PaymentRecipientAddressSchema,
      label: LabelSchema,
      sharedSpendAtomic: AtomicAmountSchema,
      sharedTransactionCount: z.number().int().nonnegative(),
      overlapProviderCount: z.number().int().nonnegative(),
      confidence: z.number().min(0).max(1),
      firstSeenAt: z.string().datetime(),
      lastSeenAt: z.string().datetime(),
      observations: z.array(PhaseBWalletUsageGraphObservationSchema).min(0),
      otherServiceCandidates: z.array(PhaseBWalletUsageGraphOtherServiceCandidateSchema).min(0),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBWalletUsageGraphPayerWallet = z.infer<
  typeof PhaseBWalletUsageGraphPayerWalletSchema
>;

export const PhaseBWalletUsageGraphProviderWalletSchema = withDerivedInsightReasons(
  z
    .object({
      providerId: z.string().min(1),
      providerName: z.string().min(1),
      name: z.string().min(1),
      payToWallet: PaymentRecipientAddressSchema,
      payerWallets: z.array(PhaseBWalletUsageGraphPayerWalletSchema).min(0),
      confidence: z.number().min(0).max(1),
      firstSeenAt: z.string().datetime().optional(),
      lastSeenAt: z.string().datetime().optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBWalletUsageGraphProviderWallet = z.infer<
  typeof PhaseBWalletUsageGraphProviderWalletSchema
>;

export const PhaseBWalletUsageGraphSchema = withDerivedInsightReasons(
  z
    .object({
      generatedFrom: z.string().min(1),
      payerWalletLanguage: z.string().min(1),
      identityFieldsExcluded: z.array(z.string().min(1)),
      providerWallets: z.array(PhaseBWalletUsageGraphProviderWalletSchema).min(0),
      confidence: z.number().min(0).max(1),
      reasons: z.array(EvidenceLabelSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export const WalletUsageGraphSchema = PhaseBWalletUsageGraphSchema;
export type WalletUsageGraph = z.infer<typeof WalletUsageGraphSchema>;

export type PhaseBWalletUsageGraph = z.infer<typeof PhaseBWalletUsageGraphSchema>;

export const WalletUsageGraphResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      graph: PhaseBWalletUsageGraphSchema,
      scope: PhaseBResponseScopeSchema.optional(),
      provenance: DataProvenanceSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type WalletUsageGraphResponse = z.infer<typeof WalletUsageGraphResponseSchema>;

export const CustomerIntelligenceTimeWindowSchema = z
  .object({ from: z.string().datetime(), to: z.string().datetime() })
  .strict()
  .superRefine((value, ctx) => {
    if (Date.parse(value.from) > Date.parse(value.to)) {
      ctx.addIssue({
        code: "custom",
        message: "timeWindow.from must be before or equal to timeWindow.to",
        path: ["from"],
      });
    }
  });
export type CustomerIntelligenceTimeWindow = z.infer<typeof CustomerIntelligenceTimeWindowSchema>;

export const CustomerIntelligenceScopeSchema = z
  .object({
    address: PaymentRecipientAddressSchema,
    network: z.preprocess(
      (value) => (typeof value === "string" ? normalizeNetwork(value) : value),
      z.string().min(1),
    ),
    asset: z.preprocess(
      (value) => (typeof value === "string" ? normalizeAsset(value) : value),
      z.string().min(1),
    ),
    timeWindow: CustomerIntelligenceTimeWindowSchema,
  })
  .strict();
export type CustomerIntelligenceScope = z.infer<typeof CustomerIntelligenceScopeSchema>;

export const CustomerOutgoingTransferFactSchema = z
  .object({
    txHash: TransactionHashSchema,
    customerAddress: EvmAddressSchema,
    payTo: EvmAddressSchema,
    amountAtomic: AtomicAmountSchema,
    network: z.preprocess(
      (value) => (typeof value === "string" ? normalizeNetwork(value) : value),
      z.string().min(1),
    ),
    asset: z.preprocess(
      (value) => (typeof value === "string" ? normalizeAsset(value) : value),
      z.string().min(1),
    ),
    timestamp: z.string().datetime(),
    blockNumber: z.string().regex(/^\d+$/).optional(),
    provenance: z.literal("onchain_fact"),
  })
  .strict();
export type CustomerOutgoingTransferFact = z.infer<typeof CustomerOutgoingTransferFactSchema>;

export const SourceCoverageSchema = z
  .object({
    source: z.enum(["bitquery", "cdp_discovery", "portfolio"]),
    status: z.enum(["available", "partial", "unavailable"]),
    unavailableReason: z.string().min(1).optional(),
    provenance: SourceProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "unavailable" && !value.unavailableReason) {
      ctx.addIssue({
        code: "custom",
        message: "unavailable source coverage must include unavailableReason",
        path: ["unavailableReason"],
      });
    }
  });
export type SourceCoverage = z.infer<typeof SourceCoverageSchema>;

export const CustomerIntelligenceEvidenceSchema = z
  .object({
    provenance: DataProvenanceSchema,
    label: z.string().min(1),
    txHashes: z.array(TransactionHashSchema).optional(),
    sourceFields: z.array(z.string().min(1)).optional(),
    description: z.string().optional(),
  })
  .strict();
export type CustomerIntelligenceEvidence = z.infer<typeof CustomerIntelligenceEvidenceSchema>;

export const PayToActivitySchema = withDerivedInsightReasons(
  z
    .object({
      payTo: PaymentRecipientAddressSchema,
      network: z.string().min(1),
      asset: z.string().min(1),
      transactionCount: z.number().int().nonnegative(),
      totalAmountAtomic: AtomicAmountSchema,
      latestTimestamp: z.string().datetime().optional(),
      txHashes: z.array(TransactionHashSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).min(1),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.transactionCount !== value.txHashes.length) {
        ctx.addIssue({
          code: "custom",
          message: "transactionCount must equal txHashes.length",
          path: ["transactionCount"],
        });
      }
    }),
);
export type PayToActivity = z.infer<typeof PayToActivitySchema>;

export const X402ServiceCandidateSchema = withDerivedInsightReasons(
  z
    .object({
      candidateId: z.string().min(1),
      payTo: PaymentRecipientAddressSchema,
      providerName: z.string().min(1).nullable(),
      serviceName: z.string().min(1).nullable(),
      resource: z.string().min(1).nullable(),
      network: z.string().min(1),
      asset: z.string().min(1),
      transactionCount: z.number().int().nonnegative(),
      totalAmountAtomic: AtomicAmountSchema,
      confidence: z.number().min(0).max(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).min(1),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict(),
);
export type X402ServiceCandidate = z.infer<typeof X402ServiceCandidateSchema>;

export const PortfolioSummarySchema = withDerivedInsightReasons(
  z
    .object({
      totalValueUsd: z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .nullable(),
      tokenCount: z.number().int().nonnegative(),
      sourceCoverage: SourceCoverageSchema,
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

export const DeFiPositionSchema = withDerivedInsightReasons(
  z
    .object({
      protocol: z.string().min(1),
      positionType: z.enum(["lending", "lp", "staking", "other"]),
      valueUsd: z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .nullable(),
      network: z.string().min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type DeFiPosition = z.infer<typeof DeFiPositionSchema>;

export const PortfolioSourceSummarySchema = z
  .object({
    totalValueUsd: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable(),
    tokenCount: z.number().int().nonnegative(),
    chains: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type PortfolioSourceSummary = z.infer<typeof PortfolioSourceSummarySchema>;

export const PortfolioSourcePositionSchema = z
  .object({
    protocol: z.string().min(1),
    positionType: z.enum(["lending", "lp", "staking", "other"]),
    valueUsd: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable(),
    network: z.string().min(1),
    evidence: z.array(CustomerIntelligenceEvidenceSchema).optional(),
    reasons: z.array(EvidenceLabelSchema).optional(),
  })
  .strict();
export type PortfolioSourcePosition = z.infer<typeof PortfolioSourcePositionSchema>;

export const PortfolioSourceResultSchema = z
  .object({
    summary: PortfolioSourceSummarySchema.optional(),
    positions: z.array(PortfolioSourcePositionSchema).optional(),
    sourceCoverage: SourceCoverageSchema,
  })
  .strict();
export type PortfolioSourceResult = z.infer<typeof PortfolioSourceResultSchema>;

export const validatePortfolioSourceResult = (value: unknown): PortfolioSourceResult =>
  PortfolioSourceResultSchema.parse(value);

export const CustomerIntelligenceInsightSchema = withDerivedInsightReasons(
  z
    .object({
      key: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      classification: z.enum(["retention", "upsell", "partnership", "defi_activity"]),
      confidence: z.number().min(0).max(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict(),
);
export type CustomerIntelligenceInsight = z.infer<typeof CustomerIntelligenceInsightSchema>;

export const CustomerIntelligenceResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      customerAddress: PaymentRecipientAddressSchema,
      scope: CustomerIntelligenceScopeSchema,
      x402Services: z.array(X402ServiceCandidateSchema).min(0),
      payToActivities: z.array(PayToActivitySchema).min(0),
      portfolioSummary: PortfolioSummarySchema,
      defiPositions: z.array(DeFiPositionSchema).min(0),
      insights: z.array(CustomerIntelligenceInsightSchema).min(0),
      sourceCoverage: z.array(SourceCoverageSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(CustomerIntelligenceEvidenceSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).min(1),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.customerAddress !== value.scope.address) {
        ctx.addIssue({
          code: "custom",
          message: "customerAddress must equal scope.address",
          path: ["customerAddress"],
        });
      }
    }),
);
export type CustomerIntelligenceResponse = z.infer<typeof CustomerIntelligenceResponseSchema>;

export const CustomerIntelligenceFixtureSchema = CustomerIntelligenceResponseSchema;
export type CustomerIntelligenceFixture = z.infer<typeof CustomerIntelligenceFixtureSchema>;
