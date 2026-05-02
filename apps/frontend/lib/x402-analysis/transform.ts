import type {
  EndpointMasterRow,
  SankeyFlowDailyRow,
  X402CategoryDefinition,
  X402MetricMode,
  X402RequestEvent,
} from "./types";
import { selectRepresentativeEndpointSequenceRows } from "./endpoint-sequence";

type SankeyNodeLayer = "left" | "mid" | "right";

export type X402SankeyPatternId =
  | "intent_intermediary_target_category"
  | "endpoint_sequence"
  | "macro_route_quality";

export type X402SankeyFlowRow = {
  left_label: string;
  middle_label: string;
  right_label: string;
  left_detail?: string;
  middle_detail?: string;
  right_detail?: string;
  flow_count: number;
  paid_count: number;
  settled_usdc: number;
  success_rate: number;
  p95_latency_ms: number;
  error_rate: number;
  network: string;
};

export type X402SankeyChartModel = {
  id: X402SankeyPatternId;
  eyebrow: string;
  title: string;
  description: string;
  layer_labels: {
    left: string;
    mid: string;
    right: string;
  };
  layer_order?: Partial<Record<SankeyNodeLayer, readonly string[]>>;
  flows: X402SankeyFlowRow[];
};

export type X402SankeyNode = {
  id: string;
  label: string;
  layer: SankeyNodeLayer;
  total: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type X402SankeyLink = {
  id: string;
  segment: "left_mid" | "mid_right";
  left_label: string;
  middle_label: string;
  right_label: string;
  left_detail?: string;
  middle_detail?: string;
  right_detail?: string;
  sourceNodeId: string;
  targetNodeId: string;
  value: number;
  flow_count: number;
  paid_count: number;
  settled_usdc: number;
  success_rate: number;
  p95_latency_ms: number;
  error_rate: number;
  network: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  path: string;
};

export type X402IntermediarySummaryRow = {
  api_intermediary: string;
  flow_count: number;
  paid_count: number;
  settled_usdc: number;
  success_rate: number;
  p95_latency_ms: number;
  error_rate: number;
  network: string;
};

export type X402AnalysisViewModel = {
  category_definitions: X402CategoryDefinition[];
  endpoint_master: EndpointMasterRow[];
  request_events_sample: X402RequestEvent[];
  sankey_flows_daily: SankeyFlowDailyRow[];
  sankey_flows: SankeyFlowDailyRow[];
  sankey_patterns: X402SankeyChartModel[];
  intermediary_summary: X402IntermediarySummaryRow[];
  period_label: string;
  totals: {
    flow_count: number;
    paid_count: number;
    settled_usdc: number;
    success_rate: number;
    p95_latency_ms: number;
    error_rate: number;
  };
};

type SankeyNodeSpec = {
  label: string;
  layer: SankeyNodeLayer;
  order: number;
  width: number;
};

type EndpointDisplay = {
  label: string;
  detail: string;
};

const FIXTURE_STYLE_CATEGORY_ORDER = [
  "Market data",
  "Signal lookup",
  "AI inference",
  "DEX execution & alerts",
] as const;
const INTERMEDIARY_ORDER = [
  "PayRouter A",
  "PayRouter B",
  "DataBridge X",
  "AgentAPI Hub",
  "Commerce Facilitator",
] as const;

const MIN_NODE_HEIGHT = 28;
const NODE_GAP = 18;
const TOP_PADDING = 72;
const BOTTOM_PADDING = 40;
const SIDE_PADDING = 56;
const MIN_LAYER_WIDTH = 112;
const MAX_LAYER_WIDTH = 188;

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDateRange(rows: SankeyFlowDailyRow[]): string {
  if (rows.length === 0) return "No data";
  const [first] = rows;
  const last = rows[rows.length - 1];
  return `${first.date} to ${last.date}`;
}

function metricValue(row: X402SankeyFlowRow, metric: X402MetricMode): number {
  return metric === "flow_count" ? row.flow_count : row.settled_usdc;
}

function buildNodeId(layer: SankeyNodeLayer, label: string): string {
  return `${layer}:${label}`;
}

function buildAggregatedDailyRows(rows: SankeyFlowDailyRow[]): SankeyFlowDailyRow[] {
  const grouped = new Map<string, SankeyFlowDailyRow[]>();
  for (const row of rows) {
    const key = `${row.from_category}|${row.api_intermediary}|${row.to_category}`;
    const current = grouped.get(key);
    if (current) current.push(row);
    else grouped.set(key, [row]);
  }

  return Array.from(grouped.values()).map((group) => {
    const first = group[0];
    if (!first) {
      throw new Error("Expected at least one sankey row.");
    }
    const totalFlowCount = sum(group.map((row) => row.flow_count));
    const totalPaidCount = sum(group.map((row) => row.paid_count));
    const totalSettledUsdc = sum(group.map((row) => row.settled_usdc));
    const weightedSuccessRate =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.success_rate * row.flow_count)) / totalFlowCount;
    const weightedErrorRate =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.error_rate * row.flow_count)) / totalFlowCount;
    const weightedLatency =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.p95_latency_ms * row.flow_count)) / totalFlowCount;

    return {
      date: formatDateRange(group),
      from_category: first.from_category,
      api_intermediary: first.api_intermediary,
      to_category: first.to_category,
      flow_count: totalFlowCount,
      paid_count: totalPaidCount,
      settled_usdc: Number(totalSettledUsdc.toFixed(2)),
      success_rate: Number(weightedSuccessRate.toFixed(3)),
      p95_latency_ms: Math.round(weightedLatency),
      error_rate: Number(weightedErrorRate.toFixed(3)),
      network: first.network,
    };
  });
}

