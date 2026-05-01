import type { CSSProperties } from "react";
import type { DataProvenance, EvidenceLabel } from "@/lib/api/types";

type ProvenanceBadgeProps = {
  provenance: DataProvenance;
  reasons?: EvidenceLabel[];
  field?: string;
};

type ProvenanceVisual = {
  shortLabel: string;
  fullLabel: string;
  color: string;
};

const VISUALS: Record<DataProvenance, ProvenanceVisual> = {
  onchain_fact: {
    shortLabel: "onchain",
    fullLabel: "Onchain fact",
    color: "var(--teal)",
  },
  demo_label: {
    shortLabel: "demo",
    fullLabel: "Demo label",
    color: "var(--sdk-purple)",
  },
  future_sdk_field: {
    shortLabel: "sdk",
    fullLabel: "Future SDK field",
    color: "var(--sdk-purple)",
  },
  derived_insight: {
    shortLabel: "hypothesis",
    fullLabel: "Derived insight (hypothesis)",
    color: "var(--meta-hypothesis)",
  },
};

const dotStyle = (color: string): CSSProperties => ({
  display: "inline-block",
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: color,
  flexShrink: 0,
});

export function selectReasonsForField(
  reasons: EvidenceLabel[] | undefined,
  field: string,
): EvidenceLabel[] {
  if (!reasons) return [];
  return reasons.filter((reason) => {
    if (!reason.sourceFields || reason.sourceFields.length === 0) return true;
    return reason.sourceFields.includes(field);
  });
}

export function buildBadgeAriaLabel(
  fullLabel: string,
  field: string | undefined,
  reasons: EvidenceLabel[],
): string {
  const head = field ? `${field} provenance: ${fullLabel}` : `Provenance: ${fullLabel}`;
  if (reasons.length === 0) return head;
  const reasonText = reasons
    .map((reason) => (reason.description ? `${reason.label} — ${reason.description}` : reason.label))
    .join("; ");
  return `${head}. Reasons: ${reasonText}`;
}

function buildTooltip(visual: ProvenanceVisual, field: string | undefined, reasons: EvidenceLabel[]) {
  const lines: string[] = [];
  lines.push(field ? `${field} · ${visual.fullLabel}` : visual.fullLabel);
  if (reasons.length > 0) {
    lines.push("");
    for (const reason of reasons) {
      lines.push(`- ${reason.label}`);
      if (reason.description) lines.push(`  ${reason.description}`);
    }
  }
  return lines.join("\n");
}

export function ProvenanceBadge({ provenance, reasons, field }: ProvenanceBadgeProps) {
  const visual = VISUALS[provenance];
  const scopedReasons = field ? selectReasonsForField(reasons, field) : reasons ?? [];
  return (
    <span
      data-testid="provenance-badge"
      data-provenance={provenance}
      title={buildTooltip(visual, field, scopedReasons)}
      aria-label={buildBadgeAriaLabel(visual.fullLabel, field, scopedReasons)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        color: visual.color,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={dotStyle(visual.color)} />
      {visual.shortLabel}
    </span>
  );
}
