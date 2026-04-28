import type { BffReadService } from "./services/read-service";

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
  "/health",
  "/summary",
  "/observations",
  "/attribution-candidates",
  "/metrics/daily",
  "/wallets/payers",
  "/wallets/recipients",
  "/wallets/relayers",
  "/wallet-usage-graph",
]);

const mutationRoutes = new Set(["/ingest/rpc-tx", "/ingest/rpc-range", "/score", "/aggregate"]);

export const createBffHandler = (service: BffReadService) => (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method !== "GET") {
    if (readonlyRoutes.has(path) || mutationRoutes.has(path)) {
      return json(
        {
          error: "method_not_allowed",
          message: "The BFF is read-only and only supports GET for read endpoints.",
        },
        { status: 405, headers: { allow: "GET" } },
      );
    }

    return notFound(path);
  }

  switch (path) {
    case "/health":
      return json({ status: "ok", service: "flovia-bff" });
    case "/summary":
      return json(service.getSummary());
    case "/observations":
      return json(service.listObservations());
    case "/attribution-candidates":
      return json(service.listAttributionCandidates());
    case "/metrics/daily":
      return json(service.listDailyMetrics());
    case "/wallets/payers":
      return json(service.listPayerWallets());
    case "/wallets/recipients":
      return json(service.listRecipientWallets());
    case "/wallets/relayers":
      return json(service.listRelayerWallets());
    case "/wallet-usage-graph":
      return json(service.getWalletUsageGraph());
    default:
      return notFound(path);
  }
};

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
