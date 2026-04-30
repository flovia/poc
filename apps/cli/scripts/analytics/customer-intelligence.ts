import path from "node:path";
import { buildCustomerIntelligence } from "intelligence";
import {
  fetchCdpDiscoveryResources,
  fetchOutgoingTransfersByCustomer,
  fetchZerionPortfolio,
  unavailablePortfolioSource,
} from "sources";
import type { FetchLike } from "sources";
import { normalizeAsset, normalizeNetwork, validateCustomerIntelligenceFixture } from "contracts";
import type { CustomerIntelligenceResponse } from "contracts";
import { writeAtomically } from "./io";
import { type AnalyticsStore, createAnalyticsStore } from "./store";

const DEFAULT_OUTPUT = path.join(
  process.cwd(),
  "../bff/fixtures/phase-b/customer-intelligence/customer-intelligence.json",
);

export type CustomerIntelligenceCliOptions = {
  address: string;
  network: string;
  asset: string;
  from: string;
  to: string;
  out: string;
  limit: number;
  cdpLimit: number | null;
  bitqueryToken?: string;
  bitqueryFetch?: FetchLike;
  cdpFetch?: FetchLike;
  bitqueryEndpoint?: string;
  cdpEndpoint?: string;
  portfolioSource: "none" | "zerion";
  zerionApiKey?: string;
  zerionFetch?: FetchLike;
  zerionEndpoint?: string;
  analyticsDbPath?: string;
  analyticsStore?: AnalyticsStore;
};

export type CustomerIntelligenceRunResult = {
  response: CustomerIntelligenceResponse;
  outputPath: string;
  analyticsRunId?: number;
};

export type CustomerIntelligenceBatchOptions = Omit<
  CustomerIntelligenceCliOptions,
  "address" | "out"
> & {
  addresses: string[];
  out?: string;
  outDir?: string;
  portfolioEnrichmentLimit?: number;
};

export type CustomerIntelligenceBatchResult = {
  responses: CustomerIntelligenceResponse[];
  outputPaths: string[];
  analyticsRunId?: number;
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

const defaultOptions = (): Partial<CustomerIntelligenceCliOptions> => ({
  network: "base",
  asset: "USDC",
  out: process.env.CUSTOMER_INTELLIGENCE_OUTPUT_PATH ?? DEFAULT_OUTPUT,
  limit: 1000,
  cdpLimit: 100,
  bitqueryToken: process.env.BITQUERY_TOKEN,
  portfolioSource: "none",
  zerionApiKey: process.env.ZERION_API_KEY,
});

export const parseCustomerIntelligenceArgs = (argv: string[]): CustomerIntelligenceCliOptions => {
  const options: Partial<CustomerIntelligenceCliOptions> = defaultOptions();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--address") options.address = parseArg(index++, argv);
    else if (arg === "--network") options.network = parseArg(index++, argv) ?? options.network;
    else if (arg === "--asset") options.asset = parseArg(index++, argv) ?? options.asset;
    else if (arg === "--from") options.from = parseIso(parseArg(index++, argv), "--from");
    else if (arg === "--to") options.to = parseIso(parseArg(index++, argv), "--to");
    else if (arg === "--out") options.out = parseArg(index++, argv) ?? options.out;
    else if (arg === "--limit")
      options.limit = parsePositiveInteger(parseArg(index++, argv), "--limit");
    else if (arg === "--cdp-limit") {
      options.cdpLimit = parsePositiveInteger(parseArg(index++, argv), "--cdp-limit");
    } else if (arg === "--cdp-all") options.cdpLimit = null;
    else if (arg === "--bitquery-endpoint") options.bitqueryEndpoint = parseArg(index++, argv);
    else if (arg === "--cdp-endpoint") options.cdpEndpoint = parseArg(index++, argv);
    else if (arg === "--portfolio-source") {
      const source = parseArg(index++, argv);
      if (source !== "none" && source !== "zerion") {
        throw new Error("--portfolio-source must be one of: none, zerion");
      }
      options.portfolioSource = source;
    } else if (arg === "--analytics-db") {
      options.analyticsDbPath = parseArg(index++, argv) ?? process.env.ANALYTICS_DB_PATH;
    } else if (arg === "--zerion-endpoint") options.zerionEndpoint = parseArg(index++, argv);
  }

  if (!options.address) throw new Error("--address is required");
  if (!options.from) throw new Error("--from is required");
  if (!options.to) throw new Error("--to is required");

  return options as CustomerIntelligenceCliOptions;
};

