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
  "/metrics/retention/d14",
  "/customers",
]);

const mutationRoutes = new Set(["/ingest/rpc-tx", "/ingest/rpc-range", "/score", "/aggregate"]);

export const createBffHandler = (service: BffReadService) => (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method !== "GET") {
    if (isReadonlyRoute(path) || mutationRoutes.has(path)) {
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
    case "/metrics/retention/d14":
      return json(service.getD14Retention());
    case "/customers":
      return json(service.listCustomers());
    default:
      if (path.startsWith("/customers/") && path.endsWith("/profile")) {
        const address = decodeURIComponent(path.slice("/customers/".length, -"/profile".length));
        const profile = service.getCustomerProfile(address);

        if (profile === null) {
          return json(
            {
              error: "customer_not_found",
              message: `Customer not found: ${address}`,
            },
            { status: 404 },
          );
        }

        return json(profile);
      }

      return notFound(path);
  }
};

const isReadonlyRoute = (path: string) =>
  readonlyRoutes.has(path) || (path.startsWith("/customers/") && path.endsWith("/profile"));

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
