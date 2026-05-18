import { z } from "zod";
import {
  AtomicAmountSchema,
  DataProvenanceSchema,
  EvmAddressSchema,
  EvidenceLabelSchema,
  LabelSchema,
  PaymentRecipientAddressSchema,
  ProvenanceByFieldSchema,
  SourceProvenanceSchema,
  TransactionHashSchema,
  withDerivedInsightReasons,
} from "./common";

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
    serviceId: z.string().min(1).optional(),
    network: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
    payTo: z.string().min(1).optional(),
  })
  .strict();

export type PhaseBResponseScope = z.infer<typeof PhaseBResponseScopeSchema>;

export const PhaseBCustomerListItemSchema = withDerivedInsightReasons(
  z
    .object({
      address: PaymentRecipientAddressSchema,
      label: LabelSchema,
      observationCount: z.number().int().nonnegative(),
      spendAtomic: AtomicAmountSchema,
      providerCount: z.number().int().nonnegative(),
      lastSeenAt: z.string().datetime().optional(),
      activityGrowth: z.number(),
      upsellOpportunity: z.enum(["low", "medium", "high"]),
      chains: z.array(z.string().min(1)).optional(),
      assets: z.array(z.string().min(1)).optional(),
      spendByAsset: z.record(z.string().min(1), AtomicAmountSchema).optional(),
      tags: z.array(z.string().min(1)).optional(),
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
