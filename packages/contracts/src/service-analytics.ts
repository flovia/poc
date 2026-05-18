import { z } from "zod";
import {
  DataProvenanceSchema,
  EndpointAttributionStatusSchema,
  EvidenceLabelSchema,
  ProvenanceByFieldSchema,
  withDerivedInsightReasons,
} from "./common";

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
