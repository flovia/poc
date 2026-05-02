"use client";

import { ResponsiveSankey } from "@nivo/sankey";

export type EndpointSankeyFlow = {
  from: string;
  to: string;
  fromStep?: 0 | 1;
  toStep?: 1 | 2;
  occurrences: number;
  fromLabel?: string;
  toLabel?: string;
};

type EndpointSankeyProps = {
  flows: EndpointSankeyFlow[];
  compact?: boolean;
  ariaLabel?: string;
  emptyMessage?: string;
  height?: number;
  minWidth?: number;
  labelFontSize?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

type SankeyNode = { id: string; displayLabel: string; step: 0 | 1 | 2 };
type SankeyLink = { source: string; target: string; value: number };

const ENDPOINT_COLORS: Record<string, string> = {
  pool_search: "#2F5D9A",
  trending_pools: "#2C7A7B",
  simple_price: "#B45309",
  token_price: "#7B61A8",
  token_detail: "#DC2626",
};

const FALLBACK_STEP_COLORS: Record<SankeyNode["step"], string> = {
  0: "#2F5D9A",
  1: "#2C7A7B",
  2: "#B45309",
};

export function EndpointSankey({
  flows,
  compact = false,
  ariaLabel = "Endpoint workflow Sankey diagram",
  emptyMessage = "No endpoint flow detected.",
  height,
  minWidth,
  labelFontSize,
  margin,
}: EndpointSankeyProps) {
  if (flows.length === 0) {
    return <div style={{ color: "var(--text-mute)", fontSize: 13 }}>{emptyMessage}</div>;
  }

  const data = buildSankeyData(flows);
  const resolvedHeight = height ?? (compact ? 220 : 320);
  const resolvedMinWidth = minWidth ?? (compact ? 420 : 560);
  const resolvedLabelFontSize = labelFontSize ?? (compact ? 10 : 12);
  const resolvedMargin =
    margin ??
    (compact
      ? { top: 6, right: 96, bottom: 6, left: 12 }
      : { top: 10, right: 132, bottom: 10, left: 16 });

  return (
    <div style={{ height: resolvedHeight, minWidth: resolvedMinWidth, width: "100%" }}>
      <ResponsiveSankey<SankeyNode, SankeyLink>
        data={data}
        margin={resolvedMargin}
        align="justify"
        sort="input"
        colors={(node) => nodeFill(node)}
        nodeThickness={compact ? 10 : 14}
        nodeSpacing={compact ? 8 : 12}
        nodeBorderWidth={1}
        nodeBorderRadius={4}
        nodeBorderColor={{ from: "color", modifiers: [["darker", 0.25]] }}
        nodeOpacity={0.95}
        linkOpacity={0.28}
        linkHoverOpacity={0.8}
        linkContract={compact ? 1 : 2}
        enableLinkGradient
        enableLabels
        label={(node) => node.displayLabel}
        labelPosition="outside"
        labelPadding={compact ? 6 : 10}
        labelTextColor="var(--text-2)"
        valueFormat={(value) => `${value}×`}
        role="img"
        ariaLabel={ariaLabel}
        animate={false}
        theme={{
          text: { fill: "var(--text-2)", fontSize: resolvedLabelFontSize },
          tooltip: {
            container: {
              background: "var(--bg-elev-1)",
              color: "var(--text-1)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              boxShadow: "var(--shadow-2)",
              fontSize: 12,
            },
          },
        }}
      />
    </div>
  );
}

function buildSankeyData(flows: EndpointSankeyFlow[]): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const nodesById = new Map<string, SankeyNode>();
  const linksByKey = new Map<string, SankeyLink>();
  flows.forEach((flow, index) => {
    const fromStep = flow.fromStep ?? (index % 2 === 0 ? 0 : 1);
    const toStep = flow.toStep ?? ((fromStep + 1) as 1 | 2);
    const source = nodeId(fromStep, flow.from);
    const target = nodeId(toStep, flow.to);

    if (!nodesById.has(source)) {
      nodesById.set(source, {
        id: source,
        displayLabel: flow.fromLabel ?? formatEndpoint(flow.from),
        step: fromStep,
      });
    }
    if (!nodesById.has(target)) {
      nodesById.set(target, {
        id: target,
        displayLabel: flow.toLabel ?? formatEndpoint(flow.to),
        step: toStep,
      });
    }

    const key = `${source}->${target}`;
    const link = linksByKey.get(key) ?? { source, target, value: 0 };
    link.value += flow.occurrences;
    linksByKey.set(key, link);
  });

  return {
    nodes: [...nodesById.values()],
    links: [...linksByKey.values()].filter((link) => link.value > 0),
  };
}

function nodeId(step: number, endpoint: string): string {
  return `${step}:${endpoint}`;
}

function rawNodeId(id: string): string {
  return id.split(":").slice(1).join(":") || id;
}

function nodeFill(node: SankeyNode): string {
  return ENDPOINT_COLORS[rawNodeId(node.id)] ?? FALLBACK_STEP_COLORS[node.step];
}

function formatEndpoint(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
