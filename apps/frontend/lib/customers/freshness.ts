export type SnapshotSeverity = "fresh" | "stale" | "outdated" | "unknown";

export type SnapshotAgeDescriptor = {
  relative: string;
  absolute: string | null;
  severity: SnapshotSeverity;
};

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const STALE_THRESHOLD_MS = 24 * ONE_HOUR_MS;
const OUTDATED_THRESHOLD_MS = 7 * ONE_DAY_MS;

export function describeSnapshotAge(
  generatedAt: string | undefined,
  nowMs: number = Date.now(),
): SnapshotAgeDescriptor {
  if (!generatedAt) {
    return { relative: "unknown", absolute: null, severity: "unknown" };
  }
  const generatedMs = Date.parse(generatedAt);
  if (Number.isNaN(generatedMs)) {
    return { relative: "unknown", absolute: null, severity: "unknown" };
  }
  const ageMs = Math.max(0, nowMs - generatedMs);
  const severity: SnapshotSeverity =
    ageMs >= OUTDATED_THRESHOLD_MS ? "outdated" : ageMs >= STALE_THRESHOLD_MS ? "stale" : "fresh";

  return {
    relative: formatRelative(ageMs),
    absolute: generatedAt,
    severity,
  };
}

function formatRelative(ageMs: number): string {
  if (ageMs < ONE_MINUTE_MS) return "just now";
  if (ageMs < ONE_HOUR_MS) return `${Math.floor(ageMs / ONE_MINUTE_MS)}m ago`;
  if (ageMs < ONE_DAY_MS) return `${Math.floor(ageMs / ONE_HOUR_MS)}h ago`;
  return `${Math.floor(ageMs / ONE_DAY_MS)}d ago`;
}
