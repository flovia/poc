import { formatAtomic, formatRatioPct } from "@/lib/format";
import { MACRO_METRICS_DEMO_DATA } from "./demo";
import { buildMacroMetrics } from "./metrics";

export type CatalogPriority = "P0" | "P1" | "P2" | "P3";

export type CatalogPage =
  | "Overview"
  | "Customer / Wallet Intelligence"
  | "Co-usage / Ecosystem"
  | "Endpoint Behavior"
  | "Growth Action"
  | "Service / Market"
  | "Reliability / Pricing"
  | "Advanced Analytics";

export type CatalogStatus = "supported" | "demo-proxy" | "needs-live-data" | "future-analytics";

export type CatalogVisualization =
  | "kpi"
  | "trend"
  | "ranked-table"
  | "histogram"
  | "recency"
  | "priority-table"
  | "cohort-heatmap"
  | "bubble-network"
  | "weighted-table"
  | "bar"
  | "stacked-bar"
  | "heatmap"
  | "lift-heatmap"
  | "flow"
  | "comparison"
  | "quadrant"
  | "scatter"
  | "retention-curve"
  | "box-plot"
  | "status-bar"
  | "forest-plot"
  | "revenue-cost-scatter"
  | "cluster-plot"
  | "coefficient-plot";

export type CatalogPreview = {
  kind:
    | "kpi"
    | "bars"
    | "table"
    | "heatmap"
    | "quadrant"
    | "flow"
    | "forest"
    | "box"
    | "scatter"
    | "cluster";
  headline: string;
  rows?: Array<{ label: string; value: string; share?: number; note?: string }>;
  flows?: Array<{ from: string; to: string; fromStep?: 0 | 1; toStep?: 1 | 2; occurrences: number }>;
  cells?: Array<{ x: string; y: string; value: number; label?: string }>;
  points?: Array<{ label: string; x: number; y: number; size?: number; note?: string }>;
};

export type CatalogMetric = {
  id: string;
  title: string;
  priority: CatalogPriority;
  page: CatalogPage;
  status: CatalogStatus;
  represents: string;
  whyItMatters: string;
  visualization: CatalogVisualization;
  caveat?: string;
  preview: CatalogPreview;
};

const macro = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

const topWalletRows = macro.spendConcentration.rankedWallets.slice(0, 4).map((wallet) => ({
  label: wallet.label,
  value: formatAtomic(wallet.spendAtomic, 6, 1),
  share: wallet.share,
}));

const serviceRows = macro.otherServiceCandidates.slice(0, 4).map((candidate) => ({
  label: candidate.serviceName,
  value: formatAtomic(candidate.sharedSpendAtomic, 6, 1),
  share: candidate.confidence,
  note: `${candidate.sharedTxCount} shared tx`,
}));

const endpointRows = macro.endpointUsage.slice(0, 5).map((row) => ({
  label: row.category.replace(/_/g, " "),
  value: `${row.txCount} tx`,
  share: row.share,
  note: row.label,
}));

const flowRows = macro.endpointFlows.slice(0, 5).map((flow) => ({
  label: `${flow.from.replace(/_/g, " ")} → ${flow.to.replace(/_/g, " ")}`,
  value: `${flow.occurrences}×`,
  share: flow.share,
}));
const sankeyFlows = macro.endpointFlows.map((flow) => ({
  from: flow.from,
  to: flow.to,
  fromStep: flow.fromStep,
  toStep: flow.toStep,
  occurrences: flow.occurrences,
}));

export const EXPECTED_CATALOG_METRIC_IDS = [
  "provider-paid-active-wallets",
  "provider-total-spend",
  "provider-paid-usage-tx-count",
  "top-wallets-by-spend",
  "observation-count-by-wallet",
  "provider-count-per-wallet",
  "last-seen",
  "upsell-opportunity",
  "repeat-wallet-rate",
  "retention-14d-proxy",
  "wallet-provider-co-usage",
  "shared-transaction-count",
  "shared-spend",
  "other-service-candidates",
  "source-intermediary-ranking",
  "source-repeat-rate",
  "endpoint-category-usage",
  "user-endpoint-category-heatmap",
  "endpoint-category-co-usage",
  "endpoint-category-flow",
  "endpoint-category-retention",
  "service-comparison",
  "service-quadrant",
  "activity-growth",
  "high-value-segment",
  "churn-risk-segment",
  "latency-by-endpoint-category",
  "error-failure-rate-by-endpoint-category",
  "spend-endpoint-diversity",
  "retention-lift-by-behavior",
  "pricing-opportunity",
  "workflow-clusters",
  "causal-ish-lift-odds-ratio",
] as const;

