import type { MachinePaymentRail, RouteAnalyticsSummaryResponse } from "contracts";
import type { EndpointSankeyFlow } from "@/components/macro-metrics/EndpointSankey";

export type RouteSankeyView = "rail" | "router";

type SampleRouteRow = RouteAnalyticsSummaryResponse["sampleRoutes"][number];

type RouteSankeyViewCopy = {
  label: string;
  title: string;
  note: string;
  emptyMessage: string;
};

const DEMO_RAILS = new Set<MachinePaymentRail>(["stripe_mpp", "hitpay_mpp"]);

const RAIL_NODE_ORDER = ["x402", "Stripe MPP", "HitPay MPP"] as const;
const ROUTER_NODE_ORDER = ["Base", "Solana", "Tempo"] as const;
const SOURCE_NODE_ORDER = [
  "Direct",
  "Direct API client",
  "pay.sh",
  "dexter",
  "agentcash",
  "agents.market",
  "MCP directory",
] as const;

const ROUTE_SANKEY_VIEW_COPY: Record<RouteSankeyView, RouteSankeyViewCopy> = {
  rail: {
    label: "Payment Route",
    title: "Source route → Payment route → API workflow",
    note: "Built from the route analytics response rows. Wider links indicate stronger per-route settled-USD signal.",
    emptyMessage: "No route flow detected.",
  },
  router: {
    label: "Chain",
    title: "Source route → Chain → API workflow",
    note: "Built from the route analytics response rows. Chain view focuses on Base, Solana, and Tempo rows to keep the center layer symmetric.",
    emptyMessage: "No Base, Solana, or Tempo route flow detected.",
  },
};

export const ROUTE_SANKEY_VIEWS = (["rail", "router"] as const).map((value) => ({
  value,
  label: ROUTE_SANKEY_VIEW_COPY[value].label,
}));

export function getRouteSankeyViewCopy(view: RouteSankeyView): RouteSankeyViewCopy {
  return ROUTE_SANKEY_VIEW_COPY[view];
}

export function buildRouteSankeyFlows(
  summary: RouteAnalyticsSummaryResponse,
  view: RouteSankeyView,
): EndpointSankeyFlow[] {
  const selectedRoutes = [...selectSankeyRouteRows(summary, view)].sort((left, right) =>
    compareSankeyRouteRows(left, right, view),
  );
  const maxAmountUsd = Math.max(1, ...selectedRoutes.map((route) => route.amountUsd ?? 0));
  const grouped = new Map<string, EndpointSankeyFlow>();

  for (const route of selectedRoutes) {
    const source = route.sourceRoute ?? "Direct API client";
    const middle = middleNodeLabel(route, view);
    if (!middle) continue;

    const workflow = route.endpointGroup ?? route.workflowId;
    const amountScore = Math.round(((route.amountUsd ?? 0) / maxAmountUsd) * 5);
    const occurrences = Math.max(1, amountScore);

    addEndpointSankeyFlow(grouped, {
      from: source,
      to: middle,
      fromStep: 0,
      toStep: 1,
      occurrences,
      fromLabel: source,
      toLabel: middle,
    });
    addEndpointSankeyFlow(grouped, {
      from: middle,
      to: workflow,
      fromStep: 1,
      toStep: 2,
      occurrences,
      fromLabel: middle,
      toLabel: workflow,
    });
  }

  return Array.from(grouped.values());
}

function selectSankeyRouteRows(summary: RouteAnalyticsSummaryResponse, view: RouteSankeyView) {
  const machineFlowRows = summary.sampleRoutes.filter(
    (route) => route.provenance === "demo_label" && route.endpointGroup?.startsWith("/v1/"),
  );

  const selectedRows =
    machineFlowRows.length > 0
      ? machineFlowRows
      : [
        ...summary.sampleRoutes
          .filter((route) => route.rail === "x402")
          .sort((left, right) => (right.amountUsd ?? 0) - (left.amountUsd ?? 0))
          .slice(0, 8),
        ...summary.sampleRoutes.filter((route) => DEMO_RAILS.has(route.rail)),
      ].slice(0, 12);

  return view === "router"
    ? selectedRows.filter((route) => routerLabel(route) !== null)
    : selectedRows;
}

function middleNodeLabel(route: SampleRouteRow, view: RouteSankeyView): string | null {
  return view === "rail" ? railLabel(route.rail) : routerLabel(route);
}

function railLabel(rail: MachinePaymentRail): string {
  switch (rail) {
    case "stripe_mpp":
      return "Stripe MPP";
    case "hitpay_mpp":
      return "HitPay MPP";
    case "x402":
      return "x402";
    case "api_key":
      return "API key";
    case "subscription":
      return "Subscription";
    default:
      return "Other";
  }
}

function routerLabel(route: SampleRouteRow): string | null {
  if (
    route.router &&
    ROUTER_NODE_ORDER.includes(route.router as (typeof ROUTER_NODE_ORDER)[number])
  ) {
    return route.router;
  }
  return null;
}

function compareSankeyRouteRows(
  left: SampleRouteRow,
  right: SampleRouteRow,
  view: RouteSankeyView,
): number {
  const middleOrder = view === "rail" ? RAIL_NODE_ORDER : ROUTER_NODE_ORDER;
  const leftMiddle = middleNodeLabel(left, view);
  const rightMiddle = middleNodeLabel(right, view);
  const leftMiddleIndex = leftMiddle ? middleOrder.indexOf(leftMiddle as never) : -1;
  const rightMiddleIndex = rightMiddle ? middleOrder.indexOf(rightMiddle as never) : -1;

  if (leftMiddleIndex !== rightMiddleIndex) {
    return (
      (leftMiddleIndex === -1 ? 999 : leftMiddleIndex) -
      (rightMiddleIndex === -1 ? 999 : rightMiddleIndex)
    );
  }

  const leftSource = SOURCE_NODE_ORDER.indexOf((left.sourceRoute ?? "") as never);
  const rightSource = SOURCE_NODE_ORDER.indexOf((right.sourceRoute ?? "") as never);
  if (leftSource !== rightSource) {
    return (leftSource === -1 ? 999 : leftSource) - (rightSource === -1 ? 999 : rightSource);
  }

  return (right.amountUsd ?? 0) - (left.amountUsd ?? 0);
}

function addEndpointSankeyFlow(grouped: Map<string, EndpointSankeyFlow>, flow: EndpointSankeyFlow) {
  const key = `${flow.fromStep}:${flow.from}->${flow.toStep}:${flow.to}`;
  const existing = grouped.get(key);
  if (existing) {
    existing.occurrences += flow.occurrences;
    return;
  }
  grouped.set(key, { ...flow });
}
