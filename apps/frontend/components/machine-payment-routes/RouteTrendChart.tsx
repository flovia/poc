"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Period = "1w" | "1m" | "3m";
type Metric = "requests" | "revenue" | "retention";
type SourceKey = "x402" | "stripeMpp" | "hitPayMpp";

type Props = {
  providerId: string;
};

type Point = Record<SourceKey, number> & { date: Date };

const PERIOD_OPTIONS: ReadonlyArray<{ value: Period; label: string; days: number }> = [
  { value: "1w", label: "1 week", days: 7 },
  { value: "1m", label: "1 month", days: 30 },
  { value: "3m", label: "3 months", days: 90 },
];

const SOURCE_META: Record<SourceKey, { label: string; color: string }> = {
  x402: { label: "x402", color: "var(--teal)" },
  stripeMpp: { label: "Stripe MPP", color: "var(--mesh-blue)" },
  hitPayMpp: { label: "HitPay MPP", color: "#8b5cf6" },
};

const SOURCES: readonly SourceKey[] = ["x402", "stripeMpp", "hitPayMpp"];

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

// Deterministic demo series. Requests are generated first; revenue is derived
// as requests × per-call USD price. The unit price is seeded only by the
// provider+source (not by metric or day) so it stays stable across renders and
// keeps the relationship "fewer requests ⇒ less revenue" intuitive.
function buildDemoSeries(providerId: string, metric: Metric, days: number): Point[] {
  const seed = hashString(`${providerId}:requests`);
  const profiles = Object.fromEntries(
    SOURCES.map((source, index) => [source, buildSourceProfile(providerId, source, seed, index)]),
  ) as Record<SourceKey, SourceProfile>;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const points: Point[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const i = days - 1 - d;
    const t = i;
    const weekday = date.getDay();
    // Weekend dip — small, deterministic.
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.78 : 1;

    const values = Object.fromEntries(
      SOURCES.map((source) => {
        const profile = profiles[source];
        const wave =
          Math.sin((i / days) * Math.PI * profile.period + profile.phase) * profile.wave;
        const jitter = pseudo(profile.seed + i) * 0.18 - 0.09;
        const requests = Math.max(
          0,
          profile.baseRequests *
            (1 + profile.slope * (t / Math.max(1, days))) *
            (1 + wave + jitter) *
            weekendFactor,
        );
        const retention = retentionRate(source, i, days, requests, profile.baseRequests);
        return [source, normalizeMetricValue(metric, metricValue(metric, requests, profile.unitPrice, retention))];
      }),
    ) as Record<SourceKey, number>;

    points.push({
      date,
      ...values,
    });
  }
  return points;
}

type SourceProfile = {
  seed: number;
  baseRequests: number;
  unitPrice: number;
  slope: number;
  wave: number;
  period: number;
  phase: number;
};

function buildSourceProfile(
  providerId: string,
  source: SourceKey,
  baseSeed: number,
  index: number,
): SourceProfile {
  const seed = (baseSeed ^ hashString(source)) >>> 0;
  const volumeMultiplier = source === "x402" ? 170 : source === "stripeMpp" ? 120 : 90;
  return {
    seed,
    baseRequests: (650 + (seed % 1300)) * volumeMultiplier,
    unitPrice: 0.02 + pseudo(hashString(`${providerId}:${source}:price`)) * 0.08,
    slope: ((seed >> 8) % 100) / 1000 - 0.015 + index * 0.008,
    wave: 0.16 + index * 0.025,
    period: 1.8 + index * 0.45,
    phase: (seed % 360) * (Math.PI / 180),
  };
}

function metricValue(
  metric: Metric,
  requests: number,
  unitPrice: number,
  retention: number,
): number {
  if (metric === "requests") return requests;
  if (metric === "revenue") return requests * unitPrice;
  return retention;
}

function normalizeMetricValue(metric: Metric, value: number): number {
  if (metric === "requests") return Math.round(value);
  if (metric === "retention") return Number(value.toFixed(3));
  return Number(value.toFixed(2));
}

function retentionRate(
  source: SourceKey,
  dayIndex: number,
  days: number,
  requests: number,
  baseRequests: number,
): number {
  const seed = hashString(`${source}:retention`);
  const sourceBase = source === "x402" ? 0.32 : source === "stripeMpp" ? 0.68 : 0.5;
  const maturityLift = (dayIndex / Math.max(1, days - 1)) * (source === "x402" ? 0.1 : 0.14);
  const trafficLift = Math.min(0.14, Math.max(-0.12, requests / Math.max(1, baseRequests) - 1) * 0.24);
  const waveSize = source === "stripeMpp" ? 0.045 : 0.07;
  const wave = Math.sin((dayIndex / Math.max(1, days)) * Math.PI * 2.4 + (seed % 180)) * waveSize;
  const jitter = pseudo(seed + dayIndex) * 0.05 - 0.025;
  return clamp(sourceBase + maturityLift + trafficLift + wave + jitter, 0.15, 0.9);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pseudo(seed: number): number {
  // Mulberry32 — keeps full precision across large seeds (sin-based variants
  // collapse to near-constants once the seed grows beyond ~2^20, which made
  // some lines visibly flat).
  let s = (seed | 0) + 0x6d2b79f5;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const n = value / base;
  let nice: number;
  if (n <= 1) nice = 1;
  else if (n <= 2) nice = 2;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function formatValue(value: number, metric: Metric): string {
  if (metric === "retention") return `${(value * 100).toFixed(0)}%`;
  if (metric === "revenue") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

function metricLabel(metric: Metric): string {
  if (metric === "requests") return "Request count";
  if (metric === "revenue") return "Revenue";
  return "7-day retention rate";
}

function axisLabel(metric: Metric): string {
  if (metric === "requests") return "Requests / day";
  if (metric === "revenue") return "Revenue / day (USD)";
  return "7-day retention rate";
}

function formatDateLabel(date: Date): string {
  const m = date.toLocaleString(undefined, { month: "short" });
  const d = date.getDate();
  return `${m} ${d}`;
}

function formatTooltipValue(value: number, metric: Metric): string {
  if (metric === "retention") return `${(value * 100).toFixed(1)}% retained`;
  if (metric === "revenue") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(value).toLocaleString()} req`;
}

function formatTooltipDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function pickXLabelIndices(n: number): number[] {
  if (n <= 1) return [0];
  const target = Math.min(6, n);
  const step = (n - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(Math.round(i * step));
  return Array.from(new Set(out));
}
