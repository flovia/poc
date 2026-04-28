import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  loadEndpointManifestFromFile,
  type EndpointCase,
  type LastDryRun,
  type X402PaymentOption,
} from "../../lib/endpoint-manifest";

const DEFAULT_MAX_SPEND_ATOMIC = 50_000n;
const DEFAULT_TOTAL_SPEND_CAP_ATOMIC = 100_000n;
const DEFAULT_MIN_SPEND_ATOMIC = 0n;

type SelectedPaymentOption = X402PaymentOption & {
  index: number;
};

type CliOptions = {
  execute: boolean;
  outputPath: string;
  caseIds: Set<string> | null;
  retryErrorsFrom: string | null;
  limit: number | null;
  minSpendAtomic: bigint;
  maxSpendAtomic: bigint;
  totalSpendCapAtomic: bigint;
  network: string;
  mode: string;
  includePost: boolean;
  includeNotReady: boolean;
};

type PaidProbeCandidate = {
  endpointCase: EndpointCase;
  dryRun: LastDryRun;
  option: SelectedPaymentOption;
  amount: bigint;
};

const defaultOutputPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "paid_probe_results.json");

const manifestPath = () => path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    execute: false,
    outputPath: process.env.X402_PAID_PROBE_RESULTS_PATH ?? defaultOutputPath(),
    caseIds: null,
    retryErrorsFrom: null,
    limit: null,
    minSpendAtomic: DEFAULT_MIN_SPEND_ATOMIC,
    maxSpendAtomic: DEFAULT_MAX_SPEND_ATOMIC,
    totalSpendCapAtomic: DEFAULT_TOTAL_SPEND_CAP_ATOMIC,
    network: "base",
    mode: "mainnet",
    includePost: false,
    includeNotReady: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--output") options.outputPath = String(argv[++index] ?? options.outputPath);
    else if (arg === "--case-id") {
      const caseIds = options.caseIds ?? new Set<string>();
      caseIds.add(String(argv[++index] ?? ""));
      options.caseIds = caseIds;
    } else if (arg === "--retry-errors-from") {
      options.retryErrorsFrom = String(argv[++index] ?? "");
    }
    else if (arg === "--limit") options.limit = Number(argv[++index] ?? "0");
    else if (arg === "--include-post") options.includePost = true;
    else if (arg === "--include-not-ready") options.includeNotReady = true;
    else if (arg === "--min-spend-atomic") options.minSpendAtomic = BigInt(argv[++index] ?? "0");
    else if (arg === "--max-spend-atomic") options.maxSpendAtomic = BigInt(argv[++index] ?? "0");
    else if (arg === "--total-spend-cap-atomic") {
      options.totalSpendCapAtomic = BigInt(argv[++index] ?? "0");
    } else if (arg === "--network") options.network = String(argv[++index] ?? options.network);
    else if (arg === "--mode") options.mode = String(argv[++index] ?? options.mode);
  }

  return options;
};

const normalizeNetwork = (network: string | undefined): string => {
  if (network === "base" || network === "eip155:8453") return "base";
  return String(network ?? "");
};

const selectedOption = (dryRun: LastDryRun, network: string): SelectedPaymentOption | null =>
  dryRun.paymentOptions
    ?.map((option, index) => ({ index, ...option }))
    .find((option) => normalizeNetwork(option.network) === network) ?? null;

const requestBody = (endpointCase: EndpointCase): string | null => {
  if (endpointCase.method !== "POST" && endpointCase.method !== "PUT" && endpointCase.method !== "PATCH") {
    return null;
  }
  return JSON.stringify(endpointCase.requestBodyTemplate ?? {});
};

const targetUrl = (endpointCase: EndpointCase, dryRun: LastDryRun): string =>
  endpointCase.resourceUrl ?? dryRun.url;

