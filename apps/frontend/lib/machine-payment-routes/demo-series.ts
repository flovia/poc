export type Period = "1w" | "1m" | "3m";
export type Metric = "requests" | "revenue" | "retention";
export type SourceKey = "x402" | "stripeMpp" | "hitPayMpp";

export type Point = Record<SourceKey, number> & { date: Date };

export const PERIOD_OPTIONS: ReadonlyArray<{ value: Period; label: string; days: number }> = [
  { value: "1w", label: "1 week", days: 7 },
  { value: "1m", label: "1 month", days: 30 },
  { value: "3m", label: "3 months", days: 90 },
];

export const SOURCE_META: Record<SourceKey, { label: string; color: string }> = {
  x402: { label: "x402", color: "var(--teal)" },
  stripeMpp: { label: "Stripe MPP", color: "var(--mesh-blue)" },
  hitPayMpp: { label: "HitPay MPP", color: "#8b5cf6" },
};

export const SOURCES: readonly SourceKey[] = ["x402", "stripeMpp", "hitPayMpp"];

// Deterministic demo series. Requests are generated first; revenue is derived
// as requests × per-call USD price. The unit price is seeded only by the
// provider+source (not by metric or day) so it stays stable across renders and
// keeps the relationship "fewer requests ⇒ less revenue" intuitive.
export function buildDemoSeries(providerId: string, metric: Metric, days: number): Point[] {
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
        const wave = Math.sin((i / days) * Math.PI * profile.period + profile.phase) * profile.wave;
        const jitter = pseudo(profile.seed + i) * 0.18 - 0.09;
        const requests = Math.max(
          0,
          profile.baseRequests *
            (1 + profile.slope * (t / Math.max(1, days))) *
            (1 + wave + jitter) *
            weekendFactor,
        );
        const retention = retentionRate(source, i, days, requests, profile.baseRequests);
        return [
          source,
          normalizeMetricValue(metric, metricValue(metric, requests, profile.unitPrice, retention)),
        ];
      }),
    ) as Record<SourceKey, number>;

    points.push({
      date,
      ...values,
    });
  }
  return points;
}

export type SourceProfile = {
  seed: number;
  baseRequests: number;
  unitPrice: number;
  slope: number;
  wave: number;
  period: number;
  phase: number;
};

export function buildSourceProfile(
  providerId: string,
  source: SourceKey,
  baseSeed: number,
  index: number,
): SourceProfile {
  const seed = (baseSeed ^ hashString(source)) >>> 0;
  const dailyBase = source === "x402" ? 115000 : source === "stripeMpp" ? 92000 : 68000;
  const requestVariance = pseudo(seed) * 0.16 - 0.08;
  return {
    seed,
    baseRequests: dailyBase * (1 + requestVariance),
    unitPrice: unitPriceFor(providerId, source),
    slope: trendSlopeFor(source, seed),
    wave: 0.06 + index * 0.01,
    period: 1.8 + index * 0.45,
    phase: (seed % 360) * (Math.PI / 180),
  };
}

export function unitPriceFor(providerId: string, source: SourceKey): number {
  const variance = pseudo(hashString(`${providerId}:${source}:price`)) * 0.0002 - 0.0001;
  if (source === "x402") return 0.00095 + variance;
  if (source === "stripeMpp") return 0.00108 + variance;
  return 0.001 + variance;
}

export function trendSlopeFor(source: SourceKey, seed: number): number {
  const variance = (((seed >> 8) % 20) - 10) / 1000;
  if (source === "x402") return -0.4 + variance;
  if (source === "stripeMpp") return 0.32 + variance;
  return 0.42 + variance;
}

export function metricValue(
  metric: Metric,
  requests: number,
  unitPrice: number,
  retention: number,
): number {
  if (metric === "requests") return requests;
  if (metric === "revenue") return requests * unitPrice;
  return retention;
}

export function normalizeMetricValue(metric: Metric, value: number): number {
  if (metric === "requests") return Math.round(value);
  if (metric === "retention") return Number(value.toFixed(3));
  return Number(value.toFixed(2));
}

export function retentionRate(
  source: SourceKey,
  dayIndex: number,
  days: number,
  requests: number,
  baseRequests: number,
): number {
  const seed = hashString(`${source}:retention`);
  const sourceBase = source === "x402" ? 0.32 : source === "stripeMpp" ? 0.68 : 0.5;
  const maturitySlope = source === "x402" ? -0.18 : source === "stripeMpp" ? 0.14 : 0.2;
  const maturityLift = (dayIndex / Math.max(1, days - 1)) * maturitySlope;
  const trafficLift = Math.min(
    0.14,
    Math.max(-0.12, requests / Math.max(1, baseRequests) - 1) * 0.24,
  );
  const waveSize = source === "stripeMpp" ? 0.025 : 0.035;
  const wave = Math.sin((dayIndex / Math.max(1, days)) * Math.PI * 2.4 + (seed % 180)) * waveSize;
  const jitter = pseudo(seed + dayIndex) * 0.05 - 0.025;
  return clamp(sourceBase + maturityLift + trafficLift + wave + jitter, 0.15, 0.9);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pseudo(seed: number): number {
  // Mulberry32 — keeps full precision across large seeds (sin-based variants
  // collapse to near-constants once the seed grows beyond ~2^20, which made
  // some lines visibly flat).
  let s = (seed | 0) + 0x6d2b79f5;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
}

export function niceCeil(value: number): number {
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

export function formatValue(value: number, metric: Metric): string {
  if (metric === "retention") return `${(value * 100).toFixed(0)}%`;
  if (metric === "revenue") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

export function metricLabel(metric: Metric): string {
  if (metric === "requests") return "Request count";
  if (metric === "revenue") return "Revenue";
  return "7-day retention rate";
}

export function axisLabel(metric: Metric): string {
  if (metric === "requests") return "Requests / day";
  if (metric === "revenue") return "Revenue / day (USD)";
  return "7-day retention rate";
}

export function formatDateLabel(date: Date): string {
  const m = date.toLocaleString(undefined, { month: "short" });
  const d = date.getDate();
  return `${m} ${d}`;
}

export function formatTooltipValue(value: number, metric: Metric): string {
  if (metric === "retention") return `${(value * 100).toFixed(1)}% retained`;
  if (metric === "revenue") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(value).toLocaleString()} req`;
}

export function formatTableValue(value: number, metric: Metric): string {
  if (metric === "retention") return `${(value * 100).toFixed(1)}%`;
  if (metric === "revenue") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return Math.round(value).toLocaleString();
}

export function formatDelta(value: number, metric: Metric): string {
  const sign = value >= 0 ? "+" : "";
  if (metric === "retention") return `${sign}${(value * 100).toFixed(1)} pt`;
  return `${sign}${formatTableValue(value, metric)}`;
}

export function formatTooltipDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function pickXLabelIndices(n: number): number[] {
  if (n <= 1) return [0];
  const target = Math.min(6, n);
  const step = (n - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(Math.round(i * step));
  return Array.from(new Set(out));
}
