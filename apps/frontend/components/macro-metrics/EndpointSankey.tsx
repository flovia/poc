export type EndpointSankeyFlow = {
  from: string;
  to: string;
  occurrences: number;
};

type EndpointSankeyProps = {
  flows: EndpointSankeyFlow[];
  compact?: boolean;
};

type SankeyNodeLayout = {
  id: string;
  label: string;
  phase: 0 | 1 | 2;
  value: number;
  x: number;
  y: number;
  height: number;
};

type SankeyLinkLayout = {
  source: SankeyNodeLayout;
  target: SankeyNodeLayout;
  value: number;
  width: number;
  sourceY0: number;
  targetY0: number;
};

const SANKEY_W = 620;
const SANKEY_NODE_W = 132;
const SANKEY_MIN_NODE_H = 28;
const SANKEY_NODE_GAP = 14;
const SANKEY_PHASES = ["Extract", "Analyze", "Act"] as const;
const SANKEY_PHASE_X = [28, 244, 460] as const;

export function EndpointSankey({ flows, compact = false }: EndpointSankeyProps) {
  if (flows.length === 0) {
    return <div style={{ color: "var(--text-mute)", fontSize: 13 }}>No endpoint flow detected.</div>;
  }

  const sankey = buildThreePhaseSankey(flows, compact);
  const height = sankey.height;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        role="img"
        aria-label="Endpoint category Sankey diagram"
        width="100%"
        viewBox={`0 0 ${SANKEY_W} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", minWidth: compact ? 360 : 460 }}
      >
        <defs>
          <linearGradient id={compact ? "endpoint-flow-gradient-compact" : "endpoint-flow-gradient"} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--mesh-blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0.56" />
          </linearGradient>
        </defs>

        {sankey.links.map((link) => (
          <g key={`${link.source.id}->${link.target.id}`}>
            <path
              d={ribbonPath(
                link.source.x + SANKEY_NODE_W,
                link.sourceY0,
                link.target.x,
                link.targetY0,
                link.width,
              )}
              fill={`url(#${compact ? "endpoint-flow-gradient-compact" : "endpoint-flow-gradient"})`}
              stroke="rgba(45,127,249,0.18)"
              strokeWidth="0.5"
            />
            {!compact && (
              <text
                x={(link.source.x + link.target.x + SANKEY_NODE_W) / 2}
                y={(link.sourceY0 + link.targetY0) / 2 - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="var(--text-3)"
              >
                {link.value}×
              </text>
            )}
          </g>
        ))}

        {sankey.nodes.map((node) => (
          <SankeyNode key={node.id} node={node} compact={compact} />
        ))}

        {SANKEY_PHASES.map((phase, index) => (
          <text
            key={phase}
            x={SANKEY_PHASE_X[index] + SANKEY_NODE_W / 2}
            y="14"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--text-mute)"
          >
            {phase}
          </text>
        ))}
      </svg>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-mute)", fontSize: 11, marginTop: 6 }}>
          <span>Phase 1: Extract</span>
          <span>Phase 2: Analyze</span>
          <span>Phase 3: Act</span>
        </div>
      )}
    </div>
  );
}

function SankeyNode({ node, compact }: { node: SankeyNodeLayout; compact: boolean }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect width={SANKEY_NODE_W} height={node.height} rx="8" fill="#fff" stroke="var(--line)" />
      <rect width="5" height={node.height} rx="3" fill={node.phase === 0 ? "var(--mesh-blue)" : node.phase === 1 ? "var(--teal)" : "#7C3AED"} />
      <text x="16" y={node.height / 2 - 1} textAnchor="start" fontSize={compact ? "10" : "12"} fontWeight="650" fill="var(--text-1)">
        {compact ? compactLabel(node.label) : node.label}
      </text>
      {!compact && (
        <text x="16" y={node.height / 2 + 13} fontSize="10" fill="var(--text-mute)">
          {node.value}×
        </text>
      )}
    </g>
  );
}

