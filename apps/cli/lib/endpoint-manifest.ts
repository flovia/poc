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

export const ProbeReadinessSchema = z.enum([
  "ready",
  "needs_request_params",
  "unsupported_method",
]);
export type ProbeReadiness = z.infer<typeof ProbeReadinessSchema>;

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
    requestBodyTemplate: z.record(z.string(), z.unknown()).optional(),
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
        message: "Ready POST endpoint cases must include requestBodyTemplate or requestBodyTemplateHash",
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

export const defaultEndpointManifestPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

export const loadEndpointManifestFromFile = (filePath = defaultEndpointManifestPath()) =>
  validateEndpointManifest(JSON.parse(fs.readFileSync(filePath, "utf8")));
