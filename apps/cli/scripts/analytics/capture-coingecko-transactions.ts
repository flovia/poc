import path from "node:path";
import {
  validateMockEndpointAttributionFixture,
  validateRealTransactionFixture,
  type BitqueryTransferFact,
  type MockEndpointAttributionFixture,
  type RealTransactionFixture,
} from "contracts";
import { fetchPaymentTransfersByPayTo } from "sources";
import type { FetchLike } from "sources";
import { writeAtomically } from "./io";

const DEFAULT_PAY_TO = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
const DEFAULT_RESOURCE = "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools";
const DEFAULT_TRANSACTION_OUTPUT = path.join(
  process.cwd(),
  "../bff/fixtures/phase-a/coingecko-transactions.json",
);
const DEFAULT_ATTRIBUTION_OUTPUT = path.join(
  process.cwd(),
  "../bff/fixtures/phase-b/mock-attribution.json",
);

const COINGECKO_X402_ENDPOINTS = [
  {
    endpointPath: "/api/v3/x402/onchain/search/pools",
    endpointName: "Onchain search pools",
    workflowLabel: "pool discovery",
  },
  {
    endpointPath:
      "/api/v3/x402/onchain/simple/networks/base/token_price/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    endpointName: "Onchain token price",
    workflowLabel: "token pricing",
  },
  {
    endpointPath: "/api/v3/x402/onchain/networks/base/trending_pools",
    endpointName: "Trending pools",
    workflowLabel: "market monitoring",
  },
  {
    endpointPath:
      "/api/v3/x402/onchain/networks/base/tokens/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    endpointName: "Onchain token details",
    workflowLabel: "token enrichment",
  },
  {
    endpointPath: "/api/v3/x402/simple/price",
    endpointName: "Simple price",
    workflowLabel: "price lookup",
  },
] as const;

type CliOptions = {
  network: string;
  asset: string;
  payTo: string;
  providerId: string;
  resource: string;
  limit: number;
  pageSize: number;
  transactionOutputPath: string;
  attributionOutputPath: string;
  bitqueryToken?: string;
  bitqueryEndpoint?: string;
  bitqueryFetch?: FetchLike;
  now?: () => Date;
  timeWindow: {
    from: string;
    to?: string;
  };
};

type RunResult = {
  transactions: RealTransactionFixture;
  attribution: MockEndpointAttributionFixture;
  transactionOutputPath: string;
  attributionOutputPath: string;
};

const parseArg = (index: number, args: string[]): string | undefined => args[index + 1];

