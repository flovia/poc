import type { CoUsageProviderRow } from "@/lib/customers/co-usage-providers";
import { OverviewCard } from "./overview/OverviewCard";

const TOP_N = 6;
const ROW_HEIGHT = 22;
const ROW_GAP = 3;
const LABEL_WIDTH = 200;
const VALUE_WIDTH = 144;
const PAD = { l: 12, r: 12, t: 8, b: 8 };
const KPI_TOP_K = 3;

// Heatmap opacity range for the bar fill, driven by sharedTxCount.
// Lower bound > 0 keeps low-tx providers visible; upper bound < 1 leaves room
// for the densest bars to feel emphasized without losing surrounding contrast.
const MIN_TX_OPACITY = 0.25;
const MAX_TX_OPACITY = 0.95;

const truncate = (value: string, max = 32): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

const txOpacity = (txCount: number, maxTx: number): number => {
  if (maxTx <= 0) return MIN_TX_OPACITY;
  const ratio = txCount / maxTx;
  return MIN_TX_OPACITY + (MAX_TX_OPACITY - MIN_TX_OPACITY) * ratio;
};

export function CoUsageProvidersChart({
  rows,
  onRowSelect,
}: {
  rows: CoUsageProviderRow[];
  onRowSelect?: (row: CoUsageProviderRow) => void;
}) {
  if (rows.length === 0) return null;

  const totalSharedTx = rows.reduce((sum, r) => sum + r.sharedTxCount, 0);
  const sortedByTx = [...rows].sort((a, b) => b.sharedTxCount - a.sharedTxCount);
  const topKTx = sortedByTx.slice(0, KPI_TOP_K).reduce((sum, r) => sum + r.sharedTxCount, 0);
  const topKShare = totalSharedTx > 0 ? topKTx / totalSharedTx : 0;
  const synergyLeader = rows.find(
    (r) => r.sharedWallets === Math.max(...rows.map((x) => x.sharedWallets)),
  );

  const topRows = rows.slice(0, TOP_N);
  const maxWallets = Math.max(1, ...topRows.map((r) => r.sharedWallets));
  const maxTx = Math.max(1, ...topRows.map((r) => r.sharedTxCount));

  const chartWidth = 720;
  const barAreaWidth = chartWidth - PAD.l - PAD.r - LABEL_WIDTH - VALUE_WIDTH;
  const chartHeight = PAD.t + topRows.length * (ROW_HEIGHT + ROW_GAP) - ROW_GAP + PAD.b;

  const synergyHint = synergyLeader
    ? `"${truncate(synergyLeader.providerName, 28)}" reaches the most customers (${synergyLeader.sharedWallets} wallets, ${synergyLeader.sharedTxCount} tx). Top ${KPI_TOP_K} providers cover ${(topKShare * 100).toFixed(0)}% of cross-provider tx.`
    : "Providers your customers also pay through x402 — explore for partnership and bundle opportunities.";

  return (
    <OverviewCard
      eyebrow="Synergy candidates"
      title="Other providers your customers also pay"
    >
      <svg
        role="img"
        aria-label={`Top ${topRows.length} synergy candidates by shared wallet reach and shared tx volume`}
        width="100%"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {topRows.map((row, index) => {
          const y = PAD.t + index * (ROW_HEIGHT + ROW_GAP);
          const barX = PAD.l + LABEL_WIDTH;
          const barLength = (row.sharedWallets / maxWallets) * barAreaWidth;
          const barY = y + 5;
          const barH = ROW_HEIGHT - 10;
          const valueX = barX + barAreaWidth + 6;
          const opacity = txOpacity(row.sharedTxCount, maxTx);

          const clickable = !!onRowSelect;
          return (
            <g
              key={row.payToWallet ?? row.providerId}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `Open details for ${row.providerName}` : undefined}
              style={{ cursor: clickable ? "pointer" : "default" }}
              onClick={clickable ? () => onRowSelect?.(row) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowSelect?.(row);
                      }
                    }
                  : undefined
              }
            >
              <rect
                x={PAD.l}
                y={y}
                width={chartWidth - PAD.l - PAD.r}
                height={ROW_HEIGHT}
                fill="transparent"
              />
              <text
                x={PAD.l + LABEL_WIDTH - 8}
                y={y + ROW_HEIGHT / 2}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--text-1)"
                style={{ textDecoration: clickable ? "underline" : undefined, textDecorationStyle: "dotted", textDecorationColor: "var(--text-mute)" }}
              >
                {truncate(row.providerName, 28)}
              </text>

              <rect
                x={barX}
                y={barY}
                width={barAreaWidth}
                height={barH}
                fill="var(--surface-muted)"
                rx={2}
              />
              <rect
                x={barX}
                y={barY}
                width={Math.max(2, barLength)}
                height={barH}
                fill="var(--mesh-blue)"
                fillOpacity={opacity}
                rx={2}
              >
                <title>
                  {`${row.providerName}\nShared wallets: ${row.sharedWallets}\nShared tx: ${row.sharedTxCount}\nEndpoints used: ${row.endpoints.length}`}
                </title>
              </rect>

              <text
                x={valueX}
                y={y + ROW_HEIGHT / 2}
                dy="0.32em"
                fontSize={10.5}
                fill="var(--text-2)"
                className="mono"
              >
                {row.sharedWallets} wallets · {row.sharedTxCount} tx
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: "var(--text-2)" }}>
        {synergyHint}
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 8,
          fontSize: 11,
          color: "var(--text-3)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <span
              style={{
                width: 14,
                height: 8,
                background: "var(--mesh-blue)",
                opacity: MIN_TX_OPACITY,
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            <span
              style={{
                width: 14,
                height: 8,
                background: "var(--mesh-blue)",
                opacity: (MIN_TX_OPACITY + MAX_TX_OPACITY) / 2,
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            <span
              style={{
                width: 14,
                height: 8,
                background: "var(--mesh-blue)",
                opacity: MAX_TX_OPACITY,
                borderRadius: 1,
                display: "inline-block",
              }}
            />
          </span>
          Color depth = shared tx volume
        </span>
        <span>Bar length = shared wallets (reach)</span>
        <span style={{ marginLeft: "auto" }}>
          {rows.length > TOP_N
            ? `Top ${TOP_N} of ${rows.length} shown. See full list below.`
            : "Hover any bar for details."}
        </span>
      </div>
    </OverviewCard>
  );
}
