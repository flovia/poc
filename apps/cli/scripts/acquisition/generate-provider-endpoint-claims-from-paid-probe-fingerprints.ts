import fs from "node:fs";
import path from "node:path";
import { BASE_CHAIN_ID } from "../../lib/constants";
import { type EndpointCase, loadEndpointManifestFromFile } from "../../lib/endpoint-manifest";
import {
  type ProviderEndpointClaimsSeed,
  validateProviderEndpointClaimsSeed,
} from "../../lib/schema";

type CliOptions = {
  fingerprintPath: string;
  manifestPath: string;
  outputPath: string;
};

type FingerprintObservation = {
  txHash: string;
  recipient: string;
  amountAtomic: string;
  tokenAddress: string;
  method: string;
  topLevelSelector: string;
  topLevelTo?: string | null;
  innerSelector?: string | null;
};

type FingerprintResult = {
  caseId: string;
  providerName: string;
  serviceName: string;
  routeKind?: string | null;
  sourcePath: string;
  txHash: string | null;
  status: string;
  observations?: FingerprintObservation[];
};

type FingerprintArtifact = {
  generatedAt?: string;
  results?: FingerprintResult[];
};

const acquisitionPath = (...segments: string[]) =>
  path.join(process.cwd(), "fixtures", "acquisition", ...segments);

const acquisitionDerivedPath = (...segments: string[]) => acquisitionPath("derived", ...segments);

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    fingerprintPath: acquisitionDerivedPath("paid_probe_fingerprints.json"),
    manifestPath: acquisitionPath("endpoint_manifest.json"),
    outputPath: acquisitionDerivedPath("provider_endpoint_claims.generated.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fingerprints") options.fingerprintPath = String(argv[++index] ?? "");
    else if (arg === "--manifest") options.manifestPath = String(argv[++index] ?? "");
    else if (arg === "--output") options.outputPath = String(argv[++index] ?? "");
  }

  return options;
};

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const relativePath = (filePath: string) => path.relative(process.cwd(), filePath) || ".";

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const networkName = (value: string | undefined) => {
  if (value === "eip155:8453") return "base";
  return value ?? "base";
};

const claimRoles = (
  routeKind: string | null | undefined,
): ProviderEndpointClaimsSeed["claims"][number]["roles"] => {
  if (routeKind === "sponge_wrapper_x402") {
    return ["provider", "service", "endpoint", "middleman", "market", "facilitator"];
  }
  return ["provider", "service", "endpoint"];
};

const confidenceForRoute = (routeKind: string | null | undefined) =>
  routeKind === "provider_direct_x402" ? 85 : 70;

export const buildProviderEndpointClaimsFromPaidProbeFingerprints = ({
  fingerprintPath,
  manifestPath,
}: Pick<CliOptions, "fingerprintPath" | "manifestPath">): ProviderEndpointClaimsSeed => {
  const fingerprints = readJson<FingerprintArtifact>(fingerprintPath);
  const manifest = loadEndpointManifestFromFile(manifestPath);
  const endpointByCaseId = new Map<string, EndpointCase>(
    manifest.cases.map((endpointCase) => [endpointCase.caseId, endpointCase]),
  );
  const claims: ProviderEndpointClaimsSeed["claims"] = [];

  for (const result of fingerprints.results ?? []) {
    if (result.status !== "fingerprinted") continue;
    const endpointCase = endpointByCaseId.get(result.caseId);
    if (!endpointCase) continue;

    for (const observation of result.observations ?? []) {
      claims.push({
        claimId: `paid-probe-${slug(result.caseId)}-${observation.txHash.slice(2, 10)}`,
        entityId: endpointCase.entityId,
        providerName: endpointCase.providerName,
        serviceName: endpointCase.serviceName,
        endpointUrl: endpointCase.endpointUrl,
        resourceUrl: endpointCase.resourceUrl ?? null,
        requestHost: endpointCase.requestHost,
        payTo: observation.recipient as ProviderEndpointClaimsSeed["claims"][number]["payTo"],
        network: networkName(endpointCase.expectedNetwork),
        asset: observation.tokenAddress as ProviderEndpointClaimsSeed["claims"][number]["asset"],
        amountAtomic: observation.amountAtomic,
        txHash: observation.txHash as ProviderEndpointClaimsSeed["claims"][number]["txHash"],
        evidenceClass: "paid_probe",
        roles: claimRoles(result.routeKind ?? endpointCase.routeKind),
        confidence: confidenceForRoute(result.routeKind ?? endpointCase.routeKind),
        sourceName: "paid-probe-fingerprint-enrichment",
        evidenceRefs: [
          `${relativePath(fingerprintPath)}:${result.caseId}`,
          `${result.sourcePath}:${result.caseId}`,
          `tx:${observation.txHash}`,
          `settlement:${observation.method}:${observation.topLevelSelector}`,
        ],
        provenance: [
          {
            source: "paid-probe-fingerprint-enrichment",
            sourceId: result.caseId,
            docPath: relativePath(fingerprintPath),
            caseId: result.caseId,
            transaction: observation.txHash,
            requestUrl: endpointCase.resourceUrl ?? endpointCase.endpointUrl,
            collectedAt: fingerprints.generatedAt ?? null,
          },
        ],
      });
    }
  }

  return validateProviderEndpointClaimsSeed({
    schemaVersion: "1",
    chainId: BASE_CHAIN_ID,
    collectedAt: fingerprints.generatedAt ?? new Date().toISOString(),
    claims,
  });
};

export const runGenerateProviderEndpointClaimsFromPaidProbeFingerprints = (
  options = parseArgs(Bun.argv.slice(2)),
) => {
  const seed = buildProviderEndpointClaimsFromPaidProbeFingerprints(options);
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(seed, null, 2)}\n`);
  return { outputPath: options.outputPath, claimCount: seed.claims.length };
};

if (import.meta.main) {
  console.log(
    JSON.stringify(runGenerateProviderEndpointClaimsFromPaidProbeFingerprints(), null, 2),
  );
}