export const METRICS_CATALOG: CatalogMetric[] = [
  metric(
    "provider-paid-active-wallets",
    "Provider-scoped Paid Active Wallets",
    "P0",
    "Overview",
    "supported",
    "Unique wallets that actually paid this provider/API.",
    "The most important signal that x402-enabled agent/app demand is real.",
    "kpi",
    {
      kind: "kpi",
      headline: `${macro.overview.paidActiveWallets} wallets`,
      rows: [
        {
          label: "Repeat wallet rate",
          value: formatRatioPct(macro.repeatSummary.repeatWalletRate),
          share: macro.repeatSummary.repeatWalletRate,
        },
      ],
    },
  ),
  metric(
    "provider-total-spend",
    "Provider-scoped Total Spend",
    "P0",
    "Overview",
    "supported",
    "Total x402 paid amount to the provider API.",
    "Grounds revenue impact, pricing, and ROI decisions.",
    "trend",
    {
      kind: "bars",
      headline: formatAtomic(macro.overview.totalSpendAtomic, 6, 1),
      rows: [
        {
          label: "7d spend",
          value: formatAtomic(macro.overview.trend7dSpendAtomic, 6, 1),
          share: 0.72,
        },
        {
          label: "30d spend",
          value: formatAtomic(macro.overview.trend30dSpendAtomic, 6, 1),
          share: 1,
        },
      ],
    },
  ),
  metric(
    "provider-paid-usage-tx-count",
    "Provider-scoped Paid Usage / Tx Count",
    "P0",
    "Overview",
    "supported",
    "Payment events or paid API usage count.",
    "Shows whether usage frequency is growing beyond revenue spikes.",
    "trend",
    {
      kind: "bars",
      headline: `${macro.overview.paidUsageTxCount} tx`,
      rows: macro.endpointUsage.slice(0, 4).map((row) => ({
        label: row.category.replace(/_/g, " "),
        value: `${row.txCount} tx`,
        share: row.share,
      })),
    },
  ),
  metric(
    "top-wallets-by-spend",
    "Top Wallets by Spend",
    "P0",
    "Overview",
    "supported",
    "Wallets ranked by spend.",
    "Identifies whales, enterprise leads, and high-LTV candidates.",
    "ranked-table",
    { kind: "table", headline: "Top spending wallets", rows: topWalletRows },
  ),
  metric(
    "observation-count-by-wallet",
    "Observation Count by Wallet",
    "P0",
    "Customer / Wallet Intelligence",
    "supported",
    "Observed usage or payment count per wallet.",
    "Separates one-off users from repeated agent behavior.",
    "histogram",
    {
      kind: "bars",
      headline: "Repeat-heavy usage",
      rows: [
        { label: "15+ observations", value: "3 wallets", share: 0.33 },
        { label: "5–14 observations", value: "4 wallets", share: 0.44 },
        { label: "1 observation", value: "2 wallets", share: 0.22 },
      ],
    },
  ),
  metric(
    "provider-count-per-wallet",
    "Provider Count per Wallet",
    "P0",
    "Customer / Wallet Intelligence",
    "supported",
    "How many providers each wallet uses.",
    "Shows whether this API is standalone or part of a multi-API workflow.",
    "histogram",
    {
      kind: "bars",
      headline: "Multi-provider workflows",
      rows: [
        { label: "4+ providers", value: "3 wallets", share: 0.33 },
        { label: "2–3 providers", value: "4 wallets", share: 0.44 },
        { label: "1 provider", value: "2 wallets", share: 0.22 },
      ],
    },
  ),
  metric(
    "last-seen",
    "Last Seen",
    "P0",
    "Customer / Wallet Intelligence",
    "supported",
    "The latest payment timestamp per wallet.",
    "Distinguishes active customers from dormant wallets.",
    "recency",
    {
      kind: "table",
      headline: "Recent activity",
      rows: [
        { label: "Seen <7d", value: "7 wallets", share: 0.78 },
        { label: "Seen 7–14d", value: "1 wallet", share: 0.11 },
        { label: "Dormant", value: "1 wallet", share: 0.11 },
      ],
    },
  ),
  metric(
    "upsell-opportunity",
    "Upsell Opportunity",
    "P0",
    "Growth Action",
    "supported",
    "Sales priority based on spend, repeat, and recency.",
    "Helps Sales/BD prioritize which wallets to chase.",
    "priority-table",
    {
      kind: "table",
      headline: "4 recommended plays",
      rows: macro.recommendations.map((row) => ({
        label: row.title,
        value: row.priority,
        share: row.confidence,
        note: row.type,
      })),
    },
  ),
  metric(
    "repeat-wallet-rate",
    "Repeat Wallet Rate",
    "P0",
    "Customer / Wallet Intelligence",
    "supported",
    "Ratio of wallets with multiple payments.",
    "Validates durable demand rather than a temporary spike.",
    "cohort-heatmap",
    {
      kind: "heatmap",
      headline: formatRatioPct(macro.repeatSummary.repeatWalletRate),
      cells: heatmap(
        ["week 1", "week 2", "week 3"],
        ["bot", "research", "one-off"],
        [0.92, 0.78, 0.18, 0.86, 0.64, 0.12, 0.81, 0.58, 0.08],
      ),
    },
  ),
  metric(
    "retention-14d-proxy",
    "14d Retention Proxy",
    "P0",
    "Customer / Wallet Intelligence",
    "demo-proxy",
    "Wallets whose first and last payment are at least 14 days apart.",
    "A PoC continuity signal before real cohort retention exists.",
    "bar",
    {
      kind: "bars",
      headline: "67% retained proxy",
      rows: [
        { label: "14d+ span", value: "6 wallets", share: 0.67 },
        { label: "<14d span", value: "3 wallets", share: 0.33 },
      ],
    },
    "Demo proxy based on synthetic first/last spans.",
  ),
  metric(
    "wallet-provider-co-usage",
    "Wallet × Provider Co-usage",
    "P0",
    "Co-usage / Ecosystem",
    "supported",
    "Relationships between wallets and other providers used by those wallets.",
    "Finds partnership, co-marketing, and ecosystem position opportunities.",
    "bubble-network",
    {
      kind: "scatter",
      headline: "3 strong adjacent services",
      points: [
        { label: "VectorMind", x: 0.78, y: 0.82, size: 0.8 },
        { label: "RouteZero", x: 0.71, y: 0.9, size: 0.9 },
        { label: "SignalPort", x: 0.55, y: 0.42, size: 0.5 },
      ],
    },
  ),
  metric(
    "shared-transaction-count",
    "Shared Transaction Count",
    "P0",
    "Co-usage / Ecosystem",
    "supported",
    "Overlap usage count between shared wallets and providers.",
    "Shows whether overlap is accidental or a strong usage relationship.",
    "weighted-table",
    {
      kind: "table",
      headline: "Shared tx ranking",
      rows: serviceRows.map((row) => ({ ...row, value: row.note ?? row.value })),
    },
  ),
  metric(
    "shared-spend",
    "Shared Spend",
    "P0",
    "Co-usage / Ecosystem",
    "supported",
    "Spend from wallets shared with adjacent providers.",
    "Finds high-value overlap even when wallet count is small.",
    "ranked-table",
    { kind: "table", headline: "Shared spend ranking", rows: serviceRows },
  ),
  metric(
    "other-service-candidates",
    "Other Service Candidates",
    "P0",
    "Co-usage / Ecosystem",
    "supported",
    "Other x402 services likely used by the same wallets.",
    "Identifies bundle, partnership, and acquisition-motion candidates.",
    "weighted-table",
    { kind: "table", headline: "Owner-ready candidates", rows: serviceRows },
  ),
  metric(
    "source-intermediary-ranking",
    "Source / Intermediary Ranking",
    "P0",
    "Growth Action",
    "supported",
    "Channels, agent platforms, or routers bringing paid usage.",
    "Guides co-marketing and rebate decisions.",
    "bar",
    {
      kind: "bars",
      headline: "Source quality",
      rows: macro.sourceRankings.map((row) => ({
        label: row.source,
        value: formatAtomic(row.spendAtomic, 6, 1),
        share: row.repeatRate,
      })),
    },
  ),
  metric(
    "source-repeat-rate",
    "Source × Repeat Rate",
    "P0",
    "Growth Action",
    "supported",
    "Repeat rate by channel/source.",
    "Identifies high-quality distribution, not just volume.",
    "bar",
    {
      kind: "bars",
      headline: "Repeat by source",
      rows: macro.sourceRankings.map((row) => ({
        label: row.source,
        value: formatRatioPct(row.repeatRate),
        share: row.repeatRate,
      })),
    },
  ),

  metric(
    "endpoint-category-usage",
    "Endpoint Category Usage",
    "P1",
    "Endpoint Behavior",
    "supported",
    "Use ratio across CoinGecko x402 endpoint categories.",
    "Explains which market-data workflow steps agents pay for.",
    "stacked-bar",
    { kind: "bars", headline: "Category mix", rows: endpointRows },
  ),
  metric(
    "user-endpoint-category-heatmap",
    "User × Endpoint Category",
    "P1",
    "Endpoint Behavior",
    "demo-proxy",
    "Endpoint category tendencies by wallet.",
    "Makes user behavior segments intuitive.",
    "heatmap",
    {
      kind: "heatmap",
      headline: "Wallet-category intensity",
      cells: heatmap(
        ["Pool search", "Trending", "Token price", "Token detail"],
        ["Bot", "Research", "One-off"],
        [0.9, 0.62, 0.88, 0.76, 0.68, 0.92, 0.7, 0.74, 0.22, 0.08, 0.38, 0.12],
      ),
    },
    "Preview matrix from demo workflow types.",
  ),
  metric(
    "endpoint-category-co-usage",
    "Endpoint Category Co-usage",
    "P1",
    "Endpoint Behavior",
    "demo-proxy",
    "Co-usage/lift between endpoint categories.",
    "Finds bundle, package, and workflow opportunities.",
    "lift-heatmap",
    {
      kind: "heatmap",
      headline: "Lift heatmap proxy",
      cells: heatmap(
        ["Pool search", "Trending", "Simple price"],
        ["Token price", "Token detail", "Repeat"],
        [0.86, 0.79, 0.52, 0.74, 0.81, 0.58, 0.62, 0.47, 0.33],
      ),
    },
    "Directional lift, not statistical proof.",
  ),
  metric(
    "endpoint-category-flow",
    "Endpoint Category Flow",
    "P1",
    "Endpoint Behavior",
    "supported",
    "Ordered endpoint category transitions.",
    "Shows multi-step endpoint movement where any endpoint can appear at any step.",
    "flow",
    { kind: "flow", headline: "Top workflow transitions", rows: flowRows, flows: sankeyFlows },
  ),
  metric(
    "endpoint-category-retention",
    "Endpoint Category Retention",
    "P1",
    "Endpoint Behavior",
    "demo-proxy",
    "Retention by endpoint category.",
    "Identifies high-retention use cases.",
    "cohort-heatmap",
    {
      kind: "heatmap",
      headline: "Category retention proxy",
      cells: heatmap(
        ["D1", "D7", "D14"],
        ["Token price", "Token detail", "Pool search"],
        [0.96, 0.84, 0.72, 0.9, 0.78, 0.66, 0.82, 0.68, 0.55],
      ),
    },
    "Needs real cohorts for production.",
  ),
  metric(
    "service-comparison",
    "Service Comparison",
    "P1",
    "Service / Market",
    "demo-proxy",
    "Benchmark against peer x402 services.",
    "Shows where the provider sits in the market.",
    "comparison",
    {
      kind: "table",
      headline: "Peer benchmark",
      rows: [
        { label: "Northwind", value: "9 wallets", share: 0.82 },
        { label: "VectorMind", value: "7 wallets", share: 0.71 },
        { label: "RouteZero", value: "6 wallets", share: 0.64 },
      ],
    },
    "Peer rows are synthetic demo benchmarks.",
  ),
  metric(
    "service-quadrant",
    "Service Quadrant",
    "P1",
    "Service / Market",
    "demo-proxy",
    "Tx/user versus endpoint diversity.",
    "Classifies APIs as deep, broad, narrow, or shallow usage.",
    "quadrant",
    {
      kind: "quadrant",
      headline: "Depth × diversity",
      points: [
        { label: "Northwind", x: 0.72, y: 0.76, size: 0.8 },
        { label: "VectorMind", x: 0.62, y: 0.68, size: 0.7 },
        { label: "SignalPort", x: 0.45, y: 0.36, size: 0.45 },
      ],
    },
  ),
  metric(
    "activity-growth",
    "Activity Growth",
    "P1",
    "Customer / Wallet Intelligence",
    "supported",
    "Per-wallet activity growth rate.",
    "Surfaces emerging users/accounts early.",
    "scatter",
    {
      kind: "scatter",
      headline: "Growth vs spend",
      points: [
        { label: "Aster bot", x: 0.82, y: 0.86, size: 0.9 },
        { label: "Research", x: 0.62, y: 0.48, size: 0.5 },
        { label: "Trial", x: 0.3, y: 0.18, size: 0.25 },
      ],
    },
  ),
  metric(
    "high-value-segment",
    "High-value Segment",
    "P1",
    "Growth Action",
    "demo-proxy",
    "High spend, frequency, and retention users.",
    "Identifies enterprise leads and priority support targets.",
    "quadrant",
    {
      kind: "quadrant",
      headline: "High value segment",
      points: [
        { label: "Trading bots", x: 0.89, y: 0.91, size: 0.9 },
        { label: "Execution wallets", x: 0.77, y: 0.7, size: 0.75 },
        { label: "One-off", x: 0.18, y: 0.12, size: 0.2 },
      ],
    },
  ),
  metric(
    "churn-risk-segment",
    "Churn-risk Segment",
    "P1",
    "Growth Action",
    "demo-proxy",
    "Wallets that do not return after first use.",
    "Targets onboarding, discount, and follow-up actions.",
    "retention-curve",
    {
      kind: "bars",
      headline: "2 high-risk wallets",
      rows: [
        { label: "one-off lookup", value: "2 wallets", share: 0.22 },
        { label: "research stalled", value: "1 wallet", share: 0.11 },
      ],
    },
  ),

  metric(
    "latency-by-endpoint-category",
    "Latency by Endpoint Category",
    "P2",
    "Reliability / Pricing",
    "needs-live-data",
    "Response speed by endpoint type.",
    "Finds agent UX degradation and repeat-drop causes.",
    "box-plot",
    {
      kind: "box",
      headline: "Latency p50/p95 proxy",
      rows: [
        { label: "Simple price", value: "92ms / 180ms", share: 0.22 },
        { label: "Token price", value: "140ms / 260ms", share: 0.3 },
        { label: "Token detail", value: "210ms / 520ms", share: 0.44 },
      ],
    },
    "Requires live latency instrumentation.",
  ),
  metric(
    "error-failure-rate-by-endpoint-category",
    "Error / Failure Rate by Endpoint Category",
    "P2",
    "Reliability / Pricing",
    "needs-live-data",
    "API failures, payment failures, and status mix by endpoint.",
    "Identifies technical friction blocking growth.",
    "status-bar",
    {
      kind: "bars",
      headline: "Failure-rate proxy",
      rows: [
        { label: "Simple price", value: "0.4%", share: 0.04 },
        { label: "Token price", value: "0.9%", share: 0.09 },
        { label: "Token detail", value: "1.6%", share: 0.16 },
      ],
    },
    "Requires production status/error telemetry.",
  ),
  metric(
    "spend-endpoint-diversity",
    "Spend × Endpoint Diversity",
    "P2",
    "Reliability / Pricing",
    "supported",
    "Relationship between spend and usage breadth.",
    "Identifies behaviors common to high-LTV users.",
    "scatter",
    {
      kind: "scatter",
      headline: "Spend vs diversity",
      points: [
        { label: "Trading bots", x: 0.88, y: 0.82, size: 0.88 },
        { label: "Research", x: 0.52, y: 0.64, size: 0.52 },
        { label: "One-off", x: 0.12, y: 0.18, size: 0.18 },
      ],
    },
  ),
  metric(
    "retention-lift-by-behavior",
    "Retention Lift by Behavior",
    "P2",
    "Advanced Analytics",
    "future-analytics",
    "How much specific behavior appears to lift retention.",
    "Statistically indicates what product behavior to grow.",
    "forest-plot",
    {
      kind: "forest",
      headline: "Lift proxy",
      rows: [
        { label: "Price → AI → Swap", value: "+18pp", share: 0.68 },
        { label: "Webhook after swap", value: "+9pp", share: 0.54 },
        { label: "One-off price only", value: "-22pp", share: 0.22 },
      ],
    },
    "Forest plot is directional demo, not causal inference.",
  ),
  metric(
    "pricing-opportunity",
    "Pricing Opportunity",
    "P2",
    "Reliability / Pricing",
    "demo-proxy",
    "Usage, spend, cost, and retention mismatches.",
    "Guides reprice, discount, and package decisions.",
    "revenue-cost-scatter",
    {
      kind: "scatter",
      headline: "Revenue × cost",
      points: [
        { label: "AI bundle", x: 0.72, y: 0.55, size: 0.72 },
        { label: "Price-only", x: 0.44, y: 0.12, size: 0.35 },
        { label: "Swap exec", x: 0.82, y: 0.5, size: 0.8 },
      ],
    },
    "Cost data is synthetic demo data.",
  ),

  metric(
    "workflow-clusters",
    "Workflow Clusters",
    "P3",
    "Advanced Analytics",
    "future-analytics",
    "Automatic clustering of similar agent workflows.",
    "Enables advanced customer segmentation.",
    "cluster-plot",
    {
      kind: "cluster",
      headline: "3 demo clusters",
      points: [
        { label: "Trading loop", x: 0.78, y: 0.82, size: 0.7 },
        { label: "Research", x: 0.42, y: 0.66, size: 0.5 },
        { label: "One-off", x: 0.18, y: 0.24, size: 0.25 },
      ],
    },
    "UMAP/cluster positions are illustrative.",
  ),
  metric(
    "causal-ish-lift-odds-ratio",
    "Causal-ish Lift / Odds Ratio",
    "P3",
    "Advanced Analytics",
    "future-analytics",
    "Association strength between endpoint behavior and retention/spend.",
    "Moves from correlation toward actionable insight.",
    "coefficient-plot",
    {
      kind: "forest",
      headline: "Odds ratio proxy",
      rows: [
        { label: "AI after price", value: "OR 2.4", share: 0.72 },
        { label: "Swap after AI", value: "OR 1.8", share: 0.61 },
        { label: "Price-only", value: "OR 0.6", share: 0.28 },
      ],
    },
    "Requires careful causal/statistical design before production use.",
  ),
];

