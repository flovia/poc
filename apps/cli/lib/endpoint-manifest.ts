import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const ENDPOINT_MANIFEST_SCHEMA_VERSION = "1";

export const DiscoveryMethodSchema = z.enum(["catalog", "docs", "llm_candidate", "manual"]);
export type DiscoveryMethod = z.infer<typeof DiscoveryMethodSchema>;

export const EndpointCaseSchema = z
  .object({
    caseId: z.string().min(1),
    entityId: z.string().min(1),
    providerName: z.string().min(1),
    serviceName: z.string().min(1),
    endpointUrl: z.string().url(),
    resourceUrl: z.string().url(),
    requestHost: z.string().min(1),
    method: z.enum(["GET", "POST"]),
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
    discoveryMethod: DiscoveryMethodSchema,
    expectedNetwork: z.string().min(1),
    expectedAsset: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const resourceHost = new URL(value.resourceUrl).host;
    if (value.requestHost !== resourceHost) {
      context.addIssue({
        code: "custom",
        path: ["requestHost"],
        message: `requestHost must match resourceUrl host: ${resourceHost}`,
      });
    }

    if (
      value.method === "POST" &&
      value.requestBodyTemplate === undefined &&
      value.requestBodyTemplateHash === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["requestBodyTemplate"],
        message: "POST endpoint cases must include requestBodyTemplate or requestBodyTemplateHash",
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