const resolveBitqueryToken = (token: string | undefined) => {
  if (!token || token.trim().length === 0) {
    throw new Error("BITQUERY_TOKEN is required for customer intelligence capture");
  }
  return token;
};

const resolveZerionApiKey = (apiKey: string | undefined) => {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("ZERION_API_KEY is required for Zerion portfolio capture");
  }
  return apiKey;
};

export const runCustomerIntelligenceCapture = async (
  options: Partial<CustomerIntelligenceCliOptions>,
): Promise<CustomerIntelligenceRunResult> => {
  const parsed = { ...defaultOptions(), ...options } as CustomerIntelligenceCliOptions;
  if (!parsed.address) throw new Error("--address is required");
  if (!parsed.from) throw new Error("--from is required");
  if (!parsed.to) throw new Error("--to is required");
  const scope = validateCustomerIntelligenceFixture({
    generatedAt: "2026-01-01T00:00:00Z",
    generatedFrom: "scope-validation",
    customerAddress: parsed.address,
    scope: {
      address: parsed.address,
      network: normalizeNetwork(parsed.network),
      asset: normalizeAsset(parsed.asset),
      timeWindow: { from: parsed.from, to: parsed.to },
    },
    x402Services: [],
    payToActivities: [],
    portfolioSummary: {
      totalValueUsd: null,
      tokenCount: 0,
      sourceCoverage: unavailablePortfolioSource().sourceCoverage,
      provenance: "derived_insight",
      provenanceByField: { sourceCoverage: "derived_insight" },
      reasons: [{ provenance: "derived_insight", label: "scope validation" }],
    },
    defiPositions: [],
    insights: [],
    sourceCoverage: [unavailablePortfolioSource().sourceCoverage],
    provenance: "derived_insight",
    provenanceByField: { customerAddress: "onchain_fact" },
    reasons: [{ provenance: "derived_insight", label: "scope validation" }],
  }).scope;
  const bitqueryToken = resolveBitqueryToken(parsed.bitqueryToken);
  const zerionApiKey =
    parsed.portfolioSource === "zerion" ? resolveZerionApiKey(parsed.zerionApiKey) : null;

  const cdpResult = await fetchCdpDiscoveryResources({
    limit: parsed.cdpLimit,
    fetchFn: parsed.cdpFetch,
    endpoint: parsed.cdpEndpoint,
  });
  const transfers = await fetchOutgoingTransfersByCustomer({
    network: scope.network,
    asset: scope.asset,
    customerAddress: scope.address,
    token: bitqueryToken,
    fetchFn: parsed.bitqueryFetch,
    endpoint: parsed.bitqueryEndpoint,
    limit: parsed.limit,
    timeWindow: scope.timeWindow,
  });

  const portfolio =
    parsed.portfolioSource === "zerion"
      ? await fetchZerionPortfolio({
          address: scope.address,
          apiKey: zerionApiKey ?? "",
          fetchFn: parsed.zerionFetch,
          endpoint: parsed.zerionEndpoint,
        })
      : unavailablePortfolioSource("portfolio source not configured");

  const response = buildCustomerIntelligence({
    scope,
    transfers,
    resources: cdpResult.resources,
    portfolio,
  });

  const validated = validateCustomerIntelligenceFixture(response);
  const analyticsStore =
    parsed.analyticsStore ??
    (parsed.analyticsDbPath ? createAnalyticsStore({ path: parsed.analyticsDbPath }) : null);
  let analyticsRunId: number | undefined;
  if (analyticsStore) {
    analyticsRunId = analyticsStore.beginCaptureRun({
      kind: "customer_intelligence_capture",
      parameters: {
        address: scope.address,
        network: scope.network,
        asset: scope.asset,
        timeWindow: scope.timeWindow,
        portfolioSource: parsed.portfolioSource,
      },
      sourceCoverage: {
        bitquery: "available",
        cdp_discovery: "available",
        portfolio: parsed.portfolioSource === "zerion" ? "requested" : "skipped",
      },
    });
    analyticsStore.persistCustomerWallets([
      { address: scope.address, sourceRunId: analyticsRunId },
    ]);
    analyticsStore.persistCustomerIntelligenceSnapshots([validated], analyticsRunId);
    analyticsStore.completeCaptureRun(analyticsRunId, {
      bitquery: "available",
      cdp_discovery: "available",
      portfolio: parsed.portfolioSource === "zerion" ? "available_or_partial" : "skipped",
    });
    if (analyticsStore !== parsed.analyticsStore) analyticsStore.close();
  }
  writeAtomically(parsed.out, `${JSON.stringify(validated, null, 2)}\n`);

  return { response: validated, outputPath: parsed.out, analyticsRunId };
};