function buildIntermediarySummary(rows: SankeyFlowDailyRow[]) {
  const grouped = new Map<string, SankeyFlowDailyRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.api_intermediary);
    if (current) current.push(row);
    else grouped.set(row.api_intermediary, [row]);
  }

  return Array.from(grouped.entries())
    .map(([api_intermediary, group]) => {
      const totalFlowCount = sum(group.map((row) => row.flow_count));
      const totalPaidCount = sum(group.map((row) => row.paid_count));
      const totalSettledUsdc = sum(group.map((row) => row.settled_usdc));
      const weightedSuccessRate =
        totalFlowCount === 0
          ? 0
          : sum(group.map((row) => row.success_rate * row.flow_count)) / totalFlowCount;
      const weightedErrorRate =
        totalFlowCount === 0
          ? 0
          : sum(group.map((row) => row.error_rate * row.flow_count)) / totalFlowCount;
      const weightedLatency =
        totalFlowCount === 0
          ? 0
          : sum(group.map((row) => row.p95_latency_ms * row.flow_count)) / totalFlowCount;

      return {
        api_intermediary,
        flow_count: totalFlowCount,
        paid_count: totalPaidCount,
        settled_usdc: Number(totalSettledUsdc.toFixed(2)),
        success_rate: Number(weightedSuccessRate.toFixed(3)),
        p95_latency_ms: Math.round(weightedLatency),
        error_rate: Number(weightedErrorRate.toFixed(3)),
        network: group[0]?.network ?? "base",
      };
    })
    .sort((left, right) => {
      if (right.settled_usdc !== left.settled_usdc) return right.settled_usdc - left.settled_usdc;
      return right.flow_count - left.flow_count;
    });
}

function aggregateSankeyRows(rows: X402SankeyFlowRow[]): X402SankeyFlowRow[] {
  const grouped = new Map<string, X402SankeyFlowRow[]>();
  for (const row of rows) {
    const key = `${row.left_label}|${row.middle_label}|${row.right_label}`;
    const current = grouped.get(key);
    if (current) current.push(row);
    else grouped.set(key, [row]);
  }

  return Array.from(grouped.values()).map((group) => {
    const first = group[0];
    if (!first) {
      throw new Error("Expected at least one sankey flow row.");
    }
    const totalFlowCount = sum(group.map((row) => row.flow_count));
    const totalPaidCount = sum(group.map((row) => row.paid_count));
    const totalSettledUsdc = sum(group.map((row) => row.settled_usdc));
    const weightedSuccessRate =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.success_rate * row.flow_count)) / totalFlowCount;
    const weightedErrorRate =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.error_rate * row.flow_count)) / totalFlowCount;
    const weightedLatency =
      totalFlowCount === 0
        ? 0
        : sum(group.map((row) => row.p95_latency_ms * row.flow_count)) / totalFlowCount;

    return {
      left_label: first.left_label,
      middle_label: first.middle_label,
      right_label: first.right_label,
      left_detail: first.left_detail,
      middle_detail: first.middle_detail,
      right_detail: first.right_detail,
      flow_count: totalFlowCount,
      paid_count: totalPaidCount,
      settled_usdc: Number(totalSettledUsdc.toFixed(2)),
      success_rate: Number(weightedSuccessRate.toFixed(3)),
      p95_latency_ms: Math.round(weightedLatency),
      error_rate: Number(weightedErrorRate.toFixed(3)),
      network: first.network,
    };
  });
}

