import { z } from "zod";
import {
  AtomicAmountSchema,
  DataProvenanceSchema,
  EndpointAttributionStatusSchema,
  EvidenceLabelSchema,
  PaymentProtocolSchema,
  ProvenanceByFieldSchema,
  withDerivedInsightReasons,
} from "./common";

export const PriceRangeUsdSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  })
  .strict();

const ProviderResourceSchema = z
  .object({
    resource: z.string().url(),
    network: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
    amountAtomic: AtomicAmountSchema.optional(),
    description: z.string().min(1).optional(),
    method: z.string().min(1).optional(),
    inputSchema: z.unknown().optional(),
    lastUpdated: z.string().datetime().optional(),
    x402Version: z.number().int().nonnegative().optional(),
    l30DaysTotalCalls: z.number().int().nonnegative().optional(),
    l30DaysUniquePayers: z.number().int().nonnegative().optional(),
    transactionCount: z.number().int().nonnegative().optional(),
    totalAmountAtomic: AtomicAmountSchema.optional(),
    /**
     * MPP registry payment metadata.
     * - `intent`: "charge" (per-call, fixed price) or "session" (per-session, often dynamic).
     * - `unitType`: e.g. "request" — billing unit when the price is unit-based.
     * - `dynamic`: true when the price is computed at runtime (e.g. token-based LLM cost).
     * - `decimals`: token decimals for amountAtomic (typically 6 for USDC).
     */
    intent: z.enum(["charge", "session"]).optional(),
    unitType: z.string().min(1).optional(),
    dynamic: z.boolean().optional(),
    decimals: z.number().int().nonnegative().optional(),
  })
  .strict();

const ProviderOfferSchema = z
  .object({
    protocol: PaymentProtocolSchema,
    chain: z.string().min(1),
    asset: z.string().min(1),
    payToAddress: z.string().min(1),
    probePriceUsd: z.number().nonnegative().optional(),
  })
  .strict();

export const ProviderCatalogSourceSchema = z.enum([
  "base_curated",
  "pay_sh_curated",
  "raw_x402",
  "mpp_registry",
]);

export type ProviderCatalogSource = z.infer<typeof ProviderCatalogSourceSchema>;

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
      catalogSource: ProviderCatalogSourceSchema.optional(),
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
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      /**
       * MPP services registry の公式 description。Pay.sh atlas 由来の
       * `description` と並べて GEO ページに別フィールドとして表示するため、
       * 衝突せず独立に保持する。
       */
      mppDescription: z.string().min(1).optional(),
      useCase: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      serviceUrl: z.string().url().optional(),
      hasMetering: z.boolean().optional(),
      hasFreeTier: z.boolean().optional(),
      providerSha: z.string().min(1).optional(),
      registryVersion: z.string().min(1).optional(),
      registryGeneratedAt: z.string().datetime().optional(),
      registrySourceUrl: z.string().url().optional(),
      offers: z.array(ProviderOfferSchema).optional(),
      protocol: PaymentProtocolSchema.optional(),
      chain: z.string().min(1).optional(),
      assetSymbol: z.string().min(1).optional(),
      priceRangeUsd: PriceRangeUsdSchema.optional(),
      resources: z.array(ProviderResourceSchema).optional(),
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
