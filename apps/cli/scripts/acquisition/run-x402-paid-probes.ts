import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEndpointManifestFromFile, type EndpointCase } from "../../lib/endpoint-manifest";

const DEFAULT_MAX_SPEND_ATOMIC = 50_000n;
const DEFAULT_TOTAL_SPEND_CAP_ATOMIC = 100_000n;
const DEFAULT_MIN_SPEND_ATOMIC = 1n;

type DryRunArtifact = {
  results: DryRunResult[];
};

type DryRunResult = {
  caseId: string;
  method: string;
  url: string;
  status: string;
  parsedChallenge?: unknown;
};

type PaymentOption = {
  index: number;
  scheme?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payTo?: string;
};

type CliOptions = {
  execute: boolean;
  outputPath: string;
  limit: number | null;
  minSpendAtomic: bigint;
  maxSpendAtomic: bigint;
  totalSpendCapAtomic: bigint;
  network: string;
  mode: string;
  includePost: boolean;
  includeNotReady: boolean;
};

const defaultDryRunPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "dry_run_probe_results.json");

const defaultOutputPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "paid_probe_results.json");

const manifestPath = () => path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    execute: false,
    outputPath: process.env.X402_PAID_PROBE_RESULTS_PATH ?? defaultOutputPath(),
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

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const normalizeNetwork = (network: string | undefined): string => {
  if (network === "base" || network === "eip155:8453") return "base";
  return String(network ?? "");
};

const paymentOptions = (challenge: unknown): PaymentOption[] => {
  if (typeof challenge !== "object" || challenge === null) return [];
  const record = challenge as Record<string, unknown>;
  const accepts = record.accepts;
  if (!Array.isArray(accepts)) return [];
  return accepts.map((entry, index) => ({ index, ...(entry as Record<string, unknown>) }));
};

const selectedOption = (challenge: unknown, network: string): PaymentOption | null =>
  paymentOptions(challenge).find((option) => normalizeNetwork(option.network) === network) ?? null;

const requestBody = (endpointCase: EndpointCase): string | null => {
  if (endpointCase.method !== "POST" && endpointCase.method !== "PUT" && endpointCase.method !== "PATCH") {
    return null;
  }
  return JSON.stringify(endpointCase.requestBodyTemplate ?? {});
};

const x402Command = (
  endpointCase: EndpointCase,
  dryRun: DryRunResult,
  option: PaymentOption,
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
    String(option.amount ?? options.maxSpendAtomic),
    dryRun.url,
  ];
  const body = requestBody(endpointCase);
  if (body !== null) args.push(body);
  return args;
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
    parsed: stdout.length > 0 ? JSON.parse(stdout) : null,
  };
};

const buildCandidates = (manifestCases: EndpointCase[], dryRuns: DryRunResult[], options: CliOptions) => {
  const casesById = new Map(manifestCases.map((entry) => [entry.caseId, entry]));
  const selected = dryRuns
    .filter((entry) => entry.status === "challenge")
    .flatMap((dryRun) => {
      const endpointCase = casesById.get(dryRun.caseId);
      if (!endpointCase || endpointCase.sourceProtocol !== "x402") return [];
      if (!options.includeNotReady && endpointCase.probeReadiness !== "ready") return [];
      if (endpointCase.method !== "GET" && !(options.includePost && endpointCase.method === "POST")) {
        return [];
      }
      const option = selectedOption(dryRun.parsedChallenge, options.network);
      if (!option?.amount) return [];
      const amount = BigInt(option.amount);
      if (amount < options.minSpendAtomic) return [];
      if (amount > options.maxSpendAtomic) return [];
      return [{ endpointCase, dryRun, option, amount }];
    });

  return options.limit === null ? selected : selected.slice(0, options.limit);
};

export const runX402PaidProbes = (options = parseArgs(Bun.argv.slice(2))) => {
  const manifestFile = manifestPath();
  const dryRunFile = defaultDryRunPath();
  const manifestText = fs.readFileSync(manifestFile, "utf8");
  const dryRunText = fs.readFileSync(dryRunFile, "utf8");
  const manifest = loadEndpointManifestFromFile(manifestFile);
  const dryRunArtifact = readJson<DryRunArtifact>(dryRunFile);
  const candidates = buildCandidates(manifest.cases, dryRunArtifact.results, options);
  let spent = 0n;
  const results = [];

  for (const candidate of candidates) {
    if (spent + candidate.amount > options.totalSpendCapAtomic) {
      results.push({
        caseId: candidate.endpointCase.caseId,
        status: "skipped",
        skipReason: "total_spend_cap_exceeded",
        amountAtomic: candidate.option.amount,
      });
      continue;
    }

    const args = x402Command(candidate.endpointCase, candidate.dryRun, candidate.option, options);
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
    const parsed = execution.parsed as Record<string, unknown> | null;
    const payment = parsed?.payment as Record<string, unknown> | undefined;
    const settlement = payment?.settlement as Record<string, unknown> | undefined;
    const response = parsed?.response as Record<string, unknown> | undefined;
    results.push({
      caseId: candidate.endpointCase.caseId,
      providerName: candidate.endpointCase.providerName,
      serviceName: candidate.endpointCase.serviceName,
      routeKind: candidate.endpointCase.routeKind,
      status: execution.exitCode === 0 ? "paid" : "error",
      executedAt,
      request: {
        method: candidate.endpointCase.method,
        url: candidate.dryRun.url,
        bodySha256: requestBody(candidate.endpointCase) ? sha256(requestBody(candidate.endpointCase) ?? "") : null,
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
      error: execution.exitCode === 0 ? null : execution.stderr,
    });
  }

  const artifact = {
    schemaVersion: "1",
    sourceManifestPath: manifestFile,
    sourceManifestSha256: sha256(manifestText),
    sourceDryRunPath: dryRunFile,
    sourceDryRunSha256: sha256(dryRunText),
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