function formatEndpointLabel(endpoint: string): string {
  return endpoint.replace(/^\/v1\//, "");
}

function mockEndpointLabel(endpointMaster: EndpointMasterRow): string {
  switch (endpointMaster.endpoint_subcategory) {
    case "price_history":
      return "Price history";
    case "price_snapshot":
      return "Price snapshot";
    case "ohlcv":
      return "OHLCV candles";
    case "pool_lookup":
      return "Pool search";
    case "mempool_signal":
      return "Mempool search";
    case "orderflow_search":
      return "Orderflow search";
    case "trade_thesis":
      return "Trade thesis";
    case "risk_check":
      return "Risk check";
    case "policy_simulation":
      return "Policy simulation";
    case "dex_execution":
      return "Quote & swap";
    case "settlement":
      return "Settle & bridge";
    case "alerting":
      return "Alert messages";
    default:
      return formatEndpointLabel(endpointMaster.endpoint);
  }
}

function buildEndpointDisplayMap(endpointMaster: EndpointMasterRow[]) {
  return new Map(
    endpointMaster.map((row) => [
      row.endpoint,
      {
        label: mockEndpointLabel(row),
        detail: `${row.provider} · ${row.endpoint}`,
      } satisfies EndpointDisplay,
    ]),
  );
}

function targetEvents(requestEvents: X402RequestEvent[]) {
  return requestEvents.filter((event) => event.workflow_stage === "target");
}

function paidIndicator(event: X402RequestEvent): number {
  return event.payment_status === "failed" ? 0 : 1;
}

function settledAmount(event: X402RequestEvent): number {
  return event.payment_status === "failed" ? 0 : event.amount_usdc;
}

function successIndicator(event: X402RequestEvent): number {
  return event.payment_status === "failed" ? 0 : 1;
}

function formatIntentChartTargetCategory(event: X402RequestEvent): string {
  if (event.provider === "SignalPort" || event.endpoint.includes("/messages")) {
    return "DEX execution & alerts";
  }

  switch (event.endpoint_category) {
    case "Extract":
      return "Market data";
    case "Search":
      return "Signal lookup";
    case "Analyze":
      return "AI inference";
    case "Transact":
      return "DEX execution & alerts";
  }
}

function buildIntentIntermediaryTargetCategoryRows(requestEvents: X402RequestEvent[]) {
  return aggregateSankeyRows(
    targetEvents(requestEvents).map((event) => ({
      left_label: event.user_intent,
      middle_label: event.api_intermediary,
      right_label: formatIntentChartTargetCategory(event),
      right_detail: `${event.provider} · ${formatEndpointLabel(event.endpoint)}`,
      flow_count: 1,
      paid_count: paidIndicator(event),
      settled_usdc: settledAmount(event),
      success_rate: successIndicator(event),
      p95_latency_ms: event.latency_ms,
      error_rate: event.payment_status === "failed" ? 1 : 0,
      network: event.network,
    })),
  );
}

function buildEndpointSequenceRows(
  requestEvents: X402RequestEvent[],
  endpointDisplays: Map<string, EndpointDisplay>,
) {
  const workflows = new Map<string, X402RequestEvent[]>();
  for (const event of requestEvents) {
    const current = workflows.get(event.workflow_id);
    if (current) current.push(event);
    else workflows.set(event.workflow_id, [event]);
  }

  const sequenceRows: X402SankeyFlowRow[] = [];
  for (const events of workflows.values()) {
    const ordered = [...events].sort((left, right) => left.step_order - right.step_order);
    const beforeTarget = ordered.find((event) => event.workflow_stage === "before_target");
    const target = ordered.find((event) => event.workflow_stage === "target");
    const afterTarget = ordered.find((event) => event.workflow_stage === "after_target");
    if (!beforeTarget || !target || !afterTarget) continue;
    const beforeDisplay = endpointDisplays.get(beforeTarget.endpoint) ?? {
      label: formatEndpointLabel(beforeTarget.endpoint),
      detail: beforeTarget.endpoint,
    };
    const targetDisplay = endpointDisplays.get(target.endpoint) ?? {
      label: formatEndpointLabel(target.endpoint),
      detail: target.endpoint,
    };
    const afterDisplay = endpointDisplays.get(afterTarget.endpoint) ?? {
      label: formatEndpointLabel(afterTarget.endpoint),
      detail: afterTarget.endpoint,
    };

    sequenceRows.push({
      left_label: beforeDisplay.label,
      middle_label: targetDisplay.label,
      right_label: afterDisplay.label,
      left_detail: beforeDisplay.detail,
      middle_detail: targetDisplay.detail,
      right_detail: afterDisplay.detail,
      flow_count: 1,
      paid_count: paidIndicator(target),
      settled_usdc: settledAmount(target),
      success_rate: successIndicator(target),
      p95_latency_ms: target.latency_ms,
      error_rate: target.payment_status === "failed" ? 1 : 0,
      network: target.network,
    });
  }

  return aggregateSankeyRows(sequenceRows);
}

function labelsByLayer(rows: X402SankeyFlowRow[]) {
  return {
    left: Array.from(new Set(rows.map((row) => row.left_label))),
    mid: Array.from(new Set(rows.map((row) => row.middle_label))),
    right: Array.from(new Set(rows.map((row) => row.right_label))),
  };
}

function computeLayerWidth(labels: string[]): number {
  const estimatedWidth = Math.max(
    ...labels.map((label) => label.length * 7.1 + 28),
    MIN_LAYER_WIDTH,
  );
  return clamp(Math.round(estimatedWidth), MIN_LAYER_WIDTH, MAX_LAYER_WIDTH);
}

function sortLabels(labels: string[], preferred: readonly string[] = []): string[] {
  return [...labels].sort((left, right) => {
    const leftRank = preferred.indexOf(left);
    const rightRank = preferred.indexOf(right);
    if (leftRank !== -1 && rightRank !== -1) return leftRank - rightRank;
    if (leftRank !== -1) return -1;
    if (rightRank !== -1) return 1;
    return left.localeCompare(right);
  });
}

function buildNodeSpecs(
  rows: X402SankeyFlowRow[],
  layerOrder?: Partial<Record<SankeyNodeLayer, readonly string[]>>,
): SankeyNodeSpec[] {
  const labels = labelsByLayer(rows);
  const widths = {
    left: computeLayerWidth(labels.left),
    mid: computeLayerWidth(labels.mid),
    right: computeLayerWidth(labels.right),
  };

  return [
    ...sortLabels(labels.left, layerOrder?.left).map((label, order) => ({
      label,
      layer: "left" as const,
      order,
      width: widths.left,
    })),
    ...sortLabels(labels.mid, layerOrder?.mid).map((label, order) => ({
      label,
      layer: "mid" as const,
      order,
      width: widths.mid,
    })),
    ...sortLabels(labels.right, layerOrder?.right).map((label, order) => ({
      label,
      layer: "right" as const,
      order,
      width: widths.right,
    })),
  ];
}

function assignLayers(
  rows: X402SankeyFlowRow[],
  metric: X402MetricMode,
  width: number,
  height: number,
  layerOrder?: Partial<Record<SankeyNodeLayer, readonly string[]>>,
) {
  const nodeSpecs = buildNodeSpecs(rows, layerOrder);
  const nodes = nodeSpecs.map((spec) => ({
    id: buildNodeId(spec.layer, spec.label),
    label: spec.label,
    layer: spec.layer,
    total: 0,
    x: 0,
    y: 0,
    width: spec.width,
    height: 0,
  }));

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links: X402SankeyLink[] = [];

  for (const row of rows) {
    const value = metricValue(row, metric);
    const sourceId = buildNodeId("left", row.left_label);
    const targetId = buildNodeId("mid", row.middle_label);
    const downstreamId = buildNodeId("right", row.right_label);
    const sourceNode = byId.get(sourceId);
    const targetNode = byId.get(targetId);
    const downstreamNode = byId.get(downstreamId);
    if (!sourceNode || !targetNode || !downstreamNode) {
      throw new Error("Expected sankey nodes to exist.");
    }

    sourceNode.total += value;
    targetNode.total += value;
    downstreamNode.total += value;

    links.push(
      {
        id: `${row.left_label}|${row.middle_label}|${row.right_label}`,
        segment: "left_mid",
        left_label: row.left_label,
        middle_label: row.middle_label,
        right_label: row.right_label,
        left_detail: row.left_detail,
        middle_detail: row.middle_detail,
        right_detail: row.right_detail,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        value,
        flow_count: row.flow_count,
        paid_count: row.paid_count,
        settled_usdc: row.settled_usdc,
        success_rate: row.success_rate,
        p95_latency_ms: row.p95_latency_ms,
        error_rate: row.error_rate,
        network: row.network,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        path: "",
      },
      {
        id: `${row.left_label}|${row.middle_label}|${row.right_label}::right`,
        segment: "mid_right",
        left_label: row.left_label,
        middle_label: row.middle_label,
        right_label: row.right_label,
        left_detail: row.left_detail,
        middle_detail: row.middle_detail,
        right_detail: row.right_detail,
        sourceNodeId: targetId,
        targetNodeId: downstreamId,
        value,
        flow_count: row.flow_count,
        paid_count: row.paid_count,
        settled_usdc: row.settled_usdc,
        success_rate: row.success_rate,
        p95_latency_ms: row.p95_latency_ms,
        error_rate: row.error_rate,
        network: row.network,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        path: "",
      },
    );
  }

  const maxTotal = Math.max(...nodes.map((node) => node.total), 0);
  const hasPositiveTotals = maxTotal > 0;
  const availableVerticalSpace = height - TOP_PADDING - BOTTOM_PADDING;
  const layerNodes = {
    left: nodes.filter((node) => node.layer === "left"),
    mid: nodes.filter((node) => node.layer === "mid"),
    right: nodes.filter((node) => node.layer === "right"),
  } as const;
  const layerWidths = {
    left: Math.max(...layerNodes.left.map((node) => node.width), MIN_LAYER_WIDTH),
    mid: Math.max(...layerNodes.mid.map((node) => node.width), MIN_LAYER_WIDTH),
    right: Math.max(...layerNodes.right.map((node) => node.width), MIN_LAYER_WIDTH),
  };
  const layerX: Record<SankeyNodeLayer, number> = {
    left: SIDE_PADDING,
    mid: Math.round((width - layerWidths.mid) / 2),
    right: width - SIDE_PADDING - layerWidths.right,
  };

  function layerHeight(group: readonly X402SankeyNode[], scale: number): number {
    return (
      group.reduce((acc, node) => acc + Math.max(MIN_NODE_HEIGHT, node.total * scale), 0) +
      NODE_GAP * Math.max(group.length - 1, 0)
    );
  }

  let low = 0;
  let high = hasPositiveTotals ? Math.max(1, availableVerticalSpace / maxTotal) : 0;
  while (
    hasPositiveTotals &&
    Object.values(layerNodes).every((group) => layerHeight(group, high) <= availableVerticalSpace)
  ) {
    high *= 2;
  }

  if (hasPositiveTotals) {
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const candidate = (low + high) / 2;
      if (
        Object.values(layerNodes).every(
          (group) => layerHeight(group, candidate) <= availableVerticalSpace,
        )
      ) {
        low = candidate;
      } else {
        high = candidate;
      }
    }
  }

  const scale = low;

  for (const layer of Object.keys(layerNodes) as SankeyNodeLayer[]) {
    const group = layerNodes[layer];
    const totalHeight = layerHeight(group, scale);
    const startY = TOP_PADDING + Math.max(0, (availableVerticalSpace - totalHeight) / 2);
    let cursor = startY;
    for (const node of group) {
      node.x = layerX[layer];
      node.y = cursor;
      node.height = Math.max(MIN_NODE_HEIGHT, node.total * scale);
      cursor += node.height + NODE_GAP;
    }
  }

  const outgoingOffsets = new Map<string, number>();
  const incomingOffsets = new Map<string, number>();
  const nodeOrder = {
    left: new Map(layerNodes.left.map((node, index) => [node.id, index])),
    mid: new Map(layerNodes.mid.map((node, index) => [node.id, index])),
    right: new Map(layerNodes.right.map((node, index) => [node.id, index])),
  };

  const sortedLinks = [...links].sort((left, right) => {
    if (left.segment !== right.segment) return left.segment === "left_mid" ? -1 : 1;
    const leftSource =
      left.segment === "left_mid"
        ? (nodeOrder.left.get(left.sourceNodeId) ?? 0)
        : (nodeOrder.mid.get(left.sourceNodeId) ?? 0);
    const rightSource =
      right.segment === "left_mid"
        ? (nodeOrder.left.get(right.sourceNodeId) ?? 0)
        : (nodeOrder.mid.get(right.sourceNodeId) ?? 0);
    if (leftSource !== rightSource) return leftSource - rightSource;
    const leftTarget =
      left.segment === "left_mid"
        ? (nodeOrder.mid.get(left.targetNodeId) ?? 0)
        : (nodeOrder.right.get(left.targetNodeId) ?? 0);
    const rightTarget =
      right.segment === "left_mid"
        ? (nodeOrder.mid.get(right.targetNodeId) ?? 0)
        : (nodeOrder.right.get(right.targetNodeId) ?? 0);
    return leftTarget - rightTarget;
  });

  const totalOutgoingWidths = new Map<string, number>();
  const totalIncomingWidths = new Map<string, number>();
  for (const link of sortedLinks) {
    const widthScaled = Math.max(2, link.value * scale);
    totalOutgoingWidths.set(
      link.sourceNodeId,
      (totalOutgoingWidths.get(link.sourceNodeId) ?? 0) + widthScaled,
    );
    totalIncomingWidths.set(
      link.targetNodeId,
      (totalIncomingWidths.get(link.targetNodeId) ?? 0) + widthScaled,
    );
  }

  for (const link of sortedLinks) {
    const sourceNode = byId.get(link.sourceNodeId);
    const targetNode = byId.get(link.targetNodeId);
    if (!sourceNode || !targetNode) {
      throw new Error("Expected sankey nodes to exist.");
    }

    const widthScaled = Math.max(2, link.value * scale);
    const sourcePadding = Math.max(
      0,
      (sourceNode.height - (totalOutgoingWidths.get(sourceNode.id) ?? 0)) / 2,
    );
    const targetPadding = Math.max(
      0,
      (targetNode.height - (totalIncomingWidths.get(targetNode.id) ?? 0)) / 2,
    );
    const sourceOffset = (outgoingOffsets.get(sourceNode.id) ?? 0) + sourcePadding;
    const targetOffset = (incomingOffsets.get(targetNode.id) ?? 0) + targetPadding;
    const sourceX = sourceNode.x + sourceNode.width;
    const targetX = targetNode.x;
    const sourceY = sourceNode.y + sourceOffset + widthScaled / 2;
    const targetY = targetNode.y + targetOffset + widthScaled / 2;
    const curve = clamp(Math.round((targetX - sourceX) / 2 - 12), 52, 120);

    link.fromX = sourceX;
    link.fromY = sourceY;
    link.toX = targetX;
    link.toY = targetY;
    link.path = `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`;

    sourceNode.height = Math.max(sourceNode.height, sourceOffset + widthScaled - sourcePadding);
    targetNode.height = Math.max(targetNode.height, targetOffset + widthScaled - targetPadding);
    outgoingOffsets.set(sourceNode.id, sourceOffset + widthScaled - sourcePadding);
    incomingOffsets.set(targetNode.id, targetOffset + widthScaled - targetPadding);
  }

  return {
    nodes,
    links,
    scale,
  };
}

