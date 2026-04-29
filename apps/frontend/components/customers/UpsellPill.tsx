import type { UpsellOpportunity } from "@/lib/api/types";

type UpsellPillProps = {
  opportunity: UpsellOpportunity;
};

const LABELS: Record<UpsellOpportunity, { label: string; className: string }> = {
  high: { label: "High", className: "growth" },
  medium: { label: "Medium", className: "loyal" },
  low: { label: "Low", className: "stable" },
};

export function UpsellPill({ opportunity }: UpsellPillProps) {
  const m = LABELS[opportunity];
  return (
    <span className={"status " + m.className} title={`upsellOpportunity = ${opportunity}`}>
      <span className="pellet" />
      {m.label}
    </span>
  );
}
