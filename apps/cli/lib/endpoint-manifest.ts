import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const ENDPOINT_MANIFEST_SCHEMA_VERSION = "1";

export const DiscoveryMethodSchema = z.enum(["catalog", "docs", "llm_candidate", "manual"]);
export type DiscoveryMethod = z.infer<typeof DiscoveryMethodSchema>;

export const RouteKindSchema = z.enum([
  "provider_direct_x402",
  "sponge_wrapper_x402",
  "locus_wrapper_mpp",
  "tempo_mpp",
  "other",
]);
export type RouteKind = z.infer<typeof RouteKindSchema>;

export const ProbeReadinessSchema = z.enum(["ready", "needs_request_params", "unsupported_method"]);
export type ProbeReadiness = z.infer<typeof ProbeReadinessSchema>;

export const DryRunProbeStatusSchema = z.enum(["challenge", "no_challenge", "error", "skipped"]);
export type DryRunProbeStatus = z.infer<typeof DryRunProbeStatusSchema>;

export const NoChallengeReasonSchema = z.enum([
  "structural_failure",
  "auth_blocked",
  "access_blocked",
  "rate_limited",
  "server_error",
  "unexpected_status",
]);
export type NoChallengeReason = z.infer<typeof NoChallengeReasonSchema>;

export const X402PaymentOptionSchema = z
  .object({
    scheme: z.string().min(1).optional(),
    network: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
    asset: z.string().min(1),
    payTo: z.string().min(1),
    maxTimeoutSeconds: z.number().int().positive().optional(),
  })
  .strict();
export type X402PaymentOption = z.infer<typeof X402PaymentOptionSchema>;

export const LastDryRunSchema = z
  .object({
    status: DryRunProbeStatusSchema,
    attemptedAt: z.string().datetime(),
    url: z.string().min(1),
    httpStatus: z.number().int().positive().optional(),
    noChallengeReason: NoChallengeReasonSchema.optional(),
    responseBodySha256: z.string().min(1).optional(),
    paymentOptions: z.array(X402PaymentOptionSchema).optional(),
    requestBodyTemplateSource: z.enum(["x402_bazaar_challenge"]).optional(),
  })
  .strict();
export type LastDryRun = z.infer<typeof LastDryRunSchema>;

export const EndpointCaseSchema = z
  .object({
    caseId: z.string().min(1),
    entityId: z.string().min(1),
    providerName: z.string().min(1),
    serviceName: z.string().min(1),
    endpointUrl: z.string().min(1),
    resourceUrl: z.string().url().optional(),
    requestHost: z.string().min(1),
    method: z.enum(["GET", "POST", "DELETE", "PATCH", "PUT"]),
    requestParameters: z.unknown().optional(),
    requestBodySchema: z.unknown().optional(),
    requestBodyTemplate: z.unknown().optional(),
    requestBodyTemplateHash: z.string().min(1).optional(),
    sourceName: z.string().min(1),
    sourceUrl: z.string().min(1),
    sourceObservedDate: z.string().date(),
    sourceServiceId: z.string().min(1).optional(),
    sourceEndpointId: z.string().min(1).optional(),
    sourceEndpointUpdatedAt: z.string().datetime().optional(),
    sourceBaseUrl: z.string().url().optional(),
    sourcePath: z.string().min(1).optional(),
    sourceProtocol: z.string().min(1).optional(),
    sourceNetworks: z.array(z.string().min(1)).optional(),
    routeKind: RouteKindSchema,
    probeReadiness: ProbeReadinessSchema.default("ready"),
    probeBlockedReasons: z.array(z.string().min(1)).optional(),
    discoveryMethod: DiscoveryMethodSchema,
    expectedNetwork: z.string().min(1),
    expectedAsset: z.string().min(1),
    lastDryRun: LastDryRunSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.probeReadiness === "ready" && value.resourceUrl === undefined) {
      context.addIssue({
        code: "custom",
        path: ["resourceUrl"],
        message: "Ready endpoint cases must include resourceUrl",
      });
    }

    const urlForHostCheck = value.resourceUrl ?? value.sourceBaseUrl;
    const resourceHost = urlForHostCheck ? new URL(urlForHostCheck).host : null;
    if (resourceHost !== null && value.requestHost !== resourceHost) {
      context.addIssue({
        code: "custom",
        path: ["requestHost"],
        message: `requestHost must match route host: ${resourceHost}`,
      });
    }

    if (
      value.probeReadiness === "ready" &&
      value.method === "POST" &&
      value.requestBodyTemplate === undefined &&
      value.requestBodyTemplateHash === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["requestBodyTemplate"],
        message:
          "Ready POST endpoint cases must include requestBodyTemplate or requestBodyTemplateHash",
      });
    }

    if (value.discoveryMethod === "catalog" && value.sourceName === "sponge_catalog") {
      for (const key of [
        "sourceServiceId",
        "sourceEndpointId",
        "sourceEndpointUpdatedAt",
        "sourceBaseUrl",
        "sourcePath",
        "sourceProtocol",
        "sourceNetworks",
      ] as const) {
        if (value[key] === undefined) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: `Sponge Catalog endpoint cases must include ${key}`,
          });
        }
      }
    }
  });