function buildThreePhaseSankey(flows: EndpointSankeyFlow[], compact: boolean) {
  const phaseOf = (category: string): 0 | 1 | 2 => {
    if (category === "price_lookup" || category === "market_feed") return 0;
    if (category === "ai_inference" || category === "portfolio_sync") return 1;
    return 2;
  };

  const aggregated = new Map<string, { source: string; target: string; value: number }>();
  for (const flow of flows) {
    const sourcePhase = phaseOf(flow.from);
    const targetPhase = phaseOf(flow.to);
    if (sourcePhase === targetPhase) continue;
    const source = `${sourcePhase}:${flow.from}`;
    const target = `${targetPhase}:${flow.to}`;
    const key = `${source}->${target}`;
    const current = aggregated.get(key) ?? { source, target, value: 0 };
    current.value += flow.occurrences;
    aggregated.set(key, current);
  }

  const rawLinks = [...aggregated.values()].filter((link) => link.value > 0);
  const nodeValues = new Map<string, number>();
  for (const link of rawLinks) {
    nodeValues.set(link.source, (nodeValues.get(link.source) ?? 0) + link.value);
    nodeValues.set(link.target, (nodeValues.get(link.target) ?? 0) + link.value);
  }

  const nodes: SankeyNodeLayout[] = [...nodeValues.entries()].map(([id, value]) => {
    const [phaseRaw, category] = id.split(":");
    const phase = Number(phaseRaw) as 0 | 1 | 2;
    return {
      id,
      label: formatCategory(category),
      phase,
      value,
      x: SANKEY_PHASE_X[phase],
      y: 0,
      height: SANKEY_MIN_NODE_H,
    };
  });

  const maxPhaseTotal = Math.max(
    ...[0, 1, 2].map((phase) => nodes.filter((node) => node.phase === phase).reduce((acc, node) => acc + node.value, 0)),
    1,
  );
  const pxPerUnit = (compact ? 58 : 84) / maxPhaseTotal;
  const layoutHeight = compact ? 132 : 178;
  const top = 32;

  for (const phase of [0, 1, 2] as const) {
    const phaseNodes = nodes.filter((node) => node.phase === phase).sort((a, b) => b.value - a.value);
    const totalHeight =
      phaseNodes.reduce((acc, node) => acc + Math.max(SANKEY_MIN_NODE_H, node.value * pxPerUnit), 0)
      + Math.max(0, phaseNodes.length - 1) * SANKEY_NODE_GAP;
    let y = top + Math.max(0, (layoutHeight - totalHeight) / 2);
    for (const node of phaseNodes) {
      node.height = Math.max(SANKEY_MIN_NODE_H, node.value * pxPerUnit);
      node.y = y;
      y += node.height + SANKEY_NODE_GAP;
    }
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  const links: SankeyLinkLayout[] = [];
  for (const link of rawLinks) {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) continue;
    const width = Math.max(compact ? 4 : 6, link.value * pxPerUnit * 0.7);
    const sourceOffset = sourceOffsets.get(source.id) ?? 0;
    const targetOffset = targetOffsets.get(target.id) ?? 0;
    sourceOffsets.set(source.id, sourceOffset + width + 1);
    targetOffsets.set(target.id, targetOffset + width + 1);
    links.push({
      source,
      target,
      value: link.value,
      width,
      sourceY0: source.y + Math.min(source.height - width / 2, sourceOffset + width / 2),
      targetY0: target.y + Math.min(target.height - width / 2, targetOffset + width / 2),
    });
  }

  return { nodes, links, height: compact ? 176 : 232 };
}

function ribbonPath(x1: number, y1: number, x2: number, y2: number, width: number): string {
  const c1 = x1 + (x2 - x1) * 0.46;
  const c2 = x1 + (x2 - x1) * 0.54;
  const half = width / 2;
  return [
    `M ${x1} ${y1 - half}`,
    `C ${c1} ${y1 - half}, ${c2} ${y2 - half}, ${x2} ${y2 - half}`,
    `L ${x2} ${y2 + half}`,
    `C ${c2} ${y2 + half}, ${c1} ${y1 + half}, ${x1} ${y1 + half}`,
    "Z",
  ].join(" ");
}

function formatCategory(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function compactLabel(value: string): string {
  return value.length > 14 ? `${value.slice(0, 13)}…` : value;
}
