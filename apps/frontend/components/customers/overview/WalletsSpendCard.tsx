import { OverviewCard } from "./OverviewCard";
import { formatAtomic } from "@/lib/format";

type WalletsSpendCardProps = {
  walletCount: number;
  totalSpendAtomic: string;
};

export function WalletsSpendCard({ walletCount, totalSpendAtomic }: WalletsSpendCardProps) {
  return (
    <OverviewCard
      title="Wallets and spend"
    >
      <div
        className="wallets-spend-metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <Metric label="Wallets" value={walletCount.toLocaleString()} hint="payer wallets observed" />
        <Metric
          label="Spend"
          value={formatAtomic(totalSpendAtomic)}
          hint="total USDC spend"
        />
      </div>
    </OverviewCard>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-1)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={value}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{hint}</div>
    </div>
  );
}