export type EndpointCase = z.infer<typeof EndpointCaseSchema>;

export const EndpointManifestSchema = z
  .object({
    schemaVersion: z.literal(ENDPOINT_MANIFEST_SCHEMA_VERSION),
    cases: z.array(EndpointCaseSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, endpointCase] of value.cases.entries()) {
      if (seen.has(endpointCase.caseId)) {
        context.addIssue({
          code: "custom",
          path: ["cases", index, "caseId"],
          message: `Duplicate endpoint caseId: ${endpointCase.caseId}`,
        });
      }
      seen.add(endpointCase.caseId);
    }
  });
export type EndpointManifest = z.infer<typeof EndpointManifestSchema>;

export const validateEndpointManifest = (value: unknown): EndpointManifest =>
  EndpointManifestSchema.parse(value);

export const DryRunProbeResultSchema = z
  .object({
    caseId: z.string().min(1),
    providerName: z.string().min(1),
    serviceName: z.string().min(1),
    routeKind: RouteKindSchema,
    method: z.string().min(1),
    url: z.string().min(1),
    attemptedAt: z.string().datetime(),
    status: DryRunProbeStatusSchema,
    noChallengeReason: NoChallengeReasonSchema.optional(),
    httpStatus: z.number().int().positive().optional(),
    responseHeaders: z.record(z.string(), z.string()).optional(),
    responseBodySha256: z.string().min(1).optional(),
    parsedChallenge: z.unknown().optional(),
    error: z.string().min(1).optional(),
  })
  .strict();
export type DryRunProbeResult = z.infer<typeof DryRunProbeResultSchema>;

export const DryRunProbeResultsSchema = z
  .object({
    schemaVersion: z.literal(ENDPOINT_MANIFEST_SCHEMA_VERSION),
    sourceManifestPath: z.string().min(1),
    sourceManifestSha256: z.string().min(1),
    collectedAt: z.string().datetime(),
    mode: z.literal("dry_run_no_payment"),
    selection: z.object({
      includeNonX402: z.boolean(),
      limit: z.number().int().nonnegative().nullable(),
      candidateCount: z.number().int().nonnegative(),
      unsupportedMethodSkipped: z.number().int().nonnegative(),
      timeoutMs: z.number().int().positive(),
      concurrency: z.number().int().positive(),
    }),
    counts: z.record(z.string(), z.number().int().nonnegative()),
    results: z.array(DryRunProbeResultSchema),
  })
  .strict();
export type DryRunProbeResults = z.infer<typeof DryRunProbeResultsSchema>;

export const validateDryRunProbeResults = (value: unknown): DryRunProbeResults =>
  DryRunProbeResultsSchema.parse(value);

const AtomicAmountSchema = z.string().regex(/^\d+$/);
const NullableStringSchema = z.string().nullable();

export const PaidProbeStatusSchema = z.enum([
  "planned",
  "paid",
  "paid_with_tx",
  "error",
  "skipped",
]);
export type PaidProbeStatus = z.infer<typeof PaidProbeStatusSchema>;

