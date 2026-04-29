import { z } from "zod";

export const BASE_NETWORK = "base";
export const BASE_CHAIN_ID_NETWORK = "eip155:8453";
export const BASE_USDC_ASSET = "USDC";
export const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const normalizeNetwork = (network: string): string => {
  const value = network.trim();
  if (value.toLowerCase() === BASE_NETWORK || value.toLowerCase() === BASE_CHAIN_ID_NETWORK) {
    return BASE_NETWORK;
  }
  return value;
};

export const normalizeAsset = (asset: string): string => {
  const value = asset.trim();
  if (
    value.toUpperCase() === BASE_USDC_ASSET ||
    value.toLowerCase() === BASE_USDC_CONTRACT.toLowerCase()
  ) {
    return BASE_USDC_ASSET;
  }
  return value;
};

export const normalizePayTo = (payTo: string): string => payTo.trim().toLowerCase();

export const normalizePaymentIdentity = (identity: {
  network: string;
  asset: string;
  payTo: string;
}) => ({
  network: normalizeNetwork(identity.network),
  asset: normalizeAsset(identity.asset),
  payTo: normalizePayTo(identity.payTo),
});

export const paymentIdentityKey = (identity: { network: string; asset: string; payTo: string }) => {
  const normalized = normalizePaymentIdentity(identity);
  return `${normalized.network}::${normalized.asset}::${normalized.payTo}`;
};

export const EvmAddressSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim().toLowerCase();
  },
  z
    .string()
    .regex(/^0x[a-f0-9]{40}$/i, "Invalid EVM address format")
    .transform((value) => value.toLowerCase()),
);

export const LabelSchema = z.string().min(1).nullable();

export type EvmAddress = z.infer<typeof EvmAddressSchema>;

export const SourceKindSchema = z.enum(["cdp_discovery", "bitquery", "derived"]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const SourceProvenanceSchema = z
  .object({
    sourceKind: SourceKindSchema,
    sourceName: z.string().min(1),
    sourceUrl: z.string().url().optional(),
    sourceId: z.string().min(1).optional(),
    fetchedAt: z.string().datetime().optional(),
    raw: z.unknown().optional(),
  })
  .strict();

export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

export const DataProvenanceSchema = z.enum([
  "onchain_fact",
  "demo_label",
  "future_sdk_field",
  "derived_insight",
]);
export type DataProvenance = z.infer<typeof DataProvenanceSchema>;

export const ProvenanceByFieldSchema = z.record(z.string(), DataProvenanceSchema).optional();

export type ProvenanceByField = z.infer<typeof ProvenanceByFieldSchema>;

export const AtomicAmountSchema = z.string().regex(/^\d+$/);
export const EvidenceLabelSchema = z
  .object({
    provenance: DataProvenanceSchema,
    label: z.string().min(1),
    description: z.string().optional(),
    sourceFields: z.array(z.string().min(1)).optional(),
  })
  .strict();

export type EvidenceLabel = z.infer<typeof EvidenceLabelSchema>;

const withDerivedInsightReasons = <
  T extends { provenance: DataProvenance; reasons?: EvidenceLabel[] },
>(
  schema: z.ZodType<T>,
) =>
  schema.superRefine((value, ctx) => {
    if (value.provenance === "derived_insight") {
      const reasons = value.reasons;
      if (!Array.isArray(reasons) || reasons.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "derived_insight must include reasons",
          path: ["reasons"],
        });
      }
    }
  });

