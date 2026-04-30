import type { ProviderSpread } from "@/lib/customers/overview";
import { OverviewCard } from "./OverviewCard";

type ProviderSpreadChartProps = {
  spread: ProviderSpread;
};

const ROW_COLOR = ["var(--mesh-blue)", "var(--teal)", "var(--sdk-purple)"] as const;

export function ProviderSpreadChart({ spread }: ProviderSpreadChartProps) {
  const total = spread.totalWallets;
  const hint =
    total === 0
      ? "No payer wallets to summarize."
      : describeHint(spread);

  const maxShare = Math.max(0.0001, ...spread.buckets.map((b) => b.share));

  return (
    <OverviewCard
      eyebrow="Provider spread"
      title="How many providers each payer uses"
      hint={hint}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {spread.buckets.map((bucket, idx) => {
          const widthPct = total === 0 ? 0 : (bucket.share / maxShare) * 100;
          return (
            <div
              key={bucket.label}
              style={{ display: "grid", gridTemplateColumns: "92px 1fr 56px", gap: 10, alignItems: "center" }}
              title={`${bucket.label}: ${bucket.count} of ${total} wallets (${formatPercent(bucket.share)})`}
            >
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>{bucket.label}</span>
              <div
                style={{
                  height: 10,
                  background: "var(--bg-elev-2)",
                  borderRadius: 999,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPct.toFixed(1)}%`,
                    height: "100%",
                    background: ROW_COLOR[idx] ?? "var(--mesh-blue)",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
              <span
                className="mono"
                style={{ fontSize: 12, color: "var(--text-1)", textAlign: "right", fontWeight: 600 }}
              >
                {bucket.count}
                <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: 4 }}>
                  ({formatPercent(bucket.share)})
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </OverviewCard>
  );
}

function describeHint(spread: ProviderSpread): string {
  const single = spread.buckets.find((b) => b.label === "1 provider");
  if (!single || spread.totalWallets === 0) {
    return `${spread.totalWallets} payer wallets observed`;
  }
  const multi = spread.totalWallets - single.count;
  return `${formatPercent(single.share)} stick to a single provider · ${multi} payers cross over`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
