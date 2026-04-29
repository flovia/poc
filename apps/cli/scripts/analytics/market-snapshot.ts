import fs from "node:fs";
import path from "node:path";
import { buildMarketSnapshot, filterPaymentOptionsByScope } from "intelligence";
import { fetchBitqueryBaseUsdcAggregates, fetchCdpDiscoveryResources } from "sources";
import type { FetchLike } from "sources";
import { normalizeAsset, normalizeNetwork, paymentIdentityKey } from "contracts";
import type { CdpPaymentOption, MarketSnapshot } from "contracts";

const DEFAULT_REPORT_JSON = path.join(process.cwd(), "reports", "x402-market-snapshot.json");
const DEFAULT_REPORT_MARKDOWN = path.join(process.cwd(), "reports", "x402-market-summary.md");
const DEFAULT_CDP_LIMIT = 100;
const DEFAULT_SINCE_DAYS = 30;

const toPaymentIdentity = (option: CdpPaymentOption) => paymentIdentityKey(option);

const dedupeByPayTo = (options: CdpPaymentOption[]): CdpPaymentOption[] => {
  const seen = new Set<string>();
  const deduped: CdpPaymentOption[] = [];
  for (const option of options) {
    const key = toPaymentIdentity(option);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }
  return deduped;
};

type CliOptions = {
  limit: number | null;
  network: string | null;
  asset: string | null;
  jsonOutputPath: string;
  markdownOutputPath: string;
  cdpFetch?: FetchLike;
  bitqueryFetch?: FetchLike;
  cdpEndpoint?: string;
  bitqueryEndpoint?: string;
  bitqueryChunkSize?: number;
  timeWindow: {
    from: string;
    to?: string;
  };
};

type RunResult = {
  snapshot: MarketSnapshot;
  snapshotPath: string;
  summaryPath: string;
};

const parseArg = (index: number, args: string[]): string | undefined => args[index + 1];

const parseLimit = (value: string | undefined, name: string, minimum: number = 0): number => {
  const next = Number(value);
  if (!Number.isInteger(next) || next < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return next;
};

const parseDefaultLimit = (): number => {
  const envValue = process.env.X402_MARKET_FETCH_LIMIT?.trim();
  if (!envValue) return DEFAULT_CDP_LIMIT;
  return parseLimit(envValue, "X402_MARKET_FETCH_LIMIT");
};

export const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    limit: parseDefaultLimit(),
    network: "base",
    asset: "USDC",
    jsonOutputPath: process.env.X402_MARKET_JSON_OUTPUT_PATH ?? DEFAULT_REPORT_JSON,
    markdownOutputPath: process.env.X402_MARKET_MARKDOWN_OUTPUT_PATH ?? DEFAULT_REPORT_MARKDOWN,
    timeWindow: {
      from: new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      options.limit = null;
    } else if (arg === "--limit") {
      options.limit = parseLimit(parseArg(index++, argv), "--limit");
    } else if (arg === "--network") options.network = parseArg(index++, argv) ?? null;
    else if (arg === "--asset") options.asset = parseArg(index++, argv) ?? null;
    else if (arg === "--json-output")
      options.jsonOutputPath = parseArg(index++, argv) ?? options.jsonOutputPath;
    else if (arg === "--markdown-output") {
      options.markdownOutputPath = parseArg(index++, argv) ?? options.markdownOutputPath;
    } else if (arg === "--bitquery-chunk-size") {
      options.bitqueryChunkSize = parseLimit(parseArg(index++, argv), "--bitquery-chunk-size", 1);
    } else if (arg === "--cdp-endpoint") {
      options.cdpEndpoint = parseArg(index++, argv);
    } else if (arg === "--bitquery-endpoint") {
      options.bitqueryEndpoint = parseArg(index++, argv);
    } else if (arg === "--since-days") {
      const days = Number(parseArg(index++, argv));
      if (!Number.isFinite(days) || days <= 0) throw new Error("--since-days must be positive");
      options.timeWindow = {
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      };
    } else if (arg === "--from") {
      const from = parseArg(index++, argv);
      if (!from || Number.isNaN(Date.parse(from))) throw new Error("--from must be an ISO datetime");
      options.timeWindow = { ...options.timeWindow, from: new Date(from).toISOString() };
    } else if (arg === "--to") {
      const to = parseArg(index++, argv);
      if (!to || Number.isNaN(Date.parse(to))) throw new Error("--to must be an ISO datetime");
      options.timeWindow = { ...options.timeWindow, to: new Date(to).toISOString() };
    }
  }

  return options;
};

