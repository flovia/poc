import { describeSnapshotAge, type SnapshotSeverity } from "@/lib/customers/freshness";

type SnapshotIndicatorProps = {
  generatedAt: string | undefined;
};

const SEVERITY_COLOR: Record<SnapshotSeverity, string> = {
  fresh: "var(--text-3)",
  stale: "var(--warn)",
  outdated: "var(--warn)",
  unknown: "var(--text-mute)",
};

export function SnapshotIndicator({ generatedAt }: SnapshotIndicatorProps) {
  const { relative, absolute, severity } = describeSnapshotAge(generatedAt);
  const color = SEVERITY_COLOR[severity];
  const tooltip = absolute ? `Snapshot generated at ${absolute}` : "Snapshot timestamp unavailable";

  return (
    <span
      data-testid="snapshot-indicator"
      data-severity={severity}
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--text-mute)" }}>Snapshot:</span>
      <span style={{ fontWeight: 600 }}>{relative}</span>
    </span>
  );
}
