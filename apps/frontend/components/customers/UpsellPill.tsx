import type { DataProvenance, EvidenceLabel, UpsellOpportunity } from "@/lib/api/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

type UpsellPillProps = {
  opportunity: UpsellOpportunity;
  provenance?: DataProvenance;
  reasons?: EvidenceLabel[];
};

const LABELS: Record<UpsellOpportunity, { label: string; className: string }> = {
  high: { label: "High", className: "growth" },
  medium: { label: "Medium", className: "loyal" },
  low: { label: "Low", className: "stable" },
};

export function UpsellPill({ opportunity, provenance, reasons }: UpsellPillProps) {
  const m = LABELS[opportunity];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
    >
      <span className={"status " + m.className} title={`upsellOpportunity = ${opportunity}`}>
        <span className="pellet" />
        {m.label}
      </span>
      {provenance && (
        <ProvenanceBadge
          provenance={provenance}
          reasons={reasons}
          field="upsellOpportunity"
        />
      )}
    </span>
  );
}
