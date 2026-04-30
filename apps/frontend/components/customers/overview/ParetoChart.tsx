import type { ParetoCurve } from "@/lib/customers/overview";
import { OverviewCard } from "./OverviewCard";

type ParetoChartProps = {
  curve: ParetoCurve;
};

const W = 320;
const H = 180;
const PAD = { l: 36, r: 12, t: 12, b: 28 };

const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

const xToPx = (share: number) => PAD.l + share * innerW;
const yToPx = (share: number) => PAD.t + (1 - share) * innerH;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function buildHint(curve: ParetoCurve): string {
  if (curve.totalWallets === 0) return "No payer wallets to summarize.";
  const half = curve.walletShareForHalfSpend;
  if (half === null) return "All wallets show zero spend in this snapshot.";
  return `Top ${formatPercent(half)} of wallets account for 50% of spend.`;
}

export function ParetoChart({ curve }: ParetoChartProps) {
  const hint = buildHint(curve);
  if (curve.totalWallets === 0) {
    return (
      <OverviewCard eyebrow="Spend concentration" title="Where the money comes from" hint={hint}>
        <EmptyChart />
      </OverviewCard>
    );
  }

  const path = ["M", xToPx(0), yToPx(0)]
    .concat(
      curve.points.flatMap((p) => ["L", xToPx(p.walletShare).toFixed(1), yToPx(p.spendShare).toFixed(1)]),
    )
    .join(" ");

  const halfX = curve.walletShareForHalfSpend;

  return (
    <OverviewCard eyebrow="Spend concentration" title="Where the money comes from" hint={hint}>
      <svg
        role="img"
        aria-label="Cumulative wallet share vs cumulative spend share"
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <line
          x1={xToPx(0)}
          y1={yToPx(0)}
          x2={xToPx(1)}
          y2={yToPx(1)}
          stroke="var(--line-strong)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />

        <path
          d={path}
          fill="none"
          stroke="var(--mesh-blue)"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />

        {halfX !== null && (
          <>
            <line
              x1={xToPx(halfX)}
              y1={yToPx(0)}
              x2={xToPx(halfX)}
              y2={yToPx(0.5)}
              stroke="var(--teal)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <line
              x1={xToPx(0)}
              y1={yToPx(0.5)}
              x2={xToPx(halfX)}
              y2={yToPx(0.5)}
              stroke="var(--teal)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle
              cx={xToPx(halfX)}
              cy={yToPx(0.5)}
              r={3}
              fill="var(--teal)"
            />
          </>
        )}

        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--line)" strokeWidth={1} />

        <text x={PAD.l - 6} y={yToPx(0)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-3)">
          0%
        </text>
        <text x={PAD.l - 6} y={yToPx(0.5)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-3)">
          50%
        </text>
        <text x={PAD.l - 6} y={yToPx(1)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-3)">
          100%
        </text>

        <text x={xToPx(0)} y={H - PAD.b + 14} fontSize={10} fill="var(--text-3)">
          0%
        </text>
        <text
          x={xToPx(1)}
          y={H - PAD.b + 14}
          textAnchor="end"
          fontSize={10}
          fill="var(--text-3)"
        >
          100%
        </text>

        <text
          x={PAD.l + innerW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-mute)"
        >
          Cumulative wallet share
        </text>
      </svg>
    </OverviewCard>
  );
}

function EmptyChart() {
  return (
    <div
      style={{
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-mute)",
        fontSize: 13,
      }}
    >
      No data
    </div>
  );
}