export const PaidProbeResultSchema = z
  .object({
    caseId: z.string().min(1),
    providerName: z.string().min(1),
    serviceName: z.string().min(1),
    routeKind: RouteKindSchema.optional(),
    status: PaidProbeStatusSchema,
    skipReason: z.string().min(1).optional(),
    command: z.array(z.string()).optional(),
    executedAt: z.string().datetime().optional(),
    txHash: NullableStringSchema.optional(),
    network: z.string().min(1).optional(),
    payer: NullableStringSchema.optional(),
    payTo: z.string().min(1).optional(),
    asset: z.string().min(1).optional(),
    amountAtomic: AtomicAmountSchema,
    request: z
      .object({
        method: z.string().min(1),
        url: z.string().min(1),
        bodySha256: NullableStringSchema,
        bodySource: z.enum(["manifest_request_body_template", "empty_object_fallback"]).nullable(),
      })
      .strict()
      .optional(),
    challenge: z
      .object({
        network: z.string().min(1),
        asset: z.string().min(1),
        amountAtomic: AtomicAmountSchema,
        payTo: z.string().min(1),
      })
      .strict()
      .optional(),
    response: z
      .object({
        status: z.number().int().positive().optional(),
        bodySha256: NullableStringSchema,
        contentType: NullableStringSchema,
      })
      .strict()
      .optional(),
    payment: z.unknown().optional(),
    stdoutSha256: z.string().min(1).optional(),
    stderrSha256: NullableStringSchema.optional(),
    stdoutPreview: NullableStringSchema.optional(),
    stderrPreview: NullableStringSchema.optional(),
    exitCode: z.number().int().optional(),
    error: NullableStringSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "planned" && value.command === undefined) {
      context.addIssue({
        code: "custom",
        path: ["command"],
        message: "Planned paid probe results must include command",
      });
    }

    if (
      value.status !== "planned" &&
      value.status !== "skipped" &&
      value.executedAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["executedAt"],
        message: "Executed paid probe results must include executedAt",
      });
    }

    if (value.status === "paid_with_tx" && !value.txHash) {
      context.addIssue({
        code: "custom",
        path: ["txHash"],
        message: "paid_with_tx results must include txHash",
      });
    }
  });
export type PaidProbeResult = z.infer<typeof PaidProbeResultSchema>;

export const PaidProbeResultsSchema = z
  .object({
    schemaVersion: z.literal(ENDPOINT_MANIFEST_SCHEMA_VERSION),
    sourceManifestPath: z.string().min(1),
    sourceManifestSha256: z.string().min(1),
    collectedAt: z.string().datetime(),
    mode: z.enum(["paid_probe", "paid_probe_plan"]),
    selection: z
      .object({
        execute: z.boolean(),
        candidateCount: z.number().int().nonnegative(),
        limit: z.number().int().nonnegative().nullable(),
        minSpendAtomic: AtomicAmountSchema,
        maxSpendAtomic: AtomicAmountSchema,
        totalSpendCapAtomic: AtomicAmountSchema,
        network: z.string().min(1),
        includePost: z.boolean(),
        includeNotReady: z.boolean(),
        caseIds: z.array(z.string().min(1)).nullable().optional(),
        retryErrorsFrom: z.string().min(1).nullable().optional(),
      })
      .strict(),
    spend: z
      .object({
        paidAtomic: AtomicAmountSchema,
        currency: z.string().min(1),
      })
      .strict(),
    results: z.array(PaidProbeResultSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, result] of value.results.entries()) {
      if (seen.has(result.caseId)) {
        context.addIssue({
          code: "custom",
          path: ["results", index, "caseId"],
          message: `Duplicate paid probe result caseId: ${result.caseId}`,
        });
      }
      seen.add(result.caseId);
    }

    if (value.mode === "paid_probe_plan" && value.selection.execute) {
      context.addIssue({
        code: "custom",
        path: ["selection", "execute"],
        message: "paid_probe_plan artifacts must have selection.execute=false",
      });
    }

    if (value.mode === "paid_probe" && !value.selection.execute) {
      context.addIssue({
        code: "custom",
        path: ["selection", "execute"],
        message: "paid_probe artifacts must have selection.execute=true",
      });
    }
  });
export type PaidProbeResults = z.infer<typeof PaidProbeResultsSchema>;

export const validatePaidProbeResults = (value: unknown): PaidProbeResults =>
  PaidProbeResultsSchema.parse(value);

export const defaultEndpointManifestPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

export const loadEndpointManifestFromFile = (filePath = defaultEndpointManifestPath()) =>
  validateEndpointManifest(JSON.parse(fs.readFileSync(filePath, "utf8")));

export const defaultDryRunProbeResultsPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "dry_run_probe_results.json");

export const loadDryRunProbeResultsFromFile = (filePath = defaultDryRunProbeResultsPath()) =>
  validateDryRunProbeResults(JSON.parse(fs.readFileSync(filePath, "utf8")));

export const defaultPaidProbeResultsPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "paid_probe_results.json");

export const loadPaidProbeResultsFromFile = (filePath = defaultPaidProbeResultsPath()) =>
  validatePaidProbeResults(JSON.parse(fs.readFileSync(filePath, "utf8")));
