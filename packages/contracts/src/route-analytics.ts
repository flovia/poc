import { z } from "zod";
import {
  DataProvenanceSchema,
  EvidenceLabelSchema,
  ProvenanceByFieldSchema,
  withDerivedInsightReasons,
} from "./common";

export const MachinePaymentRailSchema = z.enum([
  "x402",
  "stripe_mpp",
  "hitpay_mpp",
  "api_key",
  "subscription",
  "other",
]);
export type MachinePaymentRail = z.infer<typeof MachinePaymentRailSchema>;

export const MachinePaymentProtocolSchema = z.enum(["x402", "mpp", "legacy", "other"]);
export type MachinePaymentProtocol = z.infer<typeof MachinePaymentProtocolSchema>;

export const RouteAnalyticsVisibilitySchema = z.enum([
  "public_onchain",
  "provider_attested",
  "first_party",
  "demo_label",
  "derived_insight",
]);
export type RouteAnalyticsVisibility = z.infer<typeof RouteAnalyticsVisibilitySchema>;

export const SettlementReferenceTypeSchema = z.enum([
  "onchain_tx",
  "stripe_payment_intent",
  "hitpay_charge",
  "provider_receipt",
  "session",
]);
export type SettlementReferenceType = z.infer<typeof SettlementReferenceTypeSchema>;

export const SettlementReferenceSchema = z
  .object({
    type: SettlementReferenceTypeSchema,
    value: z.string().min(1),
    url: z.string().url().optional(),
  })
  .strict();
export type SettlementReference = z.infer<typeof SettlementReferenceSchema>;

export const RouteAnalyticsStatusSchema = z.enum([
  "requested",
  "paid",
  "settled",
  "failed",
  "abandoned",
]);
export type RouteAnalyticsStatus = z.infer<typeof RouteAnalyticsStatusSchema>;

export const RouteAnalyticsEventSchema = withDerivedInsightReasons(
  z
    .object({
      routeId: z.string().min(1),
      workflowId: z.string().min(1),
      sessionId: z.string().min(1).optional(),
      rail: MachinePaymentRailSchema,
      protocol: MachinePaymentProtocolSchema,
      sourceRoute: z.string().min(1).optional(),
      sourcePlatform: z.string().min(1).optional(),
      router: z.string().min(1).optional(),
      providerId: z.string().min(1),
      endpointGroup: z.string().min(1).optional(),
      useCase: z.string().min(1).optional(),
      payerIdentity: z.string().min(1).optional(),
      payeeIdentity: z.string().min(1).optional(),
      amountUsd: z.number().nonnegative().optional(),
      currency: z.string().min(1),
      status: RouteAnalyticsStatusSchema,
      settlementRef: SettlementReferenceSchema.optional(),
      visibility: RouteAnalyticsVisibilitySchema,
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      timestamp: z.string().datetime(),
      latencyMs: z.number().int().nonnegative().optional(),
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type RouteAnalyticsEvent = z.infer<typeof RouteAnalyticsEventSchema>;

export const RouteAnalyticsRailSummarySchema = z
  .object({
    rail: MachinePaymentRailSchema,
    routeCount: z.number().int().nonnegative(),
    workflowCount: z.number().int().nonnegative(),
    paidWorkflowCount: z.number().int().nonnegative(),
    settledUsd: z.number().nonnegative(),
    successRate: z.number().min(0).max(1),
    repeatUsage: z.number().int().nonnegative(),
    visibility: RouteAnalyticsVisibilitySchema,
  })
  .strict();
export type RouteAnalyticsRailSummary = z.infer<typeof RouteAnalyticsRailSummarySchema>;

export const RouteAnalyticsSummaryResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      routeCount: z.number().int().nonnegative(),
      workflowCount: z.number().int().nonnegative(),
      paidWorkflowCount: z.number().int().nonnegative(),
      settledUsd: z.number().nonnegative(),
      successRate: z.number().min(0).max(1),
      repeatUsage: z.number().int().nonnegative(),
      paymentToAccessConversion: z.number().min(0).max(1).optional(),
      rails: z.array(RouteAnalyticsRailSummarySchema).min(1),
      sampleRoutes: z.array(RouteAnalyticsEventSchema).min(0),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type RouteAnalyticsSummaryResponse = z.infer<typeof RouteAnalyticsSummaryResponseSchema>;

export const RouteAnalyticsSankeyNodeSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    layer: z.enum(["source_route", "payment_rail", "api_workflow"]),
    rail: MachinePaymentRailSchema.optional(),
    visibility: RouteAnalyticsVisibilitySchema.optional(),
  })
  .strict();
export type RouteAnalyticsSankeyNode = z.infer<typeof RouteAnalyticsSankeyNodeSchema>;

export const RouteAnalyticsSankeyLinkSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
    routeCount: z.number().int().nonnegative(),
    workflowCount: z.number().int().nonnegative(),
    settledUsd: z.number().nonnegative(),
    rail: MachinePaymentRailSchema,
    visibility: RouteAnalyticsVisibilitySchema,
  })
  .strict();
export type RouteAnalyticsSankeyLink = z.infer<typeof RouteAnalyticsSankeyLinkSchema>;

export const RouteAnalyticsSankeyResponseSchema = withDerivedInsightReasons(
  z
    .object({
      generatedAt: z.string().datetime(),
      generatedFrom: z.string().min(1),
      layers: z.tuple([
        z.literal("source_route"),
        z.literal("payment_rail"),
        z.literal("api_workflow"),
      ]),
      nodes: z.array(RouteAnalyticsSankeyNodeSchema).min(1),
      links: z.array(RouteAnalyticsSankeyLinkSchema).min(1),
      provenance: DataProvenanceSchema,
      provenanceByField: ProvenanceByFieldSchema,
      reasons: z.array(EvidenceLabelSchema).optional(),
    })
    .strict(),
);
export type RouteAnalyticsSankeyResponse = z.infer<typeof RouteAnalyticsSankeyResponseSchema>;
