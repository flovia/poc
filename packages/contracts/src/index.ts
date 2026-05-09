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

export const SourceKindSchema = z.enum(["cdp_discovery", "bitquery", "derived", "zerion"]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const SourceProvenanceSchema = z
  .object({
    sourceKind: SourceKindSchema,
    sourceName: z.string().min(1),
    sourceUrl: z.string().url().optional(),
    sourceId: z.string().min(1).optional(),
    fetchedAt: z.string().datetime().optional(),
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

export const EndpointAttributionStatusSchema = z.enum([
  "direct_payto_endpoint",
  "bundled_payto_unknown_endpoint",
  "amount_inferred_endpoint",
  "sdk_attributed_endpoint",
  "demo_attributed_endpoint",
  "unresolved_payto",
]);
export type EndpointAttributionStatus = z.infer<typeof EndpointAttributionStatusSchema>;

export const ProvenanceByFieldSchema = z.record(z.string(), DataProvenanceSchema).optional();

export type ProvenanceByField = z.infer<typeof ProvenanceByFieldSchema>;

export const AtomicAmountSchema = z.string().regex(/^\d+$/);
export const TransactionHashSchema = z
  .string()
  .regex(/^0x[a-f0-9]{64}$/i)
  .transform((value) => value.toLowerCase());
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
    txHash: TransactionHashSchema,
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
    txHash: TransactionHashSchema,
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
    facts: z.array(RealTransactionFactSchema),
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
    const seenTxHashes = new Set<string>();
    for (const [index, fact] of value.facts.entries()) {
      const txHash = fact.txHash.toLowerCase();
      if (seenTxHashes.has(txHash)) {
        ctx.addIssue({
          code: "custom",
          message: "facts txHash values must be unique",
          path: ["facts", index, "txHash"],
        });
      }
      seenTxHashes.add(txHash);
    }
  });

export type RealTransactionFixture = z.infer<typeof RealTransactionFixtureSchema>;

export const MockEndpointAttributionItemSchema = z
  .object({
    txHash: TransactionHashSchema,
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
    items: z.array(MockEndpointAttributionItemSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seenTxHashes = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      const txHash = item.txHash.toLowerCase();
      if (seenTxHashes.has(txHash)) {
        ctx.addIssue({
          code: "custom",
          message: "attribution txHash values must be unique",
          path: ["items", index, "txHash"],
        });
      }
      seenTxHashes.add(txHash);
    }
  });

export type MockEndpointAttributionFixture = z.infer<typeof MockEndpointAttributionFixtureSchema>;

export const PhaseBResponseScopeSchema = z
  .object({
    providerId: z.string().min(1).optional(),
    network: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
    payTo: z.string().min(1).optional(),
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

export const ProviderCatalogRowSchema = withDerivedInsightReasons(
  z
    .object({
      providerId: z.string().min(1),
      name: z.string().min(1),
      serviceId: z.string().min(1).optional(),
      serviceName: z.string().min(1).optional(),
      network: z.string().min(1),
      asset: z.string().min(1),
      payTo: z.string().min(1),
      transactionCount: z.number().int().nonnegative(),
      uniqueSenderCount: z.number().int().nonnegative(),
      totalVolumeAtomic: AtomicAmountSchema,
      endpointCount: z.number().int().nonnegative(),
      resourceCount: z.number().int().nonnegative(),
      mappingPattern: z.enum([
        "one_payto_one_endpoint",
        "one_payto_many_endpoints",
        "many_paytos_one_service",
        "unresolved_payto",
      ]),
      endpointAttributionStatus: EndpointAttributionStatusSchema,
      attributionConfidence: z.number().min(0).max(1),
      hasCustomerFacts: z.boolean(),
      customerFactCount: z.number().int().nonnegative(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);

export type ProviderCatalogRow = z.infer<typeof ProviderCatalogRowSchema>;

export const ProviderCatalogResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      providers: z.array(ProviderCatalogRowSchema).min(0),
      providerCount: z.number().int().nonnegative(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.providerCount !== value.providers.length) {
        ctx.addIssue({
          code: "custom",
          message: "providerCount must equal providers.length",
          path: ["providerCount"],
        });
      }
    }),
);

export type ProviderCatalogResponse = z.infer<typeof ProviderCatalogResponseSchema>;

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
      address: EvmAddressSchema,
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
      address: EvmAddressSchema,
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
    address: EvmAddressSchema,
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
      payTo: EvmAddressSchema,
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
      payTo: EvmAddressSchema,
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
      customerAddress: EvmAddressSchema,
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

export const ServiceAnalyticsTopEndpointSchema = withDerivedInsightReasons(
  z
    .object({
      endpointPath: z.string().min(1),
      endpointName: z.string().min(1),
      transactionCount: z.number().int().nonnegative(),
      userCount: z.number().int().nonnegative(),
      endpointAttributionStatus: EndpointAttributionStatusSchema.optional(),
      attributionConfidence: z.number().min(0).max(1).optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type ServiceAnalyticsTopEndpoint = z.infer<typeof ServiceAnalyticsTopEndpointSchema>;

export const ServiceAnalyticsComparedToX402Schema = z
  .object({
    userShare: z.number().min(0),
    transactionShare: z.number().min(0),
    activityIndex: z.number().min(0),
    sampleBasis: z.string().min(1),
    availableServiceCount: z.number().int().nonnegative(),
  })
  .strict();
export type ServiceAnalyticsComparedToX402 = z.infer<typeof ServiceAnalyticsComparedToX402Schema>;

export const ServiceAnalyticsSummaryResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      serviceId: z.string().min(1),
      userCount: z.number().int().nonnegative(),
      transactionCount: z.number().int().nonnegative(),
      averageTransactionsPerUser: z.number().nonnegative(),
      repeatUserRate: z.number().min(0).max(1),
      topEndpoints: z.array(ServiceAnalyticsTopEndpointSchema).min(0),
      comparedToX402: ServiceAnalyticsComparedToX402Schema,
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type ServiceAnalyticsSummaryResponse = z.infer<typeof ServiceAnalyticsSummaryResponseSchema>;

export const ServiceAnalyticsComparisonServiceSchema = withDerivedInsightReasons(
  z
    .object({
      serviceId: z.string().min(1),
      serviceName: z.string().min(1),
      userCount: z.number().int().nonnegative(),
      transactionCount: z.number().int().nonnegative(),
      repeatUserRate: z.number().min(0).max(1),
      averageTransactionsPerUser: z.number().nonnegative(),
      endpointDiversity: z.number().int().nonnegative(),
      userOverlapWithCoinGecko: z.number().int().nonnegative(),
      sampleBasis: z.string().min(1),
      coverage: z.string().min(1).optional(),
      endpointAttributionStatus: EndpointAttributionStatusSchema.optional(),
      attributionConfidence: z.number().min(0).max(1).optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type ServiceAnalyticsComparisonService = z.infer<
  typeof ServiceAnalyticsComparisonServiceSchema
>;

export const ServiceAnalyticsComparisonResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      services: z.array(ServiceAnalyticsComparisonServiceSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (!value.services.some((service) => service.serviceId === "coingecko")) {
        ctx.addIssue({
          code: "custom",
          message: "service comparison must include coingecko",
          path: ["services"],
        });
      }
    }),
);
export type ServiceAnalyticsComparisonResponse = z.infer<
  typeof ServiceAnalyticsComparisonResponseSchema
>;

export const ServiceAnalyticsQuadrantAxisSchema = z
  .object({
    key: z.enum(["averageTransactionsPerUser", "endpointDiversity"]),
    label: z.string().min(1),
  })
  .strict();
export type ServiceAnalyticsQuadrantAxis = z.infer<typeof ServiceAnalyticsQuadrantAxisSchema>;

export const ServiceAnalyticsQuadrantPointSchema = withDerivedInsightReasons(
  z
    .object({
      serviceId: z.string().min(1),
      serviceName: z.string().min(1),
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
      userCount: z.number().int().nonnegative(),
      transactionCount: z.number().int().nonnegative(),
      sampleBasis: z.string().min(1),
      isCoinGecko: z.boolean(),
      coverage: z.string().min(1).optional(),
      endpointAttributionStatus: EndpointAttributionStatusSchema.optional(),
      attributionConfidence: z.number().min(0).max(1).optional(),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type ServiceAnalyticsQuadrantPoint = z.infer<typeof ServiceAnalyticsQuadrantPointSchema>;

export const ServiceAnalyticsQuadrantResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      axes: z
        .object({
          x: ServiceAnalyticsQuadrantAxisSchema,
          y: ServiceAnalyticsQuadrantAxisSchema,
        })
        .strict(),
      points: z.array(ServiceAnalyticsQuadrantPointSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type ServiceAnalyticsQuadrantResponse = z.infer<
  typeof ServiceAnalyticsQuadrantResponseSchema
>;

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

export const validateProviderCatalogResponse = (value: unknown): ProviderCatalogResponse =>
  ProviderCatalogResponseSchema.parse(value);

export const validatePhaseBCustomerProfileResponse = (
  value: unknown,
): PhaseBCustomerProfileResponse => PhaseBCustomerProfileResponseSchema.parse(value);

export const validatePhaseBWalletUsageGraphResponse = (value: unknown): WalletUsageGraphResponse =>
  WalletUsageGraphResponseSchema.parse(value);

export const validateCustomerIntelligenceResponse = (
  value: unknown,
): CustomerIntelligenceResponse => CustomerIntelligenceResponseSchema.parse(value);

export const validateCustomerIntelligenceFixture = (value: unknown): CustomerIntelligenceFixture =>
  CustomerIntelligenceFixtureSchema.parse(value);

export const validateServiceAnalyticsSummaryResponse = (
  value: unknown,
): ServiceAnalyticsSummaryResponse => ServiceAnalyticsSummaryResponseSchema.parse(value);

export const validateServiceAnalyticsComparisonResponse = (
  value: unknown,
): ServiceAnalyticsComparisonResponse => ServiceAnalyticsComparisonResponseSchema.parse(value);

export const validateServiceAnalyticsQuadrantResponse = (
  value: unknown,
): ServiceAnalyticsQuadrantResponse => ServiceAnalyticsQuadrantResponseSchema.parse(value);

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