const parsePositiveInteger = (value: string | undefined, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const parseIso = (value: string | undefined, name: string): string => {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO datetime`);
  return new Date(value).toISOString();
};

export const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    network: "base",
    asset: "USDC",
    payTo: DEFAULT_PAY_TO,
    providerId: "coingecko",
    resource: DEFAULT_RESOURCE,
    limit: 5000,
    pageSize: 100,
    transactionOutputPath:
      process.env.COINGECKO_TRANSACTIONS_OUTPUT_PATH ?? DEFAULT_TRANSACTION_OUTPUT,
    attributionOutputPath:
      process.env.COINGECKO_ATTRIBUTION_OUTPUT_PATH ?? DEFAULT_ATTRIBUTION_OUTPUT,
    bitqueryToken: process.env.BITQUERY_TOKEN,
    timeWindow: {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-04-29T23:59:59.000Z",
    },
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--network") options.network = parseArg(index++, argv) ?? options.network;
    else if (arg === "--asset") options.asset = parseArg(index++, argv) ?? options.asset;
    else if (arg === "--pay-to") options.payTo = parseArg(index++, argv) ?? options.payTo;
    else if (arg === "--provider-id")
      options.providerId = parseArg(index++, argv) ?? options.providerId;
    else if (arg === "--resource") options.resource = parseArg(index++, argv) ?? options.resource;
    else if (arg === "--limit")
      options.limit = parsePositiveInteger(parseArg(index++, argv), "--limit");
    else if (arg === "--page-size") {
      options.pageSize = parsePositiveInteger(parseArg(index++, argv), "--page-size");
    } else if (arg === "--transactions-output") {
      options.transactionOutputPath = parseArg(index++, argv) ?? options.transactionOutputPath;
    } else if (arg === "--attribution-output") {
      options.attributionOutputPath = parseArg(index++, argv) ?? options.attributionOutputPath;
    } else if (arg === "--bitquery-endpoint") {
      options.bitqueryEndpoint = parseArg(index++, argv);
    } else if (arg === "--from") {
      options.timeWindow = {
        ...options.timeWindow,
        from: parseIso(parseArg(index++, argv), "--from"),
      };
    } else if (arg === "--to") {
      options.timeWindow = { ...options.timeWindow, to: parseIso(parseArg(index++, argv), "--to") };
    }
  }

  return options;
};

const resolveBitqueryToken = (token: string | undefined) => {
  if (!token || token.trim().length === 0) {
    throw new Error("BITQUERY_TOKEN is required for CoinGecko transaction capture");
  }
  return token;
};

const uniqueTransfersByTxHash = (transfers: BitqueryTransferFact[]): BitqueryTransferFact[] => {
  const seen = new Set<string>();
  const uniqueTransfers: BitqueryTransferFact[] = [];
  for (const transfer of transfers) {
    if (seen.has(transfer.txHash)) continue;
    seen.add(transfer.txHash);
    uniqueTransfers.push(transfer);
  }
  return uniqueTransfers;
};

const endpointIndexForTxHash = (txHash: string) => {
  let hash = 0;
  for (const character of txHash.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % COINGECKO_X402_ENDPOINTS.length;
};

const buildTransactionFixture = (
  options: CliOptions,
  transfers: BitqueryTransferFact[],
  generatedAt: string,
): RealTransactionFixture => {
  const uniqueTransfers = uniqueTransfersByTxHash(transfers);
  return validateRealTransactionFixture({
    generatedAt,
    providerId: options.providerId,
    resource: options.resource,
    metadata: {
      requestedLimit: options.limit,
      capturedCount: uniqueTransfers.length,
      timeWindow: options.timeWindow,
      source: {
        sourceKind: "bitquery",
        sourceName: "bitquery-graphql",
        sourceUrl: options.bitqueryEndpoint ?? "https://streaming.bitquery.io/graphql",
        sourceId: `bitquery:${options.network}:${options.asset}:${options.payTo.toLowerCase()}`,
        fetchedAt: generatedAt,
      },
    },
    facts: uniqueTransfers.map((transfer) => ({
      txHash: transfer.txHash,
      payerWallet: transfer.sender,
      payTo: transfer.recipient,
      amount: transfer.amountAtomic,
      asset: options.asset,
      network: options.network,
      timestamp: transfer.blockTimestamp,
      blockNumber: transfer.blockNumber,
      provenance: "onchain_fact",
    })),
  });
};

export const buildMockAttributionFixture = (
  transactions: RealTransactionFixture,
): MockEndpointAttributionFixture =>
  validateMockEndpointAttributionFixture({
    generatedAt: transactions.generatedAt,
    source: {
      sourceKind: "derived",
      sourceName: "phase-b-demo-mock-attribution",
      sourceId: "mock:x402-coingecko-endpoint-attribution",
      fetchedAt: transactions.generatedAt,
    },
    items: transactions.facts.map((fact) => {
      const endpoint = COINGECKO_X402_ENDPOINTS[endpointIndexForTxHash(fact.txHash)];
      return {
        txHash: fact.txHash,
        ...endpoint,
        requestMethod: "GET",
        provenance: {
          endpointPath: "demo_label",
          endpointName: "demo_label",
          workflowLabel: "future_sdk_field",
          requestMethod: "demo_label",
        },
        reasons: [
          {
            provenance: "demo_label",
            label: "deterministic mock endpoint attribution",
            description:
              "Endpoint attribution is assigned deterministically for Phase B demo projection and is not inferred from onchain data.",
            sourceFields: ["txHash"],
          },
        ],
      };
    }),
  });

export const runCoingeckoTransactionCapture = async (
  options: Partial<CliOptions> = {},
): Promise<RunResult> => {
  const parsed = {
    ...parseArgs([]),
    ...options,
  };
  const generatedAt = (parsed.now?.() ?? new Date()).toISOString();
  const transfers = await fetchPaymentTransfersByPayTo({
    network: parsed.network,
    asset: parsed.asset,
    payTo: parsed.payTo,
    token: resolveBitqueryToken(parsed.bitqueryToken),
    endpoint: parsed.bitqueryEndpoint,
    fetchFn: parsed.bitqueryFetch,
    limit: parsed.limit,
    pageSize: parsed.pageSize,
    timeWindow: parsed.timeWindow,
  });
  const transactions = buildTransactionFixture(parsed, transfers, generatedAt);
  const attribution = buildMockAttributionFixture(transactions);

  writeAtomically(parsed.transactionOutputPath, `${JSON.stringify(transactions, null, 2)}\n`);
  writeAtomically(parsed.attributionOutputPath, `${JSON.stringify(attribution, null, 2)}\n`);

  return {
    transactions,
    attribution,
    transactionOutputPath: parsed.transactionOutputPath,
    attributionOutputPath: parsed.attributionOutputPath,
  };
};

const main = async () => {
  const result = await runCoingeckoTransactionCapture(parseArgs(Bun.argv.slice(2)));
  console.log(
    JSON.stringify({
      transactionOutputPath: result.transactionOutputPath,
      attributionOutputPath: result.attributionOutputPath,
      capturedCount: result.transactions.metadata.capturedCount,
      attributionCount: result.attribution.items.length,
    }),
  );
};

if (import.meta.main) {
  await main();
}
