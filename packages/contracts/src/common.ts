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

const EVM_ADDRESS_PATTERN = /^0[xX][a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SPL_TOKEN_PATTERN = /^SPL:[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ERC20_TOKEN_PATTERN = /^ERC20:0[xX][a-fA-F0-9]{40}$/;

export const PaymentRecipientAddressSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .min(1)
    .refine(
      (value) =>
        EVM_ADDRESS_PATTERN.test(value) ||
        SOLANA_ADDRESS_PATTERN.test(value) ||
        SPL_TOKEN_PATTERN.test(value) ||
        ERC20_TOKEN_PATTERN.test(value),
      "Invalid payment recipient address (expected EVM hex, Solana base58, SPL:..., or ERC20:0x...)",
    )
    .transform((value) => {
      if (EVM_ADDRESS_PATTERN.test(value)) {
        return value.toLowerCase();
      }
      if (ERC20_TOKEN_PATTERN.test(value)) {
        const [prefix, hex] = value.split(":");
        return `${prefix}:${hex.toLowerCase()}`;
      }
      return value;
    }),
);

export type PaymentRecipientAddress = z.infer<typeof PaymentRecipientAddressSchema>;

export const normalizePaymentRecipientAddress = (value: string): string => {
  const trimmed = value.trim();
  if (EVM_ADDRESS_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  if (ERC20_TOKEN_PATTERN.test(trimmed)) {
    const [prefix, hex] = trimmed.split(":");
    return `${prefix}:${hex.toLowerCase()}`;
  }
  return trimmed;
};

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
  "registry_fact",
]);
export type DataProvenance = z.infer<typeof DataProvenanceSchema>;

export const EndpointAttributionStatusSchema = z.enum([
  "direct_payto_endpoint",
  "bundled_payto_unknown_endpoint",
  "amount_inferred_endpoint",
  "sdk_attributed_endpoint",
  "demo_attributed_endpoint",
  "mpp_attributed_endpoint",
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

export const withDerivedInsightReasons = <
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

export const PaymentProtocolSchema = z.enum(["x402", "MPP"]);
export type PaymentProtocol = z.infer<typeof PaymentProtocolSchema>;
