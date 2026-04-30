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
  accent: "primary" | "warm" | "muted" | "cool";
};

const CELLS: CellSpec[] = [
  {
    key: "recentHigh",
    label: "Active high spenders",
    hint: "Recent activity, above-median spend",
    accent: "primary",
  },
  {
    key: "recentLow",
    label: "Active low spenders",
    hint: "Recent activity, below-median spend",
    accent: "cool",
  },
  {
    key: "staleHigh",
    label: "Dormant whales",
    hint: "Older activity, above-median spend",
    accent: "warm",
  },
  {
    key: "staleLow",
    label: "Dormant low spenders",
    hint: "Older activity, below-median spend",
    accent: "muted",
  },
];

const ACCENT_BG: Record<CellSpec["accent"], string> = {
  primary: "var(--mesh-blue-soft)",
  cool: "var(--teal-soft)",
  warm: "var(--warn-soft)",
  muted: "rgba(148, 163, 184, 0.10)",
};

const ACCENT_FG: Record<CellSpec["accent"], string> = {
  primary: "var(--mesh-blue)",
  cool: "var(--teal)",
  warm: "var(--warn)",
  muted: "var(--text-3)",
};

export function RecencyMatrixChart({ matrix }: RecencyMatrixChartProps) {
  const total = matrix.totalWallets;
  const hint = total === 0 ? "No payer wallets to summarize." : describeHint(matrix);

  return (
    <OverviewCard
      eyebrow="Recency × Spend"
      title="Where attention pays off"
      hint={hint}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          minHeight: 160,
        }}
      >
        {CELLS.map((spec) => {
          const count = matrix.cells[spec.key];
          const share = total === 0 ? 0 : count / total;
          return (
            <div
              key={spec.key}
              style={{
                background: ACCENT_BG[spec.accent],
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 4,
              }}
              title={`${spec.label}: ${count} of ${total} wallets (${formatPercent(share)})`}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: ACCENT_FG[spec.accent],
                }}
              >
                {spec.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  className="display"
                  style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}
                >
                  {count}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{formatPercent(share)}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{spec.hint}</div>
            </div>
          );
        })}
      </div>
    </OverviewCard>
  );
}

function describeHint(matrix: RecencyMatrix): string {
  const { recentHigh, recentLow, staleHigh, staleLow } = matrix.cells;
  const total = matrix.totalWallets;
  const recent = recentHigh + recentLow;
  return `Split by spend & recency medians · ${recent}/${total} wallets active recently · ${staleHigh + staleLow} dormant`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