export type MetricsCatalogViewModel = ReturnType<typeof buildMetricsCatalog>;

export function buildMetricsCatalog(items: readonly CatalogMetric[] = METRICS_CATALOG) {
  const byPriority = groupBy(items, (item) => item.priority);
  const byPage = groupBy(items, (item) => item.page);
  return {
    items,
    byPriority,
    byPage,
    summary: {
      total: items.length,
      byPriority: countBy(items, (item) => item.priority),
      supported: items.filter((item) => item.status === "supported").length,
      demoProxy: items.filter((item) => item.status === "demo-proxy").length,
      needsLiveData: items.filter((item) => item.status === "needs-live-data").length,
      futureAnalytics: items.filter((item) => item.status === "future-analytics").length,
    },
  };
}

function metric(
  id: string,
  title: string,
  priority: CatalogPriority,
  page: CatalogPage,
  status: CatalogStatus,
  represents: string,
  whyItMatters: string,
  visualization: CatalogVisualization,
  preview: CatalogPreview,
  caveat?: string,
): CatalogMetric {
  return {
    id,
    title,
    priority,
    page,
    status,
    represents,
    whyItMatters,
    visualization,
    preview,
    caveat,
  };
}

function heatmap(xs: string[], ys: string[], values: number[]) {
  return ys.flatMap((y, yIndex) =>
    xs.map((x, xIndex) => ({ x, y, value: values[yIndex * xs.length + xIndex] ?? 0 })),
  );
}

function groupBy<T, K extends string>(items: readonly T[], keyOf: (item: T) => K): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>(
    (acc, item) => {
      const key = keyOf(item);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

function countBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, number> {
  return items.reduce<Record<K, number>>(
    (acc, item) => {
      const key = keyOf(item);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<K, number>,
  );
}
