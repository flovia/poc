"use client";

import { ResponsiveSankey } from "@nivo/sankey";

export type EndpointSankeyFlow = {
  from: string;
  to: string;
  fromStep?: 0 | 1;
  toStep?: 1 | 2;
  occurrences: number;
};

type EndpointSankeyProps = {
  flows: EndpointSankeyFlow[];
  compact?: boolean;
};

type SankeyNode = { id: string };
type SankeyLink = { source: string; target: string; value: number };

const STEP_COUNT = 3;
const ENDPOINT_COLORS: Record<string, string> = {
  pool_search: "#2F5D9A",
  trending_pools: "#2C7A7B",
  simple_price: "#B45309",
  token_price: "#7B61A8",
  token_detail: "#DC2626",
};

export function EndpointSankey({ flows, compact = false }: EndpointSankeyProps) {
  if (flows.length === 0) {
    return <div style={{ color: "var(--text-mute)", fontSize: 13 }}>No endpoint flow detected.</div>;
  }

  const data = buildSankeyData(flows);

  return (
    <div style={{ height: compact ? 220 : 320, minWidth: compact ? 420 : 560 }}>
      <ResponsiveSankey<SankeyNode, SankeyLink>
        data={data}
        margin={compact ? { top: 6, right: 96, bottom: 6, left: 12 } : { top: 10, right: 132, bottom: 10, left: 16 }}
        align="justify"
        sort="input"
        colors={(node) => ENDPOINT_COLORS[endpointFromNodeId(node.id)] ?? "#94A3B8"}
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
        label={(node) => formatEndpoint(endpointFromNodeId(node.id))}
        labelPosition="outside"
        labelPadding={compact ? 6 : 10}
        labelTextColor="var(--text-2)"
        valueFormat={(value) => `${value}×`}
        role="img"
        ariaLabel="Endpoint workflow Sankey diagram"
        animate={false}
        theme={{
          text: { fill: "var(--text-2)", fontSize: compact ? 10 : 12 },
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
  const endpoints = [...new Set(flows.flatMap((flow) => [flow.from, flow.to]))];
  const nodes = endpoints.flatMap((endpoint) =>
    Array.from({ length: STEP_COUNT }, (_, step) => ({ id: nodeId(step, endpoint) })),
  );

  const linksByKey = new Map<string, SankeyLink>();
  flows.forEach((flow, index) => {
    const fromStep = flow.fromStep ?? (index % 2 === 0 ? 0 : 1);
    const toStep = flow.toStep ?? ((fromStep + 1) as 1 | 2);
    const source = nodeId(fromStep, flow.from);
    const target = nodeId(toStep, flow.to);
    const key = `${source}->${target}`;
    const link = linksByKey.get(key) ?? { source, target, value: 0 };
    link.value += flow.occurrences;
    linksByKey.set(key, link);
  });

  return { nodes, links: [...linksByKey.values()].filter((link) => link.value > 0) };
}

function nodeId(step: number, endpoint: string): string {
  return `${step}:${endpoint}`;
}

function endpointFromNodeId(id: string): string {
  return id.split(":").slice(1).join(":") || id;
}

function formatEndpoint(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
