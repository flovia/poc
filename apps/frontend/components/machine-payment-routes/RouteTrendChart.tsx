"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  type Metric,
  type Period,
  type Point,
  type SourceKey,
  PERIOD_OPTIONS,
  SOURCE_META,
  SOURCES,
  axisLabel,
  buildDemoSeries,
  formatDateLabel,
  formatDelta,
  formatTableValue,
  formatTooltipDate,
  formatTooltipValue,
  formatValue,
  metricLabel,
  niceCeil,
  pickXLabelIndices,
} from "@/lib/machine-payment-routes/demo-series";

type Props = {
  providerId: string;
};

export function RouteTrendChart({ providerId }: Props) {
  const [period, setPeriod] = useState<Period>("1m");
  const [metric, setMetric] = useState<Metric>("requests");

  const days = PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? 30;
  const series = useMemo(() => buildDemoSeries(providerId, metric, days), [providerId, metric, days]);

  return (
    <section className="card" style={{ padding: 20, marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Route trends
          </div>
          <h2 style={{ margin: 0, fontSize: 18 }}>x402 vs Stripe MPP vs HitPay MPP</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SegmentedControl<Metric>
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "requests", label: "Requests" },
              { value: "revenue", label: "Revenue" },
              { value: "retention", label: "7D retention" },
            ]}
          />
          <SegmentedControl<Period>
            label="Period"
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>
      </div>

      <Legend />
      <Chart series={series} metric={metric} />
      <TrendTable series={series} metric={metric} />
    </section>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
      {SOURCES.map((key) => (
        <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 18,
              height: 2,
              background: SOURCE_META[key].color,
              borderRadius: 2,
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>{SOURCE_META[key].label}</span>
        </div>
      ))}
    </div>
  );
}

const W = 720;
const H = 240;
const PAD = { l: 56, r: 16, t: 16, b: 32 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

function Chart({
  series,
  metric,
}: {
  series: Point[];
  metric: Metric;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (series.length === 0) {
    return <div style={{ height: 180, color: "var(--text-mute)", fontSize: 13 }}>No data</div>;
  }

  const maxVal = Math.max(1, ...series.flatMap((p) => SOURCES.map((source) => p[source])));
  const niceMax = niceCeil(maxVal);

  const xToPx = (i: number) =>
    series.length === 1 ? PAD.l + innerW / 2 : PAD.l + (i / (series.length - 1)) * innerW;
  const yToPx = (v: number) => PAD.t + (1 - v / niceMax) * innerH;

  const buildPath = (key: SourceKey) =>
    series
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(i).toFixed(1)} ${yToPx(p[key]).toFixed(1)}`)
      .join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * niceMax);
  const xLabelIndices = pickXLabelIndices(series.length);

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // The SVG scales via viewBox/preserveAspectRatio, so map clientX → viewBox-x.
    const ratio = W / rect.width;
    const vx = (event.clientX - rect.left) * ratio;
    if (vx < PAD.l - 4 || vx > W - PAD.r + 4) {
      setHoverIndex(null);
      return;
    }
    const t = Math.min(1, Math.max(0, (vx - PAD.l) / innerW));
    const idx = Math.round(t * (series.length - 1));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => setHoverIndex(null);

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? xToPx(hoverIndex) : null;
  // Position tooltip in CSS % so it tracks the SVG's responsive width.
  const tooltipLeftPct = hoverX !== null ? (hoverX / W) * 100 : 0;
  // Flip tooltip to the left of the cursor when near the right edge.
  const flipLeft = tooltipLeftPct > 70;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`${metricLabel(metric)} over time by catalog source`}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              y1={yToPx(t)}
              x2={W - PAD.r}
              y2={yToPx(t)}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : "2 3"}
            />
            <text
              x={PAD.l - 8}
              y={yToPx(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={10}
              fill="var(--text-3)"
            >
              {formatValue(t, metric)}
            </text>
          </g>
        ))}

        {SOURCES.map((source) => (
          <path
            key={source}
            d={buildPath(source)}
            fill="none"
            stroke={SOURCE_META[source].color}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {xLabelIndices.map((i) => (
          <text
            key={i}
            x={xToPx(i)}
            y={H - PAD.b + 14}
            textAnchor="middle"
            fontSize={10}
            fill="var(--text-3)"
          >
            {formatDateLabel(series[i].date)}
          </text>
        ))}

        <text
          x={12}
          y={PAD.t + innerH / 2}
          transform={`rotate(-90 12 ${PAD.t + innerH / 2})`}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-mute)"
        >
          {axisLabel(metric)}
        </text>

        {hovered && hoverX !== null && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              y1={PAD.t}
              x2={hoverX}
              y2={H - PAD.b}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {SOURCES.map((source) => (
              <circle
                key={source}
                cx={hoverX}
                cy={yToPx(hovered[source])}
                r={3.5}
                fill="#fff"
                stroke={SOURCE_META[source].color}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {hovered && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            left: flipLeft ? undefined : `calc(${tooltipLeftPct}% + 12px)`,
            right: flipLeft ? `calc(${100 - tooltipLeftPct}% + 12px)` : undefined,
            background: "var(--surface-card, #fff)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 12,
            color: "var(--text-1)",
            boxShadow: "0 4px 12px rgba(15, 17, 21, 0.08)",
            pointerEvents: "none",
            minWidth: 140,
          }}
        >
          <div style={{ color: "var(--text-mute)", fontSize: 11, marginBottom: 4 }}>
            {formatTooltipDate(hovered.date)}
          </div>
          {SOURCES.map((source) => (
            <TooltipRow
              key={source}
              color={SOURCE_META[source].color}
              label={SOURCE_META[source].label}
              value={formatTooltipValue(hovered[source], metric)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        lineHeight: 1.5,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: 999, background: color, display: "inline-block" }}
        />
        <span style={{ color: "var(--text-2)" }}>{label}</span>
      </span>
      <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TrendTable({ series, metric }: { series: Point[]; metric: Metric }) {
  const rows = SOURCES.map((source) => buildTrendRow(source, series, metric));
  const aggregateLabel = metric === "retention" ? "avg" : "total";

  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
            <th style={{ padding: "9px 6px" }}>rail</th>
            <th style={{ padding: "9px 6px" }}>latest</th>
            <th style={{ padding: "9px 6px" }}>{aggregateLabel}</th>
            <th style={{ padding: "9px 6px" }}>vs period start</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 6px", fontWeight: 800 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: SOURCE_META[row.source].color,
                      display: "inline-block",
                    }}
                  />
                  {SOURCE_META[row.source].label}
                </span>
              </td>
              <td style={{ padding: "10px 6px" }}>{formatTableValue(row.latest, metric)}</td>
              <td style={{ padding: "10px 6px" }}>{formatTableValue(row.aggregate, metric)}</td>
              <td style={{ padding: "10px 6px", color: row.delta >= 0 ? "#15803d" : "#b91c1c" }}>
                {formatDelta(row.delta, metric)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildTrendRow(source: SourceKey, series: Point[], metric: Metric) {
  const first = series[0]?.[source] ?? 0;
  const latest = series.at(-1)?.[source] ?? 0;
  const sum = series.reduce((acc, point) => acc + point[source], 0);
  const average = sum / Math.max(1, series.length);
  return {
    source,
    latest,
    aggregate: metric === "retention" ? average : sum,
    delta: latest - first,
  };
}

function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--text-1)" : "var(--text-2)",
              background: active ? "var(--surface-muted, #f0f1f4)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