const buildMarkdownReport = (snapshot: MarketSnapshot): string => {
  const topResources = snapshot.summary.topResources
    .map(
      (resource) =>
        `- ${resource.resourceId}: tx=${resource.totalTransactionCount} rank=${resource.activityRank}`,
    )
    .join("\n");

  const discrepancyRows = snapshot.resources.flatMap((resource) =>
    resource.paymentOptions
      .filter((row) => row.discrepancies.length > 0)
      .map(
        (row) =>
          `${resource.resourceId} ${row.cdpPaymentOption.network}/${row.cdpPaymentOption.asset} ${row.cdpPaymentOption.payTo} -> ${row.discrepancies.length} discrepancy(s)`,
      ),
  );

  const scopedRows = snapshot.resources
    .flatMap((resource) =>
      resource.paymentOptions
        .filter((row) => row.inScope)
        .map(
          (row) =>
            `- ${resource.resourceId}/${row.cdpPaymentOption.payTo} tx=${row.bitqueryAggregate.transactionCount} active=${row.isActive}`,
        ),
    )
    .join("\n");

  return `# x402 market snapshot

Generated: ${snapshot.generatedAt}

## Scope

${snapshot.scope.network ? `- network: ${snapshot.scope.network}` : ""}
${snapshot.scope.asset ? `- asset: ${snapshot.scope.asset}` : ""}

## Summary

- resources: ${snapshot.summary.totalResources}
- scoped resources: ${snapshot.summary.scopedResources}
- payment options: ${snapshot.summary.totalPaymentOptions}
- scoped payment options: ${snapshot.summary.scopedPaymentOptions}
- active resources: ${snapshot.summary.activeResources}
- active payment options: ${snapshot.summary.activePaymentOptions}
- discrepancies: ${snapshot.summary.discrepancyCount}
- transactions (scoped): ${snapshot.summary.totalTransactions}
- unique senders (scoped): ${snapshot.summary.totalUniqueSenders}

## Top resources

${topResources || "No scoped resources"}

## Scoped payment options

${scopedRows || "No scoped payment options"}

## Discrepancy notes

${discrepancyRows.length > 0 ? discrepancyRows.join("\n") : "No discrepancies"}
`;
};

const writeAtomically = (outputPath: string, payload: string) => {
  const directory = path.dirname(outputPath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = `${outputPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tempPath, payload);
  fs.renameSync(tempPath, outputPath);
};

const buildBitqueryTargets = (rows: Array<{ option: CdpPaymentOption }>) =>
  dedupeByPayTo(rows.map((row) => row.option));

export const runMarketSnapshot = async (options: Partial<CliOptions> = {}): Promise<RunResult> => {
  const parsed = {
    ...parseArgs([]),
    ...options,
  };

  const cdpResult = await fetchCdpDiscoveryResources({
    limit: parsed.limit,
    fetchFn: parsed.cdpFetch,
    endpoint: parsed.cdpEndpoint,
  });

  const scope = {
    ...(parsed.network === null ? {} : { network: normalizeNetwork(parsed.network) }),
    ...(parsed.asset === null ? {} : { asset: normalizeAsset(parsed.asset) }),
  };

  const scopedRows = filterPaymentOptionsByScope(cdpResult.resources, scope);
  const bitqueryPaymentOptions = buildBitqueryTargets(
    scopedRows.filter(({ inScope, option }) => inScope),
  );

  const queriedPairs = bitqueryPaymentOptions.length;
  const aggregates =
    queriedPairs === 0
      ? []
      : await fetchBitqueryBaseUsdcAggregates({
          network: normalizeNetwork(parsed.network ?? "base"),
          asset: normalizeAsset(parsed.asset ?? "USDC"),
          paymentOptions: bitqueryPaymentOptions,
          fetchFn: parsed.bitqueryFetch,
          endpoint: parsed.bitqueryEndpoint,
          token: process.env.BITQUERY_TOKEN,
          chunkSize: parsed.bitqueryChunkSize,
          timeWindow: parsed.timeWindow,
        });

  const snapshot = buildMarketSnapshot({
    resources: cdpResult.resources,
    aggregates,
    scope,
    cdp: {
      sourceName: "cdp-discovery",
      fetchLimit: parsed.limit,
      fetchedCount: cdpResult.fetchedCount,
    },
    bitquery: {
      sourceName: "bitquery-graphql",
      queriedPairs,
    },
  });

  const snapshotText = `${JSON.stringify(snapshot, null, 2)}\n`;
  const reportText = buildMarkdownReport(snapshot);

  writeAtomically(parsed.jsonOutputPath, snapshotText);
  writeAtomically(parsed.markdownOutputPath, reportText);

  return {
    snapshot,
    snapshotPath: parsed.jsonOutputPath,
    summaryPath: parsed.markdownOutputPath,
  };
};

const main = async () => {
  const result = await runMarketSnapshot(parseArgs(Bun.argv.slice(2)));
  console.log(
    JSON.stringify({
      snapshotPath: result.snapshotPath,
      summaryPath: result.summaryPath,
    }),
  );
};

if (import.meta.main) {
  await main();
}
