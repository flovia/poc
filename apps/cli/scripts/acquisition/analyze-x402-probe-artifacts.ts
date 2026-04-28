import fs from "node:fs";
import path from "node:path";
import {
  loadDryRunProbeResultsFromFile,
  loadEndpointManifestFromFile,
  loadPaidProbeResultsFromFile,
  type DryRunProbeResults,
  type EndpointManifest,
  type PaidProbeResult,
  type PaidProbeResults,
} from "../../lib/endpoint-manifest";

type CliOptions = {
  manifestPath: string;
  dryRunPath: string | null;
  paidPaths: string[];
  outputPath: string | null;
};

type CountMap = Record<string, number>;

type FailureClassification =
  | "http_401_auth_or_business_rejected"
  | "http_4xx_business_request_rejected"
  | "http_5xx_provider_failure"
  | "x402_client_or_parse_error"
  | "no_error_remaining"
  | "unknown_error";

const acquisitionPath = (...segments: string[]) =>
  path.join(process.cwd(), "fixtures", "acquisition", ...segments);

const defaultPaidPaths = () =>
  [
    "paid_probe_results.json",
    "paid_probe_retry_results.json",
    "paid_probe_retry2_results.json",
    "paid_probe_retry3_results.json",
  ]
    .map((fileName) => acquisitionPath(fileName))
    .filter((filePath) => fs.existsSync(filePath));

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    manifestPath: acquisitionPath("endpoint_manifest.json"),
    dryRunPath: acquisitionPath("dry_run_probe_results.json"),
    paidPaths: [],
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") options.manifestPath = String(argv[++index] ?? options.manifestPath);
    else if (arg === "--dry-run") options.dryRunPath = String(argv[++index] ?? "");
    else if (arg === "--no-dry-run") options.dryRunPath = null;
    else if (arg === "--paid") options.paidPaths.push(String(argv[++index] ?? ""));
    else if (arg === "--output") options.outputPath = String(argv[++index] ?? "");
  }

  return {
    ...options,
    paidPaths: options.paidPaths.length > 0 ? options.paidPaths : defaultPaidPaths(),
  };
};

const increment = (counts: CountMap, key: string, by = 1) => {
  counts[key] = (counts[key] ?? 0) + by;
};

const sumAtomic = (current: string, next: string): string => String(BigInt(current) + BigInt(next));

const latestByCase = (artifacts: PaidProbeResults[]): Map<string, PaidProbeResult> => {
  const latest = new Map<string, PaidProbeResult>();
  for (const artifact of artifacts) {
    for (const result of artifact.results) latest.set(result.caseId, result);
  }
  return latest;
};

const httpStatusFromPreview = (result: PaidProbeResult): number | null => {
  if (typeof result.response?.status === "number") return result.response.status;
  const preview = result.stdoutPreview ?? result.stderrPreview ?? result.error ?? "";
  const match = preview.match(/HTTP\s+(\d{3})|"status"\s*:\s*(\d{3})/i);
  const status = match?.[1] ?? match?.[2];
  return status ? Number(status) : null;
};

const classifyFailure = (result: PaidProbeResult): FailureClassification => {
  if (result.status !== "error") return "no_error_remaining";
  const httpStatus = httpStatusFromPreview(result);
  if (httpStatus === 401 || httpStatus === 403) return "http_401_auth_or_business_rejected";
  if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500)
    return "http_4xx_business_request_rejected";
  if (httpStatus !== null && httpStatus >= 500) return "http_5xx_provider_failure";
  if ((result.stdoutPreview ?? result.stderrPreview ?? result.error ?? "").length > 0) {
    return "x402_client_or_parse_error";
  }
  return "unknown_error";
};