function layerOrderByTotals(
  rows: X402SankeyFlowRow[],
  layer: SankeyNodeLayer,
  fallback: readonly string[] = [],
) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label =
      layer === "left" ? row.left_label : layer === "mid" ? row.middle_label : row.right_label;
    totals.set(label, (totals.get(label) ?? 0) + row.flow_count);
  }

  return Array.from(totals.entries())
    .sort((left, right) => {
      const leftRank = fallback.indexOf(left[0]);
      const rightRank = fallback.indexOf(right[0]);
      if (leftRank !== -1 && rightRank !== -1 && left[1] === right[1]) return leftRank - rightRank;
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .map(([label]) => label);
}

function buildIntentIntermediaryCategoryChartModel(
  requestEvents: X402RequestEvent[],
): X402SankeyChartModel {
  const flows = buildIntentIntermediaryTargetCategoryRows(requestEvents);
  return {
    id: "intent_intermediary_target_category",
    eyebrow: "Pattern 1",
    title: "User intent → middleman → target API category",
    description:
      "Shows which DeFi-style user intents routed through each intermediary and which target API family was ultimately called.",
    layer_labels: {
      left: "Intent",
      mid: "Middleman",
      right: "Target category",
    },
    layer_order: {
      left: layerOrderByTotals(flows, "left"),
      mid: INTERMEDIARY_ORDER,
      right: FIXTURE_STYLE_CATEGORY_ORDER,
    },
    flows,
  };
}

function buildEndpointSequenceChartModel(
  requestEvents: X402RequestEvent[],
  endpointMaster: EndpointMasterRow[],
): X402SankeyChartModel {
  const endpointDisplays = buildEndpointDisplayMap(endpointMaster);
  const flows = selectRepresentativeEndpointSequenceRows(
    buildEndpointSequenceRows(requestEvents, endpointDisplays),
  );
  const endpointOrder = endpointMaster.map(
    (row) => endpointDisplays.get(row.endpoint)?.label ?? formatEndpointLabel(row.endpoint),
  );
  return {
    id: "endpoint_sequence",
    eyebrow: "Pattern 2",
    title: "Previous endpoint → target endpoint → next endpoint",
    description:
      "Shows which endpoint users hit before the target API and which endpoint they called next after the target completed.",
    layer_labels: {
      left: "Before target",
      mid: "Target endpoint",
      right: "After target",
    },
    layer_order: {
      left: endpointOrder,
      mid: endpointOrder,
      right: endpointOrder,
    },
    flows,
  };
}

export function buildX402AnalysisViewModel(args: {
  endpoint_master: EndpointMasterRow[];
  request_events: X402RequestEvent[];
  sankey_flows_daily: SankeyFlowDailyRow[];
  category_definitions: X402CategoryDefinition[];
}): X402AnalysisViewModel {
  const sankeyFlows = buildAggregatedDailyRows(args.sankey_flows_daily);
  const totals = {
    flow_count: sum(args.sankey_flows_daily.map((row) => row.flow_count)),
    paid_count: sum(args.sankey_flows_daily.map((row) => row.paid_count)),
    settled_usdc: Number(sum(args.sankey_flows_daily.map((row) => row.settled_usdc)).toFixed(2)),
    success_rate: Number(
      (
        sum(args.sankey_flows_daily.map((row) => row.success_rate * row.flow_count)) /
        Math.max(sum(args.sankey_flows_daily.map((row) => row.flow_count)), 1)
      ).toFixed(3),
    ),
    p95_latency_ms: Math.round(
      sum(args.sankey_flows_daily.map((row) => row.p95_latency_ms * row.flow_count)) /
        Math.max(sum(args.sankey_flows_daily.map((row) => row.flow_count)), 1),
    ),
    error_rate: Number(
      (
        sum(args.sankey_flows_daily.map((row) => row.error_rate * row.flow_count)) /
        Math.max(sum(args.sankey_flows_daily.map((row) => row.flow_count)), 1)
      ).toFixed(3),
    ),
  };

  return {
    category_definitions: args.category_definitions,
    endpoint_master: args.endpoint_master,
    request_events_sample: [...args.request_events]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 16),
    sankey_flows_daily: args.sankey_flows_daily,
    sankey_flows: sankeyFlows,
    sankey_patterns: [
      buildIntentIntermediaryCategoryChartModel(args.request_events),
      buildEndpointSequenceChartModel(args.request_events, args.endpoint_master),
    ],
    intermediary_summary: buildIntermediarySummary(args.sankey_flows_daily),
    period_label: formatDateRange(args.sankey_flows_daily),
    totals,
  };
}

export function buildX402SankeyLayout(
  rows: X402SankeyFlowRow[],
  metric: X402MetricMode,
  width = 1220,
  height = 560,
  layerOrder?: Partial<Record<SankeyNodeLayer, readonly string[]>>,
) {
  const aggregated = aggregateSankeyRows(rows);
  return assignLayers(aggregated, metric, width, height, layerOrder);
}
