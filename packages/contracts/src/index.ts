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
  if (value.toUpperCase() === BASE_USDC_ASSET || value.toLowerCase() === BASE_USDC_CONTRACT.toLowerCase()) {
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
