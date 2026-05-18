export const readonlyRoutes = new Set([
  "/",
  "/health",
  "/providers",
  "/customers",
  "/wallet-usage-graph",
  "/analytics/services/coingecko/summary",
  "/analytics/services/comparison",
  "/analytics/services/quadrants",
  "/analytics/routes/summary",
  "/analytics/routes/sankey",
]);

export type CustomerRouteKind =
  | "profile"
  | "intelligence"
  | "upsellMetrics"
  | "upsellExplanation"
  | "workflowIntent";

export type CustomerRouteMatch = {
  kind: CustomerRouteKind;
  address: string;
};

const customerRoutePatterns: Array<[CustomerRouteKind, RegExp]> = [
  ["profile", /^\/customers\/([^/]+)\/profile$/],
  ["intelligence", /^\/customers\/([^/]+)\/intelligence$/],
  ["upsellMetrics", /^\/customers\/([^/]+)\/llm\/upsell-metrics$/],
  ["upsellExplanation", /^\/customers\/([^/]+)\/llm\/upsell-explanation$/],
  ["workflowIntent", /^\/customers\/([^/]+)\/llm\/workflow-intent$/],
];

export const normalizePath = (url: URL) => url.pathname.replace(/\/$/, "") || "/";

export const matchCustomerRoute = (path: string): CustomerRouteMatch | null => {
  for (const [kind, pattern] of customerRoutePatterns) {
    const match = path.match(pattern);
    if (match?.[1]) return { kind, address: match[1] };
  }
  return null;
};
