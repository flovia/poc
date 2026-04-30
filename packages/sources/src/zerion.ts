import {
  type PortfolioSourceResult,
  SourceProvenanceSchema,
  validatePortfolioSourceResult,
} from "contracts";
import { z } from "zod";
import type { FetchLike } from "./transport";

const DEFAULT_ZERION_ENDPOINT = "https://api.zerion.io/v1";

const ZerionPortfolioResponseSchema = z
  .object({
    errors: z
      .array(z.object({ title: z.string().optional(), detail: z.string().optional() }))
      .optional(),
    data: z
      .object({
        attributes: z
          .object({
            total: z
              .object({ positions: z.union([z.string(), z.number()]).nullable().optional() })
              .optional(),
            positions_distribution_by_chain: z.record(z.string(), z.unknown()).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const ZerionPositionsResponseSchema = z
  .object({
    errors: z
      .array(z.object({ title: z.string().optional(), detail: z.string().optional() }))
      .optional(),
    data: z.array(z.unknown()).default([]),
    links: z.object({ next: z.string().nullable().optional() }).passthrough().optional(),
  })
  .passthrough();

export type ZerionPortfolioOptions = {
  address: string;
  apiKey: string;
  endpoint?: string;
  fetchFn?: FetchLike;
  currency?: string;
  positionsFilter?: "only_simple" | "only_complex" | "no_filter";
  positionLimit?: number;
};

const ensureApiKey = (apiKey: string) => {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("ZERION_API_KEY is required for Zerion portfolio capture");
  }
  return apiKey;
};

const authHeader = (apiKey: string) => `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

const urlWithParams = (base: string, path: string, params: Record<string, string>) => {
  const url = new URL(`${base.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
};

const errorMessage = (payload: { errors?: Array<{ title?: string; detail?: string }> }) =>
  payload.errors
    ?.map((error) => [error.title, error.detail].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("; ") || "Zerion source unavailable";

const toDecimalString = (value: string | number | null | undefined): string | null => {
  if (value == null) return null;
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return text;
};

const readPath = (value: unknown, path: string[]): unknown => {
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const mapPositionType = (positionType: string | null, protocolModule: string | null) => {
  const text = `${positionType ?? ""} ${protocolModule ?? ""}`.toLowerCase();
  if (text.includes("liquidity") || text.includes("pool")) return "lp" as const;
  if (text.includes("stak")) return "staking" as const;
  if (text.includes("lend") || text.includes("borrow") || text.includes("deposit"))
    return "lending" as const;
  return "other" as const;
};

const sourceCoverage = (status: "available" | "partial" | "unavailable", reason?: string) => ({
  source: "portfolio" as const,
  status,
  ...(reason ? { unavailableReason: reason } : {}),
  provenance: SourceProvenanceSchema.parse({
    sourceKind: "zerion",
    sourceName: "Zerion Portfolio API",
    sourceUrl: DEFAULT_ZERION_ENDPOINT,
    fetchedAt: new Date().toISOString(),
  }),
});

const unavailable = (reason: string): PortfolioSourceResult =>
  validatePortfolioSourceResult({
    sourceCoverage: sourceCoverage("unavailable", reason),
  });

const fetchJson = async (
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; payload: unknown }> => {
  try {
    const response = await fetchFn(url, { method: "GET", headers });
    return { ok: response.ok, status: response.status, payload: await response.json() };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: {
        errors: [
          {
            title: "Network error",
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
      },
    };
  }
};

const failurePayload = (result: { status: number; payload: unknown }) => {
  const parsed = z
    .object({ errors: z.array(z.unknown()).optional() })
    .passthrough()
    .safeParse(result.payload);
  if (parsed.success && parsed.data.errors?.length) return result.payload;
  return { errors: [{ title: result.status === 0 ? "Network error" : `HTTP ${result.status}` }] };
};

export const normalizeZerionPortfolio = (
  portfolioPayload: unknown,
  positionsPayload: unknown,
): PortfolioSourceResult => {
  const portfolio = ZerionPortfolioResponseSchema.parse(portfolioPayload);
  const positions = ZerionPositionsResponseSchema.parse(positionsPayload);
  const portfolioError = errorMessage(portfolio);
  const positionsError = errorMessage(positions);

  if (portfolio.errors?.length && positions.errors?.length) {
    return unavailable(`${portfolioError}; ${positionsError}`);
  }

  const chainDistribution = portfolio.data?.attributes?.positions_distribution_by_chain ?? {};
  const normalizedPositions = positions.data.flatMap((row) => {
    const protocol = asString(readPath(row, ["attributes", "protocol"]));
    const name = asString(readPath(row, ["attributes", "name"]));
    const network = asString(readPath(row, ["relationships", "chain", "data", "id"]));
    if (!protocol || !network) return [];
    const valueUsd = toDecimalString(
      readPath(row, ["attributes", "value"]) as string | number | null,
    );
    const protocolModule = asString(readPath(row, ["attributes", "protocol_module"]));
    const positionType = asString(readPath(row, ["attributes", "position_type"]));
    return [
      {
        protocol,
        positionType: mapPositionType(positionType, protocolModule),
        valueUsd,
        network,
        evidence: [
          {
            provenance: "onchain_fact" as const,
            label: "Zerion portfolio position",
            description: name ?? protocol,
            sourceFields: ["protocol", "position_type", "value", "chain"],
          },
        ],
        reasons: [
          {
            provenance: "onchain_fact" as const,
            label: "Zerion returned wallet position fact",
          },
        ],
      },
    ];
  });

  const hasNextPage = Boolean(positions.links?.next);
  const status =
    portfolio.errors?.length || positions.errors?.length || hasNextPage ? "partial" : "available";
  const reason =
    status === "partial"
      ? [
          portfolio.errors?.length ? portfolioError : null,
          positions.errors?.length ? positionsError : null,
        ]
          .filter(Boolean)
          .join("; ") || "Zerion positions pagination not fully captured"
      : undefined;
  return validatePortfolioSourceResult({
    summary: {
      totalValueUsd: toDecimalString(portfolio.data?.attributes?.total?.positions),
      tokenCount: normalizedPositions.length,
      chains: Object.keys(chainDistribution),
    },
    positions: normalizedPositions,
    sourceCoverage: sourceCoverage(status, reason),
  });
};

export const fetchZerionPortfolio = async (
  options: ZerionPortfolioOptions,
): Promise<PortfolioSourceResult> => {
  const apiKey = ensureApiKey(options.apiKey);
  const endpoint = options.endpoint ?? DEFAULT_ZERION_ENDPOINT;
  const fetchFn: FetchLike = options.fetchFn ?? ((input, init) => fetch(input, init));
  const headers = { accept: "application/json", authorization: authHeader(apiKey) };
  const common = {
    currency: options.currency ?? "usd",
    "filter[positions]": options.positionsFilter ?? "only_complex",
  };

  const portfolioUrl = urlWithParams(endpoint, `/wallets/${options.address}/portfolio`, {
    currency: options.currency ?? "usd",
  });
  const positionsUrl = urlWithParams(endpoint, `/wallets/${options.address}/positions/`, {
    ...common,
    "page[size]": String(options.positionLimit ?? 50),
    "filter[trash]": "only_non_trash",
    sort: "-value",
  });

  const [portfolioResponse, positionsResponse] = await Promise.all([
    fetchJson(fetchFn, portfolioUrl, headers),
    fetchJson(fetchFn, positionsUrl, headers),
  ]);

  if (!portfolioResponse.ok && !positionsResponse.ok) {
    return unavailable(
      `Zerion request failed: ${portfolioResponse.status}; ${positionsResponse.status}`,
    );
  }

  return normalizeZerionPortfolio(
    portfolioResponse.ok ? portfolioResponse.payload : failurePayload(portfolioResponse),
    positionsResponse.ok ? positionsResponse.payload : failurePayload(positionsResponse),
  );
};
