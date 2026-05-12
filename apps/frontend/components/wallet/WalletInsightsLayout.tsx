import type { ReactNode } from "react";

type WalletInsightsLayoutProps = {
  workflow: ReactNode;
  recentActivity: ReactNode;
  opportunity: ReactNode;
  upsell: ReactNode;
};

const SLOT_STYLE = {
  display: "flex",
  minWidth: 0,
};

export function WalletInsightsLayout({
  workflow,
  recentActivity,
  opportunity,
  upsell,
}: WalletInsightsLayoutProps) {
  const summaryCards = [workflow, recentActivity, opportunity].filter(
    (card) => card !== null && card !== undefined && card !== false,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
      <div
        data-layout-row="insight-summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "clamp(14px, calc((100% - 54rem) / 2), 56px)",
          alignItems: "stretch",
        }}
      >
        {summaryCards.map((card, index) => (
          <div key={index} style={SLOT_STYLE}>
            {card}
          </div>
        ))}
      </div>

      <div
        data-layout-row="upsell-focus"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={SLOT_STYLE}>{upsell}</div>
      </div>
    </div>
  );
}