export const analyzeX402ProbeArtifacts = (
  manifest: EndpointManifest,
  dryRun: DryRunProbeResults | null,
  paidArtifacts: PaidProbeResults[],
) => {
  const caseIndex = new Map(
    manifest.cases.map((endpointCase) => [endpointCase.caseId, endpointCase]),
  );
  const paidResults = paidArtifacts.flatMap((artifact) => artifact.results);
  const latestResults = latestByCase(paidArtifacts);
  const latestFailures = [...latestResults.values()].filter((result) => result.status === "error");

  const provider: Record<
    string,
    { total: number; status: CountMap; spendAtomic: string; txHash: CountMap }
  > = {};
  const endpoint: Record<
    string,
    { providerName: string; serviceName: string; status: CountMap; attempts: number }
  > = {};
  const status: CountMap = {};
  const httpStatus: CountMap = {};
  const txHash: CountMap = { present: 0, missing: 0 };
  const bodySource: CountMap = {};
  const failureClassifications: CountMap = {};

  for (const result of paidResults) {
    increment(status, result.status);
    increment(txHash, result.txHash ? "present" : "missing");
    increment(bodySource, result.request?.bodySource ?? "none");
    const responseStatus = httpStatusFromPreview(result);
    increment(httpStatus, responseStatus === null ? "unknown" : String(responseStatus));

    const providerName = result.providerName;
    provider[providerName] ??= {
      total: 0,
      status: {},
      spendAtomic: "0",
      txHash: { present: 0, missing: 0 },
    };
    provider[providerName].total += 1;
    increment(provider[providerName].status, result.status);
    increment(provider[providerName].txHash, result.txHash ? "present" : "missing");
    if (result.status === "paid" || result.status === "paid_with_tx") {
      provider[providerName].spendAtomic = sumAtomic(
        provider[providerName].spendAtomic,
        result.amountAtomic,
      );
    }

    endpoint[result.caseId] ??= {
      providerName,
      serviceName: result.serviceName,
      status: {},
      attempts: 0,
    };
    endpoint[result.caseId].attempts += 1;
    increment(endpoint[result.caseId].status, result.status);
  }

  for (const failure of latestFailures) increment(failureClassifications, classifyFailure(failure));

  return {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    inputs: {
      manifestCases: manifest.cases.length,
      dryRunResults: dryRun?.results.length ?? 0,
      paidArtifacts: paidArtifacts.map((artifact) => ({
        mode: artifact.mode,
        collectedAt: artifact.collectedAt,
        sourceManifestSha256: artifact.sourceManifestSha256,
        results: artifact.results.length,
      })),
    },
    totals: {
      paidAttempts: paidResults.length,
      uniquePaidCases: latestResults.size,
      dryRunChallenges:
        dryRun?.results.filter((result) => result.status === "challenge").length ?? 0,
      remainingFailures: latestFailures.length,
      manifestJoinMissing: [...latestResults.keys()].filter((caseId) => !caseIndex.has(caseId))
        .length,
      spendAtomic: paidArtifacts.reduce(
        (sum, artifact) => sumAtomic(sum, artifact.spend.paidAtomic),
        "0",
      ),
    },
    byProvider: provider,
    byEndpoint: endpoint,
    byStatus: status,
    byHttpStatus: httpStatus,
    byTxHash: txHash,
    byBodySource: bodySource,
    remainingFailures: {
      byClassification: failureClassifications,
      cases: latestFailures.map((result) => ({
        caseId: result.caseId,
        providerName: result.providerName,
        serviceName: result.serviceName,
        classification: classifyFailure(result),
        httpStatus: httpStatusFromPreview(result),
        bodySource: result.request?.bodySource ?? null,
        amountAtomic: result.amountAtomic,
      })),
    },
  };
};

export const runAnalyzeX402ProbeArtifacts = (options = parseArgs(Bun.argv.slice(2))) => {
  const manifest = loadEndpointManifestFromFile(options.manifestPath);
  const dryRun =
    options.dryRunPath === null ? null : loadDryRunProbeResultsFromFile(options.dryRunPath);
  const paidArtifacts = options.paidPaths.map((filePath) => loadPaidProbeResultsFromFile(filePath));
  const report = analyzeX402ProbeArtifacts(manifest, dryRun, paidArtifacts);
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, text);
  }
  return report;
};

if (import.meta.main) {
  console.log(JSON.stringify(runAnalyzeX402ProbeArtifacts(), null, 2));
}
