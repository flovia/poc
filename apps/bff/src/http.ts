import {
  getPhaseBCustomerIntelligenceByAddress,
  getPhaseBCustomerProfileByAddress,
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./data/phase-b-demo";

type JsonValue = unknown;

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

const methodNotAllowed = () =>
  json(
    {
      error: "method_not_allowed",
      message: "The BFF only supports GET for read endpoints.",
    },
    { status: 405, headers: { allow: "GET" } },
  );

export const createBffHandler = () => (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method !== "GET") {
    if (
      readonlyRoutes.has(path) ||
      toProfileAddress(path) !== null ||
      toIntelligenceAddress(path) !== null
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
    case "/customers":
      return json(phaseBCustomerListResponse);
    case "/wallet-usage-graph":
      return json(phaseBWalletUsageGraphResponse);
    case "/analytics/services/coingecko/summary":
      return json(serviceAnalyticsSummaryResponse);
    case "/analytics/services/comparison":
      return json(serviceAnalyticsComparisonResponse);
    case "/analytics/services/quadrants":
      return json(serviceAnalyticsQuadrantResponse);
    default:
      break;
  }

  const address = toProfileAddress(path);
  if (address !== null) {
    const normalizedAddress = address.toLowerCase();
    const profile = getPhaseBCustomerProfileByAddress(normalizedAddress);

    if (!profile) {
      return notFound(path);
    }

    return json(profile);
  }

  const intelligenceAddress = toIntelligenceAddress(path);
  if (intelligenceAddress !== null) {
    const normalizedAddress = intelligenceAddress.toLowerCase();
    const intelligence = getPhaseBCustomerIntelligenceByAddress(normalizedAddress);

    if (!intelligence) {
      return notFound(path);
    }

    return json(intelligence);
  }

  return notFound(path);
};

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