export const runCustomerIntelligenceBatchCapture = async (
  options: Partial<CustomerIntelligenceBatchOptions> &
    Pick<CustomerIntelligenceBatchOptions, "addresses" | "from" | "to">,
): Promise<CustomerIntelligenceBatchResult> => {
  const parsed = { ...defaultOptions(), ...options } as CustomerIntelligenceBatchOptions;
  if (parsed.addresses.length === 0) throw new Error("addresses must not be empty");
  const analyticsStore =
    parsed.analyticsStore ??
    (parsed.analyticsDbPath ? createAnalyticsStore({ path: parsed.analyticsDbPath }) : null);
  const analyticsRunId = analyticsStore?.beginCaptureRun({
    kind: "customer_intelligence_capture",
    parameters: {
      addresses: parsed.addresses,
      network: parsed.network,
      asset: parsed.asset,
      from: parsed.from,
      to: parsed.to,
      portfolioSource: parsed.portfolioSource,
      portfolioEnrichmentLimit: parsed.portfolioEnrichmentLimit ?? 0,
    },
    sourceCoverage: { bitquery: "started", cdp_discovery: "started", portfolio: "pending" },
  });

  try {
    const responses: CustomerIntelligenceResponse[] = [];
    const outputPaths: string[] = [];
    let remainingPortfolio =
      parsed.portfolioSource === "zerion"
        ? (parsed.portfolioEnrichmentLimit ?? parsed.addresses.length)
        : 0;

    for (const address of parsed.addresses) {
      const usePortfolio = parsed.portfolioSource === "zerion" && remainingPortfolio > 0;
      if (usePortfolio) remainingPortfolio -= 1;
      const outputPath = path.join(
        parsed.outDir ?? path.dirname(parsed.out ?? DEFAULT_OUTPUT),
        `${address.toLowerCase()}.json`,
      );
      const result = await runCustomerIntelligenceCapture({
        ...parsed,
        address,
        out: outputPath,
        portfolioSource: usePortfolio ? "zerion" : "none",
        analyticsStore: undefined,
        analyticsDbPath: undefined,
      });
      responses.push(result.response);
      outputPaths.push(result.outputPath);
    }

    if (analyticsStore && analyticsRunId !== undefined) {
      analyticsStore.persistCustomerWallets(
        responses.map((response) => ({
          address: response.customerAddress,
          sourceRunId: analyticsRunId,
        })),
      );
      analyticsStore.persistCustomerIntelligenceSnapshots(responses, analyticsRunId);
      analyticsStore.completeCaptureRun(analyticsRunId, {
        bitquery: "available",
        cdp_discovery: "available",
        portfolio:
          parsed.portfolioSource === "zerion"
            ? {
                status: "capped",
                cap: parsed.portfolioEnrichmentLimit ?? parsed.addresses.length,
                skipped: responses.filter((response) =>
                  response.sourceCoverage.some(
                    (coverage) =>
                      coverage.source === "portfolio" && coverage.status === "unavailable",
                  ),
                ).length,
              }
            : { status: "skipped", reason: "portfolio source not configured" },
      });
    }

    return { responses, outputPaths, analyticsRunId };
  } catch (error) {
    if (analyticsStore && analyticsRunId !== undefined) {
      analyticsStore.failCaptureRun(analyticsRunId, error, {
        bitquery: "partial_or_failed",
        cdp_discovery: "partial_or_failed",
        portfolio: "partial_or_failed",
      });
    }
    throw error;
  } finally {
    if (analyticsStore && analyticsStore !== parsed.analyticsStore) analyticsStore.close();
  }
};

const main = async () => {
  const result = await runCustomerIntelligenceCapture(
    parseCustomerIntelligenceArgs(Bun.argv.slice(2)),
  );
  console.log(JSON.stringify({ outputPath: result.outputPath }));
};

if (import.meta.main) {
  await main();
}
