import fs from "node:fs";
import {
  type MachinePaymentRail,
  type ProviderCatalogResponse,
  type RouteAnalyticsEvent,
  RouteAnalyticsEventSchema,
  type RouteAnalyticsSankeyResponse,
  type RouteAnalyticsSummaryResponse,
  type RouteAnalyticsVisibility,
  validateRouteAnalyticsSankeyResponse,
  validateRouteAnalyticsSummaryResponse,
} from "contracts";
import {
  DEFAULT_MACHINE_PAYMENT_ROUTES_FIXTURE_PATH,
  ROUTE_ANALYTICS_GENERATED_FROM,
} from "./analytics-data-source";

export const visibilityForRail = (rail: MachinePaymentRail): RouteAnalyticsVisibility =>
  rail === "x402"
    ? "public_onchain"
    : rail === "stripe_mpp" || rail === "hitpay_mpp"
      ? "provider_attested"
      : "first_party";

const railLabel = (rail: MachinePaymentRail): string => {
  switch (rail) {
    case "stripe_mpp":
      return "Stripe MPP";
    case "hitpay_mpp":
      return "HitPay MPP";
    case "api_key":
      return "API key";
    case "subscription":
      return "Subscription";
    case "x402":
      return "x402";
    default:
      return "Other";
  }
};

const routeIdPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const amountUsdFromProvider = (
  provider: ProviderCatalogResponse["providers"][number],
): number | undefined => {
  const asset = provider.asset.toUpperCase();
  if (asset !== "USDC" && asset !== "USDT" && asset !== "USD") return undefined;
  return Number(BigInt(provider.totalVolumeAtomic)) / 1_000_000;
};

const routeRailForProvider = (
  provider: ProviderCatalogResponse["providers"][number],
): MachinePaymentRail => {
  if (
    provider.protocol === "MPP" ||
    provider.catalogSource === "mpp_registry" ||
    provider.network.toLowerCase().includes("mpp")
  ) {
    return "other";
  }
  return "x402";
};