export const CdpQualitySchema = z
  .object({
    confidence: z.number().min(0).max(1).optional(),
    reliability: z.enum(["low", "medium", "high"]).optional(),
    expectedTransactionCount: z.number().int().nonnegative().optional(),
    expectedUniqueSenderCount: z.number().int().nonnegative().optional(),
    expectedVolumeAtomic: z.string().regex(/^\d+$/).optional(),
    expectedAmountAtomic: z.string().regex(/^\d+$/).optional(),
    qualityNotes: z.string().optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type CdpQuality = z.infer<typeof CdpQualitySchema>;

export const CdpPaymentOptionSchema = z
  .object({
    scheme: z.string().min(1).optional(),
    network: z.string().min(1),
    asset: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
    payTo: z.string().min(1),
    provenance: SourceProvenanceSchema,
    quality: CdpQualitySchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CdpPaymentOption = z.infer<typeof CdpPaymentOptionSchema>;

export const CdpResourceSchema = z
  .object({
    resourceId: z.string().min(1),
    resource: z.string().min(1),
    provider: z.string().min(1).optional(),
    service: z.string().min(1).optional(),
    paymentOptions: z.array(CdpPaymentOptionSchema).min(1),
    provenance: SourceProvenanceSchema,
    quality: CdpQualitySchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CdpResource = z.infer<typeof CdpResourceSchema>;

export const BitqueryLatestTransferSchema = z
  .object({
    txHash: z.string().min(1),
    sender: z.string().min(1),
    recipient: z.string().min(1),
    amountAtomic: z.string().regex(/^\d+$/),
    blockNumber: z.string().regex(/^\d+$/).optional(),
    blockTimestamp: z.string().datetime().optional(),
  })
  .strict();

export type BitqueryLatestTransfer = z.infer<typeof BitqueryLatestTransferSchema>;

export const BitqueryTransferFactSchema = z
  .object({
    txHash: z.string().min(1),
    sender: EvmAddressSchema,
    recipient: EvmAddressSchema,
    amountAtomic: AtomicAmountSchema,
    blockNumber: z.string().regex(/^\d+$/).optional(),
    blockTimestamp: z.string().datetime(),
  })
  .strict();

export type BitqueryTransferFact = z.infer<typeof BitqueryTransferFactSchema>;

export const BitqueryAggregateSchema = z
  .object({
    network: z.string().min(1),
    asset: z.string().min(1),
    payTo: z.string().min(1),
    transactionCount: z.number().int().nonnegative(),
    uniqueSenderCount: z.number().int().nonnegative(),
    totalVolumeAtomic: z.string().regex(/^\d+$/),
    latestTransfer: BitqueryLatestTransferSchema.optional(),
    provenance: SourceProvenanceSchema,
    timeWindow: z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .optional(),
  })
  .strict();

export type BitqueryAggregate = z.infer<typeof BitqueryAggregateSchema>;

export const MarketDiscrepancySchema = z
  .object({
    metric: z.enum(["transactionCount", "uniqueSenderCount", "totalVolumeAtomic"]),
    cdpValue: z.union([z.string(), z.number(), z.null()]),
    bitqueryValue: z.union([z.string(), z.number(), z.null()]),
    severity: z.enum(["low", "medium", "high"]),
    note: z.string().min(1),
  })
  .strict();

export type MarketDiscrepancy = z.infer<typeof MarketDiscrepancySchema>;

export const MarketPaymentOptionSchema = z
  .object({
    cdpPaymentOption: CdpPaymentOptionSchema,
    bitqueryAggregate: BitqueryAggregateSchema,
    inScope: z.boolean(),
    isActive: z.boolean(),
    activityRank: z.number().int().nonnegative().optional(),
    discrepancies: z.array(MarketDiscrepancySchema),
  })
  .strict();

export type MarketPaymentOption = z.infer<typeof MarketPaymentOptionSchema>;

export const MarketResourceSnapshotSchema = z
  .object({
    resourceId: z.string().min(1),
    resource: z.string().min(1),
    provider: z.string().min(1).optional(),
    service: z.string().min(1).optional(),
    paymentOptions: z.array(MarketPaymentOptionSchema).min(1),
    isActive: z.boolean(),
    activityRank: z.number().int().nonnegative().optional(),
    totalTransactionCount: z.number().int().nonnegative(),
    totalVolumeAtomic: z.string().regex(/^\d+$/),
    discrepancyCount: z.number().int().nonnegative(),
  })
  .strict();

export type MarketResourceSnapshot = z.infer<typeof MarketResourceSnapshotSchema>;

export const MarketSnapshotSummarySchema = z
  .object({
    totalResources: z.number().int().nonnegative(),
    scopedResources: z.number().int().nonnegative(),
    totalPaymentOptions: z.number().int().nonnegative(),
    scopedPaymentOptions: z.number().int().nonnegative(),
    activeResources: z.number().int().nonnegative(),
    activePaymentOptions: z.number().int().nonnegative(),
    discrepancyCount: z.number().int().nonnegative(),
    topResources: z
      .array(
        z.object({
          resourceId: z.string().min(1),
          totalTransactionCount: z.number().int().nonnegative(),
          activityRank: z.number().int().nonnegative(),
        }),
      )
      .max(10),
    totalTransactions: z.number().int().nonnegative(),
    totalUniqueSenders: z.number().int().nonnegative(),
  })
  .strict();

export type MarketSnapshotSummary = z.infer<typeof MarketSnapshotSummarySchema>;

export const MarketSnapshotSourceSchema = z
  .object({
    generatedBy: z.string().min(1),
    cdp: SourceProvenanceSchema.extend({
      fetchLimit: z.number().int().positive().nullable(),
      fetchCount: z.number().int().nonnegative(),
    }),
    bitquery: SourceProvenanceSchema.extend({
      queriedPairs: z.number().int().nonnegative(),
    }),
  })
  .strict();

export type MarketSnapshotSource = z.infer<typeof MarketSnapshotSourceSchema>;

export const MarketScopeSchema = z
  .object({
    network: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
  })
  .strict();

export type MarketScope = z.infer<typeof MarketScopeSchema>;

export const MarketSnapshotSchema = z
  .object({
    generatedAt: z.string().datetime(),
    scope: MarketScopeSchema,
    source: MarketSnapshotSourceSchema,
    summary: MarketSnapshotSummarySchema,
    resources: z.array(MarketResourceSnapshotSchema).min(0),
  })
  .strict();

export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const PhaseATimeWindowSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

export type PhaseATimeWindow = z.infer<typeof PhaseATimeWindowSchema>;

export const RealTransactionFactSchema = z
  .object({
    txHash: z.string().min(1),
    payerWallet: EvmAddressSchema,
    payTo: EvmAddressSchema,
    amount: AtomicAmountSchema,
    asset: z.string().min(1),
    network: z.string().min(1),
    timestamp: z.string().datetime(),
    blockNumber: z.string().regex(/^\d+$/).optional(),
    provenance: z.literal("onchain_fact"),
  })
  .strict();

export type RealTransactionFact = z.infer<typeof RealTransactionFactSchema>;

export const RealTransactionFixtureSchema = z
  .object({
    generatedAt: z.string().datetime(),
    providerId: z.string().min(1),
    resource: z.string().min(1).optional(),
    metadata: z
      .object({
        requestedLimit: z.number().int().positive(),
        capturedCount: z.number().int().nonnegative(),
        timeWindow: PhaseATimeWindowSchema,
        source: SourceProvenanceSchema,
      })
      .strict(),
    facts: z.array(RealTransactionFactSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.metadata.capturedCount !== value.facts.length) {
      ctx.addIssue({
        code: "custom",
        message: "capturedCount must equal facts.length",
        path: ["metadata", "capturedCount"],
      });
    }
  });

export type RealTransactionFixture = z.infer<typeof RealTransactionFixtureSchema>;

export const MockEndpointAttributionItemSchema = z
  .object({
    txHash: z.string().min(1),
    endpointPath: z.string().min(1),
    endpointName: z.string().min(1),
    workflowLabel: z.string().min(1),
    requestMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    provenance: z
      .object({
        endpointPath: z.enum(["demo_label", "future_sdk_field"]),
        endpointName: z.enum(["demo_label", "future_sdk_field"]),
        workflowLabel: z.enum(["demo_label", "future_sdk_field"]),
        requestMethod: z.enum(["demo_label", "future_sdk_field"]),
      })
      .strict(),
    reasons: z.array(EvidenceLabelSchema).min(1),
  })
  .strict();

export type MockEndpointAttributionItem = z.infer<typeof MockEndpointAttributionItemSchema>;

export const MockEndpointAttributionFixtureSchema = z
  .object({
    generatedAt: z.string().datetime(),
    source: SourceProvenanceSchema.extend({ sourceKind: z.literal("derived") }),
    items: z.array(MockEndpointAttributionItemSchema).min(1),
  })
  .strict();

export type MockEndpointAttributionFixture = z.infer<typeof MockEndpointAttributionFixtureSchema>;

export const PhaseBResponseScopeSchema = z
  .object({
    providerId: z.string().min(1).optional(),
    network: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
    payTo: EvmAddressSchema.optional(),
  })
  .strict();

export type PhaseBResponseScope = z.infer<typeof PhaseBResponseScopeSchema>;

export const PhaseBCustomerListItemSchema = withDerivedInsightReasons(
  z
    .object({
      address: EvmAddressSchema,
      label: LabelSchema,
      observationCount: z.number().int().nonnegative(),
      spendAtomic: AtomicAmountSchema,
      providerCount: z.number().int().nonnegative(),
      lastSeenAt: z.string().datetime().optional(),
      activityGrowth: z.number(),
      upsellOpportunity: z.enum(["low", "medium", "high"]),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      evidence: z.array(EvidenceLabelSchema).optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type PhaseBCustomerListItem = z.infer<typeof PhaseBCustomerListItemSchema>;

export const PhaseBCustomerListResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      customers: z.array(PhaseBCustomerListItemSchema).min(0),
      customerCount: z.number().int().nonnegative(),
      scope: PhaseBResponseScopeSchema.optional(),
      provenance: DataProvenanceSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.customerCount !== value.customers.length) {
        ctx.addIssue({
          code: "custom",
          message: "customerCount must equal customers.length",
          path: ["customerCount"],
        });
      }
    }),
);

export type PhaseBCustomerListResponse = z.infer<typeof PhaseBCustomerListResponseSchema>;

export const PhaseBCustomerProfileIdentitySchema = withDerivedInsightReasons(
  z
    .object({
      address: EvmAddressSchema,
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
      payToWallet: EvmAddressSchema,
      spendAtomic: AtomicAmountSchema,
      transactionCount: z.number().int().nonnegative(),
      txCount: z.number().int().nonnegative().optional(),
      firstSeenAt: z.string().datetime().optional(),
      lastSeenAt: z.string().datetime().optional(),
      confidence: z.number().min(0).max(1),
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
      payToWallet: EvmAddressSchema.optional(),
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
      address: EvmAddressSchema,
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
      payToWallet: EvmAddressSchema,
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

export const validateCdpPaymentOption = (value: unknown): CdpPaymentOption =>
  CdpPaymentOptionSchema.parse(value);

export const validateCdpResource = (value: unknown): CdpResource => CdpResourceSchema.parse(value);

export const validateBitqueryAggregate = (value: unknown): BitqueryAggregate =>
  BitqueryAggregateSchema.parse(value);

export const validateMarketPaymentOption = (value: unknown): MarketPaymentOption =>
  MarketPaymentOptionSchema.parse(value);

export const validateMarketResourceSnapshot = (value: unknown): MarketResourceSnapshot =>
  MarketResourceSnapshotSchema.parse(value);

export const validateMarketSnapshot = (value: unknown): MarketSnapshot =>
  MarketSnapshotSchema.parse(value);

export const validateRealTransactionFixture = (value: unknown): RealTransactionFixture =>
  RealTransactionFixtureSchema.parse(value);

export const validateMockEndpointAttributionFixture = (
  value: unknown,
): MockEndpointAttributionFixture => MockEndpointAttributionFixtureSchema.parse(value);

export const validatePhaseBCustomerListResponse = (value: unknown): PhaseBCustomerListResponse =>
  PhaseBCustomerListResponseSchema.parse(value);

export const validatePhaseBCustomerProfileResponse = (
  value: unknown,
): PhaseBCustomerProfileResponse => PhaseBCustomerProfileResponseSchema.parse(value);

export const validatePhaseBWalletUsageGraphResponse = (value: unknown): WalletUsageGraphResponse =>
  WalletUsageGraphResponseSchema.parse(value);

export const zeroBitqueryAggregate = (identity: {
  network: string;
  asset: string;
  payTo: string;
  provenance?: SourceProvenance;
}): BitqueryAggregate => ({
  network: identity.network,
  asset: identity.asset,
  payTo: identity.payTo,
  transactionCount: 0,
  uniqueSenderCount: 0,
  totalVolumeAtomic: "0",
  provenance: identity.provenance ?? {
    sourceKind: "bitquery",
    sourceName: "bitquery",
  },
});
