// Phase 7 E3: 7 日 volume の SVG sparkline. 外部依存なし.
// design.md §5.4 / requirements.md §4.1.

import type { Sdk7dVolumePoint } from "@/lib/sdk-fixtures/types";

type Props = {
  points: Sdk7dVolumePoint[];
  width?: number;
  height?: number;
};

export function Sparkline7d({ points, width = 180, height = 50 }: Props) {
  if (points.length === 0) return null;

  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const counts = points.map((p) => p.observationCount);
  const minV = Math.min(...counts);
  const maxV = Math.max(...counts);
  const range = Math.max(1, maxV - minV);

  const xs = points.map((_, i) =>
    points.length === 1 ? padX + innerW / 2 : padX + (i / (points.length - 1)) * innerW,
  );
  // SVG は y が下向き. 値が大きいほど y を小さくする.
  const ys = counts.map((v) => padY + innerH - ((v - minV) / range) * innerH);

  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  const last = points.length - 1;

  return (
    <svg
      data-testid="sparkline7d"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="7-day volume sparkline"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--mesh-blue)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xs[last]}
        cy={ys[last]}
        r={2.5}
        fill="var(--mesh-blue)"
      />
    </svg>
  );
}