const loadMachinePaymentRouteFixtureEvents = (timestamp: string): RouteAnalyticsEvent[] => {
  const raw = JSON.parse(fs.readFileSync(DEFAULT_MACHINE_PAYMENT_ROUTES_FIXTURE_PATH, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("machine-payment-routes fixture must be an array of route events");
  }
  return raw.map((event) =>
    RouteAnalyticsEventSchema.parse({
      ...(event as Record<string, unknown>),
      timestamp,
    }),
  );
};

export const buildRouteAnalytics = (
  providers: ProviderCatalogResponse,
): { routeSummary: RouteAnalyticsSummaryResponse; routeSankey: RouteAnalyticsSankeyResponse } => {
  const generatedAt = providers.generatedAt;
  const providerEvents: RouteAnalyticsEvent[] = providers.providers
    .filter((provider) => provider.transactionCount > 0)
    .map((provider, index) => {
      const rail = routeRailForProvider(provider);
      const visibility = visibilityForRail(rail);
      const protocol = rail === "x402" ? "x402" : provider.protocol === "MPP" ? "mpp" : "other";
      const endpointGroup = provider.serviceName ?? provider.category ?? provider.name;
      const routePart = routeIdPart(endpointGroup);
      return {
        routeId: `route:${rail}:${routePart}:${index + 1}`,
        workflowId: `workflow:${routePart}`,
        rail,
        protocol,
        sourceRoute: index % 2 === 0 ? "Direct API client" : "MCP directory",
        sourcePlatform: index % 2 === 0 ? "direct" : "mcp-directory",
        router: rail === "x402" ? "x402 facilitator" : "MPP provider router",
        providerId: provider.serviceId ?? provider.providerId,
        endpointGroup,
        useCase: provider.useCase ?? provider.category ?? "Paid API route",
        payeeIdentity: provider.payTo,
        amountUsd: amountUsdFromProvider(provider),
        currency: provider.asset,
        status: "settled",
        visibility,
        provenance: "derived_insight",
        provenanceByField: {
          rail: rail === "x402" ? "onchain_fact" : "registry_fact",
          payeeIdentity: "onchain_fact",
        },
        timestamp: generatedAt,
        reasons: [
          {
            provenance: "derived_insight",
            label: "provider aggregate adapted to route analytics",
            description:
              "Aggregated provider/payment activity is projected as a route row; settlementRef is omitted when no transaction-level reference is available.",
          },
        ],
      } satisfies RouteAnalyticsEvent;
    });

  const demoEvents = loadMachinePaymentRouteFixtureEvents(generatedAt);

  const sampleRoutes = providerEvents.length > 0 ? [...providerEvents, ...demoEvents] : demoEvents;
  const routeCount = sampleRoutes.length;
  const workflowCount = new Set(sampleRoutes.map((route) => route.workflowId)).size;
  const paidWorkflowCount = new Set(
    sampleRoutes
      .filter((route) => route.status === "paid" || route.status === "settled")
      .map((route) => route.workflowId),
  ).size;
  const settledUsd = sampleRoutes.reduce((sum, route) => sum + (route.amountUsd ?? 0), 0);
  const successCount = sampleRoutes.filter(
    (route) => route.status === "paid" || route.status === "settled",
  ).length;

  const rails = Array.from(new Set(sampleRoutes.map((route) => route.rail))).map((rail) => {
    const routes = sampleRoutes.filter((route) => route.rail === rail);
    const paidRoutes = routes.filter(
      (route) => route.status === "paid" || route.status === "settled",
    );
    return {
      rail,
      routeCount: routes.length,
      workflowCount: new Set(routes.map((route) => route.workflowId)).size,
      paidWorkflowCount: new Set(paidRoutes.map((route) => route.workflowId)).size,
      settledUsd: routes.reduce((sum, route) => sum + (route.amountUsd ?? 0), 0),
      successRate: routes.length === 0 ? 0 : paidRoutes.length / routes.length,
      repeatUsage: Math.max(
        0,
        routes.length - new Set(routes.map((route) => route.workflowId)).size,
      ),
      visibility: visibilityForRail(rail),
    };
  });

  const routeSummary = validateRouteAnalyticsSummaryResponse({
    generatedAt,
    generatedFrom: ROUTE_ANALYTICS_GENERATED_FROM,
    routeCount,
    workflowCount,
    paidWorkflowCount,
    settledUsd,
    successRate: routeCount === 0 ? 0 : successCount / routeCount,
    repeatUsage: Math.max(0, routeCount - workflowCount),
    paymentToAccessConversion: routeCount === 0 ? 0 : successCount / routeCount,
    rails,
    sampleRoutes,
    provenance: "derived_insight",
    provenanceByField: { sampleRoutes: "derived_insight", rails: "derived_insight" },
    reasons: [
      { provenance: "derived_insight", label: "machine payment route analytics projection" },
    ],
  });

  const nodes = new Map<
    string,
    {
      id: string;
      label: string;
      layer: "source_route" | "payment_rail" | "api_workflow";
      rail?: MachinePaymentRail;
      visibility?: RouteAnalyticsVisibility;
    }
  >();
  const links = new Map<
    string,
    {
      source: string;
      target: string;
      routeCount: number;
      workflowCount: number;
      settledUsd: number;
      rail: MachinePaymentRail;
      visibility: RouteAnalyticsVisibility;
    }
  >();
  const addNode = (node: {
    id: string;
    label: string;
    layer: "source_route" | "payment_rail" | "api_workflow";
    rail?: MachinePaymentRail;
    visibility?: RouteAnalyticsVisibility;
  }) => nodes.set(node.id, node);
  const addLink = (source: string, target: string, route: RouteAnalyticsEvent) => {
    const key = `${source}->${target}:${route.rail}`;
    const existing = links.get(key);
    if (existing) {
      existing.routeCount += 1;
      existing.workflowCount += 1;
      existing.settledUsd += route.amountUsd ?? 0;
      return;
    }
    links.set(key, {
      source,
      target,
      routeCount: 1,
      workflowCount: 1,
      settledUsd: route.amountUsd ?? 0,
      rail: route.rail,
      visibility: route.visibility,
    });
  };

  for (const route of sampleRoutes) {
    const sourceId = `source:${routeIdPart(route.sourceRoute ?? "Direct API client")}`;
    const railId = `rail:${route.rail}`;
    const workflowId = `workflow:${routeIdPart(route.endpointGroup ?? route.workflowId)}`;
    addNode({
      id: sourceId,
      label: route.sourceRoute ?? "Direct API client",
      layer: "source_route",
    });
    addNode({
      id: railId,
      label: railLabel(route.rail),
      layer: "payment_rail",
      rail: route.rail,
      visibility: route.visibility,
    });
    addNode({
      id: workflowId,
      label: route.endpointGroup ?? route.workflowId,
      layer: "api_workflow",
    });
    addLink(sourceId, railId, route);
    addLink(railId, workflowId, route);
  }

  const routeSankey = validateRouteAnalyticsSankeyResponse({
    generatedAt,
    generatedFrom: ROUTE_ANALYTICS_GENERATED_FROM,
    layers: ["source_route", "payment_rail", "api_workflow"],
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values()),
    provenance: "derived_insight",
    provenanceByField: { nodes: "derived_insight", links: "derived_insight" },
    reasons: [
      {
        provenance: "derived_insight",
        label: "source route to payment rail to API workflow projection",
      },
    ],
  });

  return { routeSummary, routeSankey };
};
