import { z } from "zod";
import {
  AtomicAmountSchema,
  EvmAddressSchema,
  SourceProvenanceSchema,
  TransactionHashSchema,
  type SourceProvenance,
} from "./common";

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
