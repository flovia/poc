import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadEndpointManifestFromFile, type EndpointCase } from "../lib/endpoint-manifest";

const DEFAULT_CONCURRENCY = 6;
const DEFAULT_TIMEOUT_MS = 20_000;

type ProbeResult = {
  caseId: string;
  providerName: string;
  serviceName: string;
  routeKind: string;
  method: string;
  url: string;
  attemptedAt: string;
  status: "challenge" | "no_challenge" | "error" | "skipped";
  noChallengeReason?:
    | "structural_failure"
    | "auth_blocked"
    | "access_blocked"
    | "rate_limited"
    | "server_error"
    | "unexpected_status";
  httpStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBodySha256?: string;
  parsedChallenge?: unknown;
  error?: string;
};

type CliOptions = {
  outputPath: string;
  limit: number | null;
  concurrency: number;
  timeoutMs: number;
  includeNonX402: boolean;
};

const defaultOutputPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "dry_run_probe_results.json");

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    outputPath: process.env.X402_DRY_RUN_PROBE_RESULTS_PATH ?? defaultOutputPath(),
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    includeNonX402: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") options.outputPath = String(argv[++index] ?? options.outputPath);
    else if (arg === "--limit") options.limit = Number(argv[++index] ?? "0");
    else if (arg === "--concurrency") options.concurrency = Number(argv[++index] ?? DEFAULT_CONCURRENCY);
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index] ?? DEFAULT_TIMEOUT_MS);
    else if (arg === "--include-non-x402") options.includeNonX402 = true;
  }

  return options;
};

const requestUrl = (endpointCase: EndpointCase): string =>
  endpointCase.resourceUrl ?? endpointCase.endpointUrl;

const requestBody = (endpointCase: EndpointCase): string | undefined => {
  if (endpointCase.method !== "POST" && endpointCase.method !== "PATCH" && endpointCase.method !== "PUT") {
    return undefined;
  }

  return JSON.stringify(endpointCase.requestBodyTemplate ?? {});
};

const challengeStatus = (httpStatus: number, parsedBody: unknown): ProbeResult["status"] => {
  if (httpStatus !== 402) return "no_challenge";
  if (typeof parsedBody === "object" && parsedBody !== null) return "challenge";
  return "challenge";
};

const noChallengeReason = (httpStatus: number): ProbeResult["noChallengeReason"] => {
  if (httpStatus === 400 || httpStatus === 404 || httpStatus === 405 || httpStatus === 422) {
    return "structural_failure";
  }
  if (httpStatus === 401) return "auth_blocked";
  if (httpStatus === 403) return "access_blocked";
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus >= 500) return "server_error";
  return "unexpected_status";
};

const parseBody = (bodyText: string): unknown => {
  if (bodyText.length < 1) return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText.slice(0, 2_000);
  }
};

const probeCase = async (endpointCase: EndpointCase, timeoutMs: number): Promise<ProbeResult> => {
  const url = requestUrl(endpointCase);
  const attemptedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = requestBody(endpointCase);
    const response = await fetch(url, {
      method: endpointCase.method,
      headers: {
        accept: "application/json, text/plain, */*",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        "user-agent": "flovia-poc-x402-dry-run-probe/1.0",
      },
      body,
      signal: controller.signal,
    });
    const bodyText = await response.text();
    const parsedBody = parseBody(bodyText);
    const status = challengeStatus(response.status, parsedBody);

    return {
      caseId: endpointCase.caseId,
      providerName: endpointCase.providerName,
      serviceName: endpointCase.serviceName,
      routeKind: endpointCase.routeKind,
      method: endpointCase.method,
      url,
      attemptedAt,
      status,
      ...(status === "no_challenge" ? { noChallengeReason: noChallengeReason(response.status) } : {}),
      httpStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBodySha256: sha256(bodyText),
      parsedChallenge: response.status === 402 ? parsedBody : undefined,
    };
  } catch (error) {
    return {
      caseId: endpointCase.caseId,
      providerName: endpointCase.providerName,
      serviceName: endpointCase.serviceName,
      routeKind: endpointCase.routeKind,
      method: endpointCase.method,
      url,
      attemptedAt,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const runBatches = async (cases: EndpointCase[], options: CliOptions): Promise<ProbeResult[]> => {
  const results: ProbeResult[] = [];
  for (let index = 0; index < cases.length; index += options.concurrency) {
    const batch = cases.slice(index, index + options.concurrency);
    results.push(...(await Promise.all(batch.map((entry) => probeCase(entry, options.timeoutMs)))));
  }
  return results;
};

const candidateCases = (cases: EndpointCase[], options: CliOptions): EndpointCase[] => {
  const selected = cases.filter(
    (entry) =>
      (options.includeNonX402 || entry.sourceProtocol === "x402") &&
      (entry.method === "GET" || entry.method === "POST"),
  );
  return options.limit === null ? selected : selected.slice(0, options.limit);
};

const skippedUnsupportedMethodCount = (cases: EndpointCase[], options: CliOptions): number =>
  cases.filter(
    (entry) =>
      (options.includeNonX402 || entry.sourceProtocol === "x402") &&
      entry.method !== "GET" &&
      entry.method !== "POST",
  ).length;

export const runX402DryRunProbes = async (options = parseArgs(Bun.argv.slice(2))) => {
  const manifestPath = path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = loadEndpointManifestFromFile(manifestPath);
  const cases = candidateCases(manifest.cases, options);
  const unsupportedMethodSkipped = skippedUnsupportedMethodCount(manifest.cases, options);
  const results = await runBatches(cases, options);
  const counts = results.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const artifact = {
    schemaVersion: "1",
    sourceManifestPath: manifestPath,
    sourceManifestSha256: sha256(manifestText),
    collectedAt: new Date().toISOString(),
    mode: "dry_run_no_payment",
    selection: {
      includeNonX402: options.includeNonX402,
      limit: options.limit,
      candidateCount: cases.length,
      unsupportedMethodSkipped,
      timeoutMs: options.timeoutMs,
      concurrency: options.concurrency,
    },
    counts,
    results,
  };

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

  return {
    status: "ok",
    outputPath: options.outputPath,
    candidateCount: cases.length,
    unsupportedMethodSkipped,
    counts,
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(await runX402DryRunProbes(), null, 2));
}
