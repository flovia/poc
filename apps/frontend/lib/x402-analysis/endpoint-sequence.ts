const DEFAULT_MAX_ENDPOINT_SEQUENCE_ROWS = 8;

export const MIN_ENDPOINT_SEQUENCE_LABELS = 4;
export const MIN_BEFORE_TARGET_ENDPOINT_SEQUENCE_LABELS = 5;
export const MAX_ENDPOINT_SEQUENCE_LABELS = 6;

export const DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS = {
  left: MIN_BEFORE_TARGET_ENDPOINT_SEQUENCE_LABELS,
  mid: MIN_ENDPOINT_SEQUENCE_LABELS,
  right: MIN_ENDPOINT_SEQUENCE_LABELS,
} as const;

export const DEFAULT_ENDPOINT_SEQUENCE_MAX_LABELS = {
  left: MAX_ENDPOINT_SEQUENCE_LABELS,
  mid: MAX_ENDPOINT_SEQUENCE_LABELS,
  right: MAX_ENDPOINT_SEQUENCE_LABELS,
} as const;

type EndpointSequenceRepresentativeRow = {
  left_label: string;
  middle_label: string;
  right_label: string;
  flow_count: number;
  settled_usdc: number;
};

type LayerSets = {
  left: Set<string>;
  mid: Set<string>;
  right: Set<string>;
};

type EndpointSequenceLayer = keyof LayerSets;
type LayerLabelLimits = Record<EndpointSequenceLayer, number>;

function compareRows<T extends EndpointSequenceRepresentativeRow>(left: T, right: T): number {
  if (right.flow_count !== left.flow_count) return right.flow_count - left.flow_count;
  if (right.settled_usdc !== left.settled_usdc) return right.settled_usdc - left.settled_usdc;
  return rowKey(left).localeCompare(rowKey(right));
}

function rowKey<T extends EndpointSequenceRepresentativeRow>(row: T): string {
  return `${row.left_label}|${row.middle_label}|${row.right_label}`;
}

function createLayerSets<T extends EndpointSequenceRepresentativeRow>(
  rows: readonly T[],
): LayerSets {
  return {
    left: new Set(rows.map((row) => row.left_label)),
    mid: new Set(rows.map((row) => row.middle_label)),
    right: new Set(rows.map((row) => row.right_label)),
  };
}

function normalizeLayerLabelLimits(
  limits: Partial<LayerLabelLimits> | undefined,
  fallback: LayerLabelLimits,
): LayerLabelLimits {
  return {
    left: limits?.left ?? fallback.left,
    mid: limits?.mid ?? fallback.mid,
    right: limits?.right ?? fallback.right,
  };
}

function maxLayerLimit(limits: LayerLabelLimits): number {
  return Math.max(limits.left, limits.mid, limits.right);
}

function wouldExceedMax<T extends EndpointSequenceRepresentativeRow>(
  row: T,
  sets: LayerSets,
  maxUniquePerLayer: LayerLabelLimits,
): boolean {
  return (
    (!sets.left.has(row.left_label) && sets.left.size >= maxUniquePerLayer.left) ||
    (!sets.mid.has(row.middle_label) && sets.mid.size >= maxUniquePerLayer.mid) ||
    (!sets.right.has(row.right_label) && sets.right.size >= maxUniquePerLayer.right)
  );
}

function totalNewLabels<T extends EndpointSequenceRepresentativeRow>(
  row: T,
  sets: LayerSets,
): number {
  return (
    Number(!sets.left.has(row.left_label)) +
    Number(!sets.mid.has(row.middle_label)) +
    Number(!sets.right.has(row.right_label))
  );
}

function coverageGain<T extends EndpointSequenceRepresentativeRow>(
  row: T,
  sets: LayerSets,
  minUniquePerLayer: LayerLabelLimits,
): number {
  return (
    Number(sets.left.size < minUniquePerLayer.left && !sets.left.has(row.left_label)) +
    Number(sets.mid.size < minUniquePerLayer.mid && !sets.mid.has(row.middle_label)) +
    Number(sets.right.size < minUniquePerLayer.right && !sets.right.has(row.right_label))
  );
}

function addRowLabels<T extends EndpointSequenceRepresentativeRow>(row: T, sets: LayerSets): void {
  sets.left.add(row.left_label);
  sets.mid.add(row.middle_label);
  sets.right.add(row.right_label);
}

export function countEndpointSequenceLayerLabels<T extends EndpointSequenceRepresentativeRow>(
  rows: readonly T[],
) {
  const sets = createLayerSets(rows);
  return {
    left: sets.left.size,
    mid: sets.mid.size,
    right: sets.right.size,
  };
}

export function selectRepresentativeEndpointSequenceRows<
  T extends EndpointSequenceRepresentativeRow,
>(
  rows: readonly T[],
  options?: {
    minUniquePerLayer?: Partial<LayerLabelLimits>;
    maxUniquePerLayer?: Partial<LayerLabelLimits>;
    maxRows?: number;
    seedRows?: readonly T[];
  },
): T[] {
  const minUniquePerLayer = normalizeLayerLabelLimits(
    options?.minUniquePerLayer,
    DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS,
  );
  const maxUniquePerLayer = normalizeLayerLabelLimits(
    options?.maxUniquePerLayer,
    DEFAULT_ENDPOINT_SEQUENCE_MAX_LABELS,
  );
  const maxRows = Math.max(
    maxLayerLimit(minUniquePerLayer),
    options?.maxRows ?? DEFAULT_MAX_ENDPOINT_SEQUENCE_ROWS,
  );
  const candidates = [...rows].sort(compareRows);
  const selected = [...(options?.seedRows ?? [])];
  const selectedIndexes = new Set<number>();
  const selectedKeys = new Set(selected.map((row) => rowKey(row)));
  const sets = createLayerSets(selected);

  while (selected.length < maxRows) {
    const needsCoverage =
      sets.left.size < minUniquePerLayer.left ||
      sets.mid.size < minUniquePerLayer.mid ||
      sets.right.size < minUniquePerLayer.right;

    let bestIndex = -1;
    let bestCoverage = -1;
    let bestNewLabels = -1;

    for (const [index, row] of candidates.entries()) {
      if (selectedIndexes.has(index)) continue;
      if (selectedKeys.has(rowKey(row))) continue;
      if (wouldExceedMax(row, sets, maxUniquePerLayer)) continue;

      const rowCoverage = coverageGain(row, sets, minUniquePerLayer);
      if (needsCoverage && rowCoverage === 0) continue;

      const rowNewLabels = totalNewLabels(row, sets);
      const currentBest = bestIndex === -1 ? null : candidates[bestIndex];

      const isBetter =
        rowCoverage > bestCoverage ||
        (rowCoverage === bestCoverage && rowNewLabels > bestNewLabels) ||
        (rowCoverage === bestCoverage &&
          rowNewLabels === bestNewLabels &&
          currentBest !== null &&
          compareRows(row, currentBest) < 0);

      if (bestIndex === -1 || isBetter) {
        bestIndex = index;
        bestCoverage = rowCoverage;
        bestNewLabels = rowNewLabels;
      }
    }

    if (bestIndex === -1) break;

    selectedIndexes.add(bestIndex);
    const row = candidates[bestIndex];
    if (!row) break;
    selected.push(row);
    selectedKeys.add(rowKey(row));
    addRowLabels(row, sets);
  }

  if (selected.length === 0) return candidates.slice(0, Math.min(maxRows, candidates.length));
  return [...selected].sort(compareRows);
}
