// Phase 7 H1: Force-directed network 図 (静的座標版).
// design.md §5.4 / §H1. 静的座標は data-source 経由で server から渡す.
// fixture を client component から直接 import すると live bundle に混入するため.

import type { SdkForceNetwork } from "@/lib/sdk-fixtures/types";

const VIEW_W = 800;
const VIEW_H = 500;

type Props = { network: SdkForceNetwork };

export function SdkForceNetworkChart({ network }: Props) {
  const { nodes, edges } = network;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: "14px 18px 6px",
        minWidth: 0,
      }}
    >
      <div
        className="eyebrow"
        style={{ color: "var(--sdk-purple)", marginBottom: 6 }}
      >
        SDK preview · Force-directed co-usage map
      </div>
      <svg
        data-testid="sdk-force-network"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={360}
        role="img"
        aria-label="Force-directed network of co-used providers"
      >
        {edges.map((e) => {
          const a = nodeById.get(e.from);
          const b = nodeById.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--mesh-blue)"
              strokeOpacity={0.45}
              strokeWidth={Math.max(1, e.weight * 1.4)}
            />
          );
        })}
        {nodes.map((n) => {
          const isCenter = n.role === "center";
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={isCenter ? 16 : 11}
                fill={isCenter ? "var(--teal)" : "#FFFFFF"}
                stroke={isCenter ? "var(--teal)" : "var(--mesh-blue)"}
                strokeWidth={2}
              />
              <text
                x={n.x}
                y={n.y + (isCenter ? 34 : 28)}
                textAnchor="middle"
                fontFamily={isCenter ? "var(--mono)" : "inherit"}
                fontSize={13}
                fontWeight={isCenter ? 500 : 600}
                fill="var(--text-1)"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
