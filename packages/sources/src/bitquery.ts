import {
  BASE_USDC_ASSET,
  BASE_USDC_CONTRACT,
  type BitqueryAggregate,
  type CdpPaymentOption,
  SourceKind,
  SourceProvenanceSchema,
  normalizeAsset,
  normalizeNetwork,
  normalizePayTo,
  paymentIdentityKey,
  zeroBitqueryAggregate,
} from "contracts";
import { z } from "zod";
import type { FetchLike } from "./index";

const DEFAULT_BITQUERY_ENDPOINT = "https://streaming.bitquery.io/graphql";
const TOKEN_DECIMALS = 6;

const BitqueryResponseSchema = z
  .object({
    errors: z.array(z.object({ message: z.string().optional() }).passthrough()).optional(),
    data: z
      .object({
        aggregates: z
          .array(
            z
              .object({
                network: z.string().min(1),
                asset: z.string().min(1),
                payTo: z.string().min(1),
                txCount: z.union([z.string(), z.number()]).optional(),
                senderCount: z.union([z.string(), z.number()]).optional(),
                volume: z.union([z.string(), z.number()]).optional(),
                latest: z
                  .object({
                    txHash: z.string().min(1),
                    sender: z.string().min(1),
                    recipient: z.string().min(1),
                    amountAtomic: z.union([z.string(), z.number()]),
                    blockTimestamp: z.string().datetime().optional(),
                    blockNumber: z.string().min(1).optional(),
                  })
                  .optional(),
              })
              .passthrough(),
          )
          .default([]),
        EVM: z
          .object({
            byRecipient: z.array(z.unknown()).default([]),
            latestByRecipient: z.array(z.unknown()).default([]),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const toIntegerString = (value: string | number | undefined, label: string): string => {
  if (value == null) return "0";
  const text = `${value}`;
  if (!/^\d+$/.test(text)) {
    throw new Error(`bitquery ${label} must be a non-negative integer string`);
  }
  return text.replace(/^0+(?=\d)/, "");
};

const decimalToAtomic = (value: string | number | undefined, decimals = 6): string => {
  if (value == null) return "0";
  const text = `${value}`;
  if (/^\d+$/.test(text)) return `${text}${"0".repeat(decimals)}`.replace(/^0+(?=\d)/, "");
  const match = /^(\d+)\.(\d+)$/.exec(text);
  if (!match) throw new Error("bitquery volume must be a decimal or integer string");
  const [, whole, fraction] = match;
  return `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(/^0+(?=\d)/, "");
};

const toNetworkAggregateKey = paymentIdentityKey;

const normalizeAggregate = (row: {
  network: string;
  asset: string;
  payTo: string;
  txCount: string | number | undefined;
  senderCount: string | number | undefined;
  volume: string | number | undefined;
  latest?: {
    txHash: string;
    sender: string;
    recipient: string;
    amountAtomic: string | number;
    blockTimestamp?: string;
    blockNumber?: string;
  };
  provenanceSourceName: string;
}): BitqueryAggregate => {
  const parsed = SourceProvenanceSchema.parse({
    sourceKind: "bitquery" as SourceKind,
    sourceName: row.provenanceSourceName,
    sourceUrl: DEFAULT_BITQUERY_ENDPOINT,
    sourceId: `bitquery:${normalizeNetwork(row.network)}:${normalizeAsset(row.asset)}:${normalizePayTo(row.payTo)}`,
    fetchedAt: new Date().toISOString(),
  });
  return {
    network: normalizeNetwork(row.network),
    asset: normalizeAsset(row.asset),
    payTo: normalizePayTo(row.payTo),
    transactionCount: Number(toIntegerString(row.txCount, "txCount")),
    uniqueSenderCount: Number(toIntegerString(row.senderCount, "senderCount")),
    totalVolumeAtomic: decimalToAtomic(row.volume),
    provenance: parsed,
    latestTransfer: row.latest
      ? {
          txHash: row.latest.txHash,
          sender: row.latest.sender,
          recipient: row.latest.recipient,
          amountAtomic: decimalToAtomic(row.latest.amountAtomic, TOKEN_DECIMALS),
          blockTimestamp: row.latest.blockTimestamp,
          blockNumber: row.latest.blockNumber,
        }
      : undefined,
  };
};

export type BitqueryFetchOptions = {
  network: string;
  asset: string;
  paymentOptions: CdpPaymentOption[];
  token?: string;
  endpoint?: string;
  fetchFn?: FetchLike;
  chunkSize?: number;
  timeWindow?: {
    from?: string;
    to?: string;
  };
};

const resolveToken = (options: { token?: string }) => {
  const token = options.token ?? process.env.BITQUERY_TOKEN;
  if (!token || token.trim().length === 0) {
    throw new Error("BITQUERY_TOKEN is required for Bitquery snapshots");
  }
  return token;
};

const buildTimeFilter = (timeWindow?: { from?: string; to?: string }) => {
  const parts = [
    timeWindow?.from ? `since: "${timeWindow.from}"` : null,
    timeWindow?.to ? `till: "${timeWindow.to}"` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `Block: {Time: {${parts.join(", ")}}}` : "";
};

export const buildBaseUsdcAggregateQuery = (timeWindow?: { from?: string; to?: string }) => {
  const timeFilter = buildTimeFilter(timeWindow);
  const filterPrefix = timeFilter ? `${timeFilter}, ` : "";
  return `
query BaseUsdcTransfersByPayTo($payTos: [String!]) {
  EVM(dataset: combined, network: base) {
    byRecipient: Transfers(
      where: {${filterPrefix}Transfer: {Receiver: {in: $payTos}, Currency: {SmartContract: {is: "${BASE_USDC_CONTRACT}"}}}}
      limit: {count: 10000}
    ) {
      Transfer { Receiver }
      txCount: count(distinct: Transaction_Hash)
      uniqueSenders: count(distinct: Transfer_Sender)
      volumeUSDC: sum(of: Transfer_Amount)
    }
    latestByRecipient: Transfers(
      where: {${filterPrefix}Transfer: {Receiver: {in: $payTos}, Currency: {SmartContract: {is: "${BASE_USDC_CONTRACT}"}}}}
      orderBy: {descending: Block_Time}
      limitBy: {by: Transfer_Receiver, count: 1}
      limit: {count: 10000}
    ) {
      Transfer { Receiver Sender Amount }
      Block { Time Number }
      Transaction { Hash }
    }
  }
}`;
};

const readPath = (value: unknown, path: string[]): unknown => {
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const normalizeBitqueryRows = (payload: z.infer<typeof BitqueryResponseSchema>) => {
  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message ?? "unknown error").join("; ");
    throw new Error(`Bitquery GraphQL error: ${message}`);
  }
  if (!payload.data) throw new Error("Bitquery response missing data");
  if (payload.data.aggregates.length > 0) return payload.data.aggregates;

  const latestByPayTo = new Map<string, unknown>();
  for (const latest of payload.data.EVM?.latestByRecipient ?? []) {
    const receiver = readPath(latest, ["Transfer", "Receiver"]);
    if (typeof receiver === "string") latestByPayTo.set(receiver.toLowerCase(), latest);
  }

  return (payload.data.EVM?.byRecipient ?? []).map((row) => {
    const payTo = readPath(row, ["Transfer", "Receiver"]);
    if (typeof payTo !== "string") throw new Error("Bitquery aggregate missing receiver");
    const latest = latestByPayTo.get(payTo.toLowerCase());
    return {
      network: "base",
      asset: BASE_USDC_ASSET,
      payTo: normalizePayTo(payTo),
      txCount: readPath(row, ["txCount"]) as string | number | undefined,
      senderCount: readPath(row, ["uniqueSenders"]) as string | number | undefined,
      volume: readPath(row, ["volumeUSDC"]) as string | number | undefined,
      latest: latest
        ? {
            txHash: String(readPath(latest, ["Transaction", "Hash"])),
            sender: String(readPath(latest, ["Transfer", "Sender"])),
            recipient: payTo,
            amountAtomic: readPath(latest, ["Transfer", "Amount"]) as string | number,
            blockTimestamp: readPath(latest, ["Block", "Time"]) as string | undefined,
            blockNumber: String(readPath(latest, ["Block", "Number"]) ?? ""),
          }
        : undefined,
    };
  });
};

const toChunk = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    chunks.push(items.slice(start, start + chunkSize));
  }
  return chunks;
};

export const fetchBitqueryBaseUsdcAggregates = async (
  options: BitqueryFetchOptions,
): Promise<BitqueryAggregate[]> => {
  if (normalizeNetwork(options.network) !== "base" || normalizeAsset(options.asset) !== BASE_USDC_ASSET) {
    throw new Error("Bitquery aggregate fetching currently supports only Base USDC");
  }
  const token = resolveToken(options);
  const endpoint = options.endpoint ?? DEFAULT_BITQUERY_ENDPOINT;
  const fetchFn: FetchLike = options.fetchFn ?? ((input, init) => fetch(input, init));
  const chunkSize = options.chunkSize ?? 20;
  const seen = new Map<string, BitqueryAggregate>();

  const paymentKeys = options.paymentOptions.map((option) => ({
    network: normalizeNetwork(options.network ?? option.network),
    asset: normalizeAsset(options.asset ?? option.asset),
    payTo: normalizePayTo(option.payTo),
    provenanceSourceName: "bitquery-graphql",
  }));

  for (const chunk of toChunk(paymentKeys, chunkSize)) {
    const body = {
      query: buildBaseUsdcAggregateQuery(options.timeWindow),
      variables: { payTos: chunk.map((item) => item.payTo) },
    };
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Bitquery request failed: ${response.status}`);
    const payload = await response.json();
    const parsed = BitqueryResponseSchema.parse(payload);
    for (const aggregate of normalizeBitqueryRows(parsed)) {
      seen.set(
        toNetworkAggregateKey({
          network: normalizeNetwork(aggregate.network),
          asset: normalizeAsset(aggregate.asset),
          payTo: normalizePayTo(aggregate.payTo),
        }),
        {
          ...normalizeAggregate({
            network: aggregate.network,
            asset: aggregate.asset,
            payTo: aggregate.payTo,
          txCount: aggregate.txCount,
          senderCount: aggregate.senderCount,
          volume: aggregate.volume,
          latest: aggregate.latest,
          provenanceSourceName: "bitquery-graphql",
          }),
          timeWindow: options.timeWindow,
        },
      );
    }
  }

  const requested = paymentKeys.map((key) => {
    const normalizedPayTo = normalizePayTo(key.payTo);
    const matched = seen.get(toNetworkAggregateKey({ ...key, payTo: normalizedPayTo }));
    if (matched) return matched;
    return {
      ...zeroBitqueryAggregate({
        network: key.network,
        asset: key.asset,
        payTo: key.payTo,
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
          sourceUrl: endpoint,
        },
      }),
      timeWindow: options.timeWindow,
    };
  });

  return requested;
};
