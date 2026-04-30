import path from "node:path";
import type { FetchLike } from "sources";
import { normalizeAsset, normalizeNetwork, normalizePayTo } from "contracts";
import { runPayToTransactionCapture } from "./capture-coingecko-transactions";
import {
  type CustomerIntelligenceBatchOptions,
  runCustomerIntelligenceBatchCapture,
} from "./customer-intelligence";
import { writeAtomically } from "./io";
import { runMarketSnapshot } from "./market-snapshot";
import { generateServiceAnalyticsReadModels } from "./read-models";
import { buildPayToSamplingPlan, buildWalletSamplingPlan } from "./sampling";
import { type AnalyticsStore, createAnalyticsStore, getDefaultAnalyticsDbPath } from "./store";

const DEFAULT_FROM = "2026-01-01T00:00:00.000Z";
const DEFAULT_TO = "2026-04-29T23:59:59.000Z";
const DEFAULT_COINGECKO_PAYTO = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";

export type FullCaptureOptions = {
  analyticsDbPath: string;
  network: string;
  asset: string;
  from: string;
  to: string;
  payToBudget: number;
  walletBudget: number;
  perPayToLimit: number;
  pageSize: number;
  sliceDays?: number;
  portfolioSource: "none" | "zerion";
  portfolioLimit: number;
  outDir: string;
  readModelOutputPath: string;
  seed: string;
  dryRun: boolean;
  bitqueryToken?: string;
  zerionApiKey?: string;
  bitqueryEndpoint?: string;
  cdpEndpoint?: string;
  zerionEndpoint?: string;
  cdpFetch?: FetchLike;
  bitqueryFetch?: FetchLike;
  zerionFetch?: FetchLike;
  analyticsStore?: AnalyticsStore;
};

export type FullCapturePlan = {
  stages: string[];
  budgets: Record<string, number>;
  outputPaths: Record<string, string>;
  requiredCredentials: string[];
};

export type FullCaptureResult = {
  dryRun: boolean;
  plan: FullCapturePlan;
  analyticsRunId?: number;
  stageProgress: Record<string, "pending" | "success" | "failed">;
  payToPlanPath?: string;
  walletPlanPath?: string;
  readModelOutputPath?: string;
};

const parseArg = (index: number, args: string[]): string | undefined => args[index + 1];

