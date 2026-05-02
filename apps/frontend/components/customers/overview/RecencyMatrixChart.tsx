import type { RecencyMatrix, RecencyMatrixCells } from "@/lib/customers/overview";
import { OverviewCard } from "./OverviewCard";

type RecencyMatrixChartProps = {
  matrix: RecencyMatrix;
};

type CellKey = keyof RecencyMatrixCells;

type CellSpec = {
  key: CellKey;
  label: string;
  hint: string;
  accent: "priority" | "attention" | "neutral";
};

const CELLS: CellSpec[] = [
  {
    key: "recentHigh",
    label: "Key active accounts",
    hint: "Recent activity, above-median spend · retain / upsell",
    accent: "priority",
  },
  {
    key: "recentLow",
    label: "Emerging accounts",
    hint: "Recent activity, below-median spend · nurture",
    accent: "neutral",
  },
  {
    key: "staleHigh",
    label: "At-risk key accounts",
    hint: "Older activity, above-median spend · re-engage first",
    accent: "attention",
  },
  {
    key: "staleLow",
    label: "Dormant accounts",
    hint: "Older activity, below-median spend · automate reactivation",
    accent: "neutral",
  },
];

const ACCENT_FG: Record<CellSpec["accent"], string> = {
  priority: "var(--signal-priority)",
  attention: "var(--signal-attention)",
  neutral: "var(--signal-neutral)",
};

export function RecencyMatrixChart({ matrix }: RecencyMatrixChartProps) {
  const total = matrix.totalWallets;

  return (
    <OverviewCard
      title="Account Segmentation by Recency × Spend"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          height: "100%",
          minHeight: 0,
        }}
      >
        {CELLS.map((spec) => {
          const count = matrix.cells[spec.key];
          const share = total === 0 ? 0 : count / total;
          const isEmphasized = spec.accent !== "neutral";
          return (
            <div
              key={spec.key}
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
              title={`${spec.label}: ${count} of ${total} wallets (${formatPercent(share)})`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isEmphasized ? ACCENT_FG[spec.accent] : "var(--text-mute)",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: "var(--text-2)",
                  }}
                >
                  {spec.label}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  className="display"
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: isEmphasized ? ACCENT_FG[spec.accent] : "var(--text-1)",
                  }}
                >
                  {count}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)" }}>
                  {formatPercent(share)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.35 }}>{spec.hint}</div>
            </div>
          );
        })}
      </div>
    </OverviewCard>
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
