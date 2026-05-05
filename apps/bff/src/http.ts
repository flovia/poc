import { type BffAnalyticsDataSource, resolveAnalyticsDataSource } from "./data/analytics-source";
import { BffLlmInferenceError, type BffLlmService, resolveBffLlmService } from "./data/llm";

type JsonValue = unknown;
const GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE = "Bedrock upsell explanation inference failed.";

const json = (body: JsonValue, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });

const readonlyRoutes = new Set([
  "/",
  "/health",
  "/providers",
  "/customers",
  "/wallet-usage-graph",
  "/analytics/services/coingecko/summary",
  "/analytics/services/comparison",
  "/analytics/services/quadrants",
]);

const toProfileAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/profile$/);
  return match?.[1] ?? null;
};

const toIntelligenceAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/intelligence$/);
  return match?.[1] ?? null;
};

const toUpsellMetricsAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/llm\/upsell-metrics$/);
  return match?.[1] ?? null;
};

const toUpsellExplanationAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/llm\/upsell-explanation$/);
  return match?.[1] ?? null;
};

const methodNotAllowed = () =>
  json(
    {
      error: "method_not_allowed",
      message: "The BFF only supports GET for read endpoints.",
    },
    { status: 405, headers: { allow: "GET" } },
  );

const llmUnavailable = () =>
  json(
    {
      error: "llm_unavailable",
      message: "Bedrock upsell explanation is not configured for this environment.",
    },
    { status: 503 },
  );

const llmFailed = (error: unknown) =>
  json(
    {
      error: "llm_failed",
      message:
        error instanceof BffLlmInferenceError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE,
    },
    { status: 502 },
  );

export const createBffHandler =
  (
    dataSource:
      | BffAnalyticsDataSource
      | Promise<BffAnalyticsDataSource> = resolveAnalyticsDataSource(),
    llmService: BffLlmService | null = resolveBffLlmService(),
  ) =>
  async (request: Request) => {
    const resolvedDataSource = await dataSource;
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method !== "GET") {
      if (
        readonlyRoutes.has(path) ||
        toProfileAddress(path) !== null ||
        toIntelligenceAddress(path) !== null ||
        toUpsellMetricsAddress(path) !== null ||
        toUpsellExplanationAddress(path) !== null
      ) {
        return methodNotAllowed();
      }

      return notFound(path);
    }

    switch (path) {
      case "/":
        return json({ service: "flovia-bff", status: "ok" });
      case "/health":
        return json({ status: "ok", service: "flovia-bff" });
      case "/providers":
        return json(resolvedDataSource.providers);
      case "/customers":
        return json(resolvedDataSource.getCustomers(url.searchParams.get("payTo") ?? undefined));
      case "/wallet-usage-graph":
        return json(resolvedDataSource.walletUsageGraph);
      case "/analytics/services/coingecko/summary":
        return json(resolvedDataSource.serviceSummary);
      case "/analytics/services/comparison":
        return json(resolvedDataSource.serviceComparison);
      case "/analytics/services/quadrants":
        return json(resolvedDataSource.serviceQuadrants);
      default:
        break;
    }

    const address = toProfileAddress(path);
    if (address !== null) {
      const normalizedAddress = address.toLowerCase();
      const profile = resolvedDataSource.getCustomerProfile(normalizedAddress);

      if (!profile) {
        return notFound(path);
      }

      return json(profile);
    }

    const intelligenceAddress = toIntelligenceAddress(path);
    if (intelligenceAddress !== null) {
      const normalizedAddress = intelligenceAddress.toLowerCase();
      const intelligence = resolvedDataSource.getCustomerIntelligence(normalizedAddress);

      if (!intelligence) {
        return notFound(path);
      }

      return json(intelligence);
    }

    const upsellMetricsAddress = toUpsellMetricsAddress(path);
    if (upsellMetricsAddress !== null) {
      const normalizedAddress = upsellMetricsAddress.toLowerCase();
      const metrics = resolvedDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      return json(metrics);
    }

    const upsellExplanationAddress = toUpsellExplanationAddress(path);
    if (upsellExplanationAddress !== null) {
      const normalizedAddress = upsellExplanationAddress.toLowerCase();
      const metrics = resolvedDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      if (!llmService) {
        return llmUnavailable();
      }

      try {
        return json(await llmService.generateUpsellExplanation(metrics));
      } catch (error) {
        console.error("Bedrock upsell explanation request failed.", error);
        return llmFailed(error);
      }
    }

    return notFound(path);
  };

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