const parsePositiveInteger = (value: string | undefined, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseIso = (value: string | undefined, name: string) => {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO datetime`);
  return new Date(value).toISOString();
};

const defaultOutDir = () =>
  path.join(process.cwd(), "data", "analytics", "generated", "capture-full");

const resolveOutputPaths = (outDir: string) => ({
  marketSnapshot: path.join(outDir, "market-snapshot.json"),
  marketSummary: path.join(outDir, "market-summary.md"),
  payToPlan: path.join(outDir, "payto-sampling-plan.json"),
  transfersDir: path.join(outDir, "payto-transfers"),
  walletPlan: path.join(outDir, "wallet-sampling-plan.json"),
  customerDir: path.join(outDir, "customer-intelligence"),
  readModels: path.join(outDir, "service-read-models.json"),
});

export const parseFullCaptureArgs = (argv: string[]): FullCaptureOptions => {
  const outDir = process.env.ANALYTICS_CAPTURE_FULL_OUT_DIR ?? defaultOutDir();
  const defaults = resolveOutputPaths(outDir);
  const options: FullCaptureOptions = {
    analyticsDbPath: process.env.ANALYTICS_DB_PATH ?? getDefaultAnalyticsDbPath(),
    network: "base",
    asset: "USDC",
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    payToBudget: 25,
    walletBudget: 100,
    perPayToLimit: 500,
    pageSize: 100,
    portfolioSource: "none",
    portfolioLimit: 0,
    outDir,
    readModelOutputPath: process.env.ANALYTICS_READ_MODEL_OUTPUT_PATH ?? defaults.readModels,
    seed: "capture-full-v1",
    dryRun: false,
    bitqueryToken: process.env.BITQUERY_TOKEN,
    zerionApiKey: process.env.ZERION_API_KEY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--analytics-db") options.analyticsDbPath = parseArg(index++, argv) ?? "";
    else if (arg === "--network") options.network = parseArg(index++, argv) ?? options.network;
    else if (arg === "--asset") options.asset = parseArg(index++, argv) ?? options.asset;
    else if (arg === "--from") options.from = parseIso(parseArg(index++, argv), "--from");
    else if (arg === "--to") options.to = parseIso(parseArg(index++, argv), "--to");
    else if (arg === "--payto-budget")
      options.payToBudget = parsePositiveInteger(parseArg(index++, argv), "--payto-budget");
    else if (arg === "--wallet-budget")
      options.walletBudget = parsePositiveInteger(parseArg(index++, argv), "--wallet-budget");
    else if (arg === "--per-payto-limit")
      options.perPayToLimit = parsePositiveInteger(parseArg(index++, argv), "--per-payto-limit");
    else if (arg === "--page-size")
      options.pageSize = parsePositiveInteger(parseArg(index++, argv), "--page-size");
    else if (arg === "--slice-days")
      options.sliceDays = parsePositiveInteger(parseArg(index++, argv), "--slice-days");
    else if (arg === "--portfolio-source") {
      const source = parseArg(index++, argv);
      if (source !== "none" && source !== "zerion")
        throw new Error("--portfolio-source must be one of: none, zerion");
      options.portfolioSource = source;
    } else if (arg === "--portfolio-limit")
      options.portfolioLimit = parsePositiveInteger(parseArg(index++, argv), "--portfolio-limit");
    else if (arg === "--out-dir") {
      options.outDir = parseArg(index++, argv) ?? options.outDir;
      options.readModelOutputPath = resolveOutputPaths(options.outDir).readModels;
    } else if (arg === "--read-model-output")
      options.readModelOutputPath = parseArg(index++, argv) ?? options.readModelOutputPath;
    else if (arg === "--seed") options.seed = parseArg(index++, argv) ?? options.seed;
    else if (arg === "--bitquery-endpoint") options.bitqueryEndpoint = parseArg(index++, argv);
    else if (arg === "--cdp-endpoint") options.cdpEndpoint = parseArg(index++, argv);
    else if (arg === "--zerion-endpoint") options.zerionEndpoint = parseArg(index++, argv);
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }

  if (!options.analyticsDbPath) throw new Error("--analytics-db is required");
  if (Date.parse(options.from) > Date.parse(options.to))
    throw new Error("--from must be before --to");
  return options;
};

const buildPlan = (options: FullCaptureOptions): FullCapturePlan => {
  const paths = resolveOutputPaths(options.outDir);
  return {
    stages: [
      "market-census",
      "payto-sampling",
      "payto-transfer-capture",
      "wallet-sampling",
      "customer-intelligence",
      "read-model-generation",
    ],
    budgets: {
      payToBudget: options.payToBudget,
      walletBudget: options.walletBudget,
      perPayToLimit: options.perPayToLimit,
      portfolioLimit: options.portfolioLimit,
    },
    outputPaths: {
      ...paths,
      analyticsDb: options.analyticsDbPath,
      readModels: options.readModelOutputPath,
    },
    requiredCredentials: [
      "BITQUERY_TOKEN",
      ...(options.portfolioSource === "zerion" ? ["ZERION_API_KEY"] : []),
    ],
  };
};

const timeSlices = (options: FullCaptureOptions) => {
  if (!options.sliceDays) return undefined;
  const slices: Array<{ from: string; to?: string }> = [];
  const end = Date.parse(options.to);
  const sliceMs = options.sliceDays * 24 * 60 * 60 * 1000;
  for (let start = Date.parse(options.from); start < end; start += sliceMs) {
    slices.push({
      from: new Date(start).toISOString(),
      to: new Date(Math.min(start + sliceMs, end)).toISOString(),
    });
  }
  return slices;
};

const credentialCheck = (options: FullCaptureOptions) => {
  if (!options.bitqueryToken?.trim())
    throw new Error("BITQUERY_TOKEN is required for full capture");
  if (options.portfolioSource === "zerion" && !options.zerionApiKey?.trim()) {
    throw new Error("ZERION_API_KEY is required for Zerion portfolio capture");
  }
};

export const runFullCapture = async (
  input: Partial<FullCaptureOptions> = {},
): Promise<FullCaptureResult> => {
  const parsed = { ...parseFullCaptureArgs([]), ...input };
  const options = {
    ...parsed,
    network: normalizeNetwork(parsed.network),
    asset: normalizeAsset(parsed.asset),
  };
  const plan = buildPlan(options);
  const stageProgress = Object.fromEntries(
    plan.stages.map((stage) => [stage, "pending"]),
  ) as FullCaptureResult["stageProgress"];

  if (options.dryRun) return { dryRun: true, plan, stageProgress };
  credentialCheck(options);

  const store = options.analyticsStore ?? createAnalyticsStore({ path: options.analyticsDbPath });
  const fullRunId = store.beginCaptureRun({
    kind: "full_capture",
    parameters: {
      network: options.network,
      asset: options.asset,
      from: options.from,
      to: options.to,
      budgets: plan.budgets,
      outputPaths: plan.outputPaths,
      seed: options.seed,
    },
    sourceCoverage: { stages: stageProgress },
  });

  const completeStage = (stage: string) => {
    stageProgress[stage] = "success";
  };
  const failStage = (stage: string) => {
    stageProgress[stage] = "failed";
  };

  try {
    await runMarketSnapshot({
      limit: null,
      network: options.network,
      asset: options.asset,
      jsonOutputPath: plan.outputPaths.marketSnapshot,
      markdownOutputPath: plan.outputPaths.marketSummary,
      analyticsStore: store,
      timeWindow: { from: options.from, to: options.to },
      bitqueryToken: options.bitqueryToken,
      bitqueryEndpoint: options.bitqueryEndpoint,
      cdpEndpoint: options.cdpEndpoint,
      bitqueryFetch: options.bitqueryFetch,
      cdpFetch: options.cdpFetch,
    });
    completeStage("market-census");

    const payToPlan = buildPayToSamplingPlan({
      seed: options.seed,
      budget: {
        total: options.payToBudget,
        perActivityTier: {
          "0": 1,
          "1": 2,
          "2-5": 3,
          "6-20": 3,
          "21-100": 3,
          "101-1000": 2,
          "1000+": 1,
        },
        perMappingPattern: {
          unresolved_payto: 2,
          one_payto_many_endpoints: 2,
          many_paytos_one_service: 2,
        },
        longTail: 3,
      },
      census: store.listPayToCensusRows({ network: options.network, asset: options.asset }),
      mandatoryPayTos: [
        { network: options.network, asset: options.asset, payTo: DEFAULT_COINGECKO_PAYTO },
      ],
    });
    writeAtomically(plan.outputPaths.payToPlan, `${JSON.stringify(payToPlan, null, 2)}\n`);
    store.persistSamplingPlanMetadata({
      planKind: "payto",
      planKey: `${options.network}:${options.asset}:${options.seed}`,
      payload: payToPlan,
      parameters: { budget: payToPlan.budget, seed: options.seed },
      selectedEntities: payToPlan.selected.map((row) => row.payTo),
      sourceRunId: fullRunId,
      generatedAt: payToPlan.generatedAt,
    });
    completeStage("payto-sampling");

    for (const row of payToPlan.selected) {
      const payTo = normalizePayTo(row.payTo);
      await runPayToTransactionCapture({
        network: options.network,
        asset: options.asset,
        payTo,
        providerId:
          row.serviceId ?? (payTo === DEFAULT_COINGECKO_PAYTO ? "coingecko" : "sampled-payto"),
        resource: row.serviceName ?? payTo,
        limit: options.perPayToLimit,
        pageSize: options.pageSize,
        transactionOutputPath: path.join(plan.outputPaths.transfersDir, `${payTo}.json`),
        attributionOutputPath: path.join(
          plan.outputPaths.transfersDir,
          `${payTo}.attribution.json`,
        ),
        bitqueryToken: options.bitqueryToken,
        bitqueryEndpoint: options.bitqueryEndpoint,
        bitqueryFetch: options.bitqueryFetch,
        analyticsStore: store,
        timeWindow: { from: options.from, to: options.to },
        timeSlices: timeSlices(options),
      });
    }
    completeStage("payto-transfer-capture");

    const walletPlan = buildWalletSamplingPlan({
      seed: options.seed,
      transfers: store.listWalletTransferRows({ network: options.network, asset: options.asset }),
      budget: {
        total: options.walletBudget,
        coingecko_repeat_user: 10,
        coingecko_high_spender: 10,
        one_shot_user: 10,
        peer_service_user: 10,
        cross_service_user: 10,
        bundled_payto_user: 5,
        recent_user: 10,
        random_long_tail_user: 10,
      },
      caps: { total: options.walletBudget, portfolioEnrichment: options.portfolioLimit },
      portfolioPolicy: options.portfolioSource === "zerion" ? "capped" : "disabled",
    });
    writeAtomically(plan.outputPaths.walletPlan, `${JSON.stringify(walletPlan, null, 2)}\n`);
    store.persistSamplingPlanMetadata({
      planKind: "wallet",
      planKey: `${options.network}:${options.asset}:${options.seed}`,
      payload: walletPlan,
      parameters: { budget: walletPlan.budget, caps: walletPlan.caps, seed: options.seed },
      selectedEntities: walletPlan.selected.map((row) => row.address),
      sourceRunId: fullRunId,
      generatedAt: walletPlan.generatedAt,
    });
    completeStage("wallet-sampling");

    const batchOptions: Partial<CustomerIntelligenceBatchOptions> &
      Pick<CustomerIntelligenceBatchOptions, "addresses" | "from" | "to"> = {
      addresses: walletPlan.selected.map((row) => row.address),
      from: options.from,
      to: options.to,
      network: options.network,
      asset: options.asset,
      outDir: plan.outputPaths.customerDir,
      limit: options.perPayToLimit,
      cdpLimit: null,
      portfolioSource: options.portfolioSource,
      portfolioEnrichmentLimit: options.portfolioLimit,
      bitqueryToken: options.bitqueryToken,
      zerionApiKey: options.zerionApiKey,
      bitqueryEndpoint: options.bitqueryEndpoint,
      cdpEndpoint: options.cdpEndpoint,
      zerionEndpoint: options.zerionEndpoint,
      bitqueryFetch: options.bitqueryFetch,
      cdpFetch: options.cdpFetch,
      zerionFetch: options.zerionFetch,
      analyticsStore: store,
    };
    if (batchOptions.addresses.length > 0) await runCustomerIntelligenceBatchCapture(batchOptions);
    completeStage("customer-intelligence");

    generateServiceAnalyticsReadModels({
      analyticsDbPath: options.analyticsDbPath,
      outputPath: options.readModelOutputPath,
    });
    completeStage("read-model-generation");

    store.completeCaptureRun(fullRunId, {
      stages: stageProgress,
      cdp_discovery: "available",
      bitquery: "available",
      portfolio: options.portfolioSource === "zerion" ? "capped" : "skipped",
    });
    return {
      dryRun: false,
      plan,
      analyticsRunId: fullRunId,
      stageProgress,
      payToPlanPath: plan.outputPaths.payToPlan,
      walletPlanPath: plan.outputPaths.walletPlan,
      readModelOutputPath: options.readModelOutputPath,
    };
  } catch (error) {
    const pendingStage = plan.stages.find((stage) => stageProgress[stage] === "pending");
    if (pendingStage) failStage(pendingStage);
    store.failCaptureRun(fullRunId, error, { stages: stageProgress });
    throw error;
  } finally {
    if (store !== options.analyticsStore) store.close();
  }
};

if (import.meta.main) {
  const result = await runFullCapture(parseFullCaptureArgs(Bun.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}