const x402Command = (
  endpointCase: EndpointCase,
  dryRun: LastDryRun,
  option: SelectedPaymentOption,
  options: CliOptions,
): string[] => {
  const command = endpointCase.method.toLowerCase();
  const args = [
    command,
    "--json",
    "--verbose-json",
    "--mode",
    options.mode,
    "--network",
    options.network,
    "--spend-limit",
    option.amount,
    targetUrl(endpointCase, dryRun),
  ];
  const body = requestBody(endpointCase);
  if (body !== null) args.push(body);
  return args;
};

const parseJson = (value: string): unknown => {
  if (value.length < 1) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const runX402 = (args: string[]) => {
  const child = spawnSync("x402", args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = child.stdout ?? "";
  const stderr = child.stderr ?? "";
  return {
    exitCode: child.status ?? 1,
    stdout,
    stderr,
    stdoutSha256: sha256(stdout),
    stderrSha256: stderr.length > 0 ? sha256(stderr) : null,
    parsed: parseJson(stdout),
  };
};

const hasUnresolvedParams = (url: string): boolean => /\{[^}]+\}|:[A-Za-z_][A-Za-z0-9_]*/.test(url);

const retryCaseIds = (filePath: string | null): Set<string> | null => {
  if (filePath === null) return null;
  const artifact = JSON.parse(fs.readFileSync(filePath, "utf8")) as { results?: Array<Record<string, unknown>> };
  return new Set(
    (artifact.results ?? [])
      .filter((result) => result.status === "error")
      .map((result) => String(result.caseId ?? ""))
      .filter((caseId) => caseId.length > 0),
  );
};

const selectedCaseIds = (options: CliOptions): Set<string> | null => {
  const retryIds = retryCaseIds(options.retryErrorsFrom);
  if (retryIds === null) return options.caseIds;
  if (options.caseIds === null) return retryIds;
  return new Set([...retryIds].filter((caseId) => options.caseIds?.has(caseId)));
};

const buildCandidates = (manifestCases: EndpointCase[], options: CliOptions): PaidProbeCandidate[] => {
  const caseIds = selectedCaseIds(options);
  const selected = manifestCases.flatMap((endpointCase) => {
    if (caseIds !== null && !caseIds.has(endpointCase.caseId)) return [];
    const dryRun = endpointCase.lastDryRun;
    if (!dryRun || dryRun.status !== "challenge" || dryRun.httpStatus !== 402) return [];
    if (endpointCase.sourceProtocol !== "x402") return [];
    if (!options.includeNotReady && endpointCase.probeReadiness !== "ready") return [];
    if (endpointCase.method !== "GET" && !(options.includePost && endpointCase.method === "POST")) {
      return [];
    }
    if (hasUnresolvedParams(targetUrl(endpointCase, dryRun))) return [];

    const option = selectedOption(dryRun, options.network);
    if (!option) return [];
    const amount = BigInt(option.amount);
    if (amount < options.minSpendAtomic) return [];
    if (amount > options.maxSpendAtomic) return [];
    return [{ endpointCase, dryRun, option, amount }];
  });

  return options.limit === null ? selected : selected.slice(0, options.limit);
};

const recordFrom = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const preview = (value: string): string | null => (value.length > 0 ? value.slice(0, 4_000) : null);

export const runX402PaidProbes = (options = parseArgs(Bun.argv.slice(2))) => {
  const manifestFile = manifestPath();
  const manifestText = fs.readFileSync(manifestFile, "utf8");
  const manifest = loadEndpointManifestFromFile(manifestFile);
  const candidates = buildCandidates(manifest.cases, options);
  let spent = 0n;
  const results = [];

  for (const candidate of candidates) {
    if (spent + candidate.amount > options.totalSpendCapAtomic) {
      results.push({
        caseId: candidate.endpointCase.caseId,
        providerName: candidate.endpointCase.providerName,
        serviceName: candidate.endpointCase.serviceName,
        status: "skipped",
        skipReason: "total_spend_cap_exceeded",
        amountAtomic: candidate.option.amount,
      });
      continue;
    }

    const args = x402Command(candidate.endpointCase, candidate.dryRun, candidate.option, options);
    const body = requestBody(candidate.endpointCase);
    if (!options.execute) {
      results.push({
        caseId: candidate.endpointCase.caseId,
        providerName: candidate.endpointCase.providerName,
        serviceName: candidate.endpointCase.serviceName,
        status: "planned",
        command: ["x402", ...args],
        amountAtomic: candidate.option.amount,
        payTo: candidate.option.payTo,
      });
      continue;
    }

    const executedAt = new Date().toISOString();
    const execution = runX402(args);
    if (execution.exitCode === 0) spent += candidate.amount;
    const parsed = recordFrom(execution.parsed);
    const payment = recordFrom(parsed?.payment);
    const settlement = recordFrom(payment?.settlement);
    const response = recordFrom(parsed?.response);
    const txHash = typeof settlement?.transaction === "string" ? settlement.transaction : null;
    results.push({
      caseId: candidate.endpointCase.caseId,
      providerName: candidate.endpointCase.providerName,
      serviceName: candidate.endpointCase.serviceName,
      routeKind: candidate.endpointCase.routeKind,
      status: execution.exitCode === 0 ? (txHash ? "paid_with_tx" : "paid") : "error",
      executedAt,
      txHash,
      network: candidate.option.network,
      payer: typeof settlement?.payer === "string" ? settlement.payer : null,
      payTo: candidate.option.payTo,
      asset: candidate.option.asset,
      amountAtomic: candidate.option.amount,
      request: {
        method: candidate.endpointCase.method,
        url: targetUrl(candidate.endpointCase, candidate.dryRun),
        bodySha256: body === null ? null : sha256(body),
        bodySource:
          candidate.endpointCase.method === "GET"
            ? null
            : candidate.endpointCase.requestBodyTemplate === undefined
              ? "empty_object_fallback"
              : "manifest_request_body_template",
      },
      challenge: {
        network: candidate.option.network,
        asset: candidate.option.asset,
        amountAtomic: candidate.option.amount,
        payTo: candidate.option.payTo,
      },
      response: {
        status: response?.status,
        bodySha256: typeof response?.bodyText === "string" ? sha256(response.bodyText) : null,
        contentType: (response?.headers as Record<string, string> | undefined)?.["content-type"] ?? null,
      },
      payment: {
        status: payment?.status,
        selectedOption: payment?.selectedOption,
        settlement,
      },
      stdoutSha256: execution.stdoutSha256,
      stderrSha256: execution.stderrSha256,
      stdoutPreview: execution.exitCode === 0 ? null : preview(execution.stdout),
      stderrPreview: execution.exitCode === 0 ? null : preview(execution.stderr),
      exitCode: execution.exitCode,
      error: execution.exitCode === 0 ? null : execution.stderr,
    });
  }

  const artifact = {
    schemaVersion: "1",
    sourceManifestPath: manifestFile,
    sourceManifestSha256: sha256(manifestText),
    collectedAt: new Date().toISOString(),
    mode: options.execute ? "paid_probe" : "paid_probe_plan",
    selection: {
      execute: options.execute,
      candidateCount: candidates.length,
      limit: options.limit,
      minSpendAtomic: String(options.minSpendAtomic),
      maxSpendAtomic: String(options.maxSpendAtomic),
      totalSpendCapAtomic: String(options.totalSpendCapAtomic),
      network: options.network,
      includePost: options.includePost,
      includeNotReady: options.includeNotReady,
      caseIds: options.caseIds === null ? null : [...options.caseIds],
      retryErrorsFrom: options.retryErrorsFrom,
    },
    spend: {
      paidAtomic: String(spent),
      currency: "USDC",
    },
    results,
  };

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return {
    status: "ok",
    outputPath: options.outputPath,
    mode: artifact.mode,
    candidateCount: candidates.length,
    paidAtomic: String(spent),
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(runX402PaidProbes(), null, 2));
}
