"use client";

import { useId, useMemo } from "react";
import { useRouter } from "next/navigation";

export type ProviderBubble = {
  id: string;
  label: string;
  fullLabel: string;
  wallets: number;
  observations: number;
  obsPerPayer: number; // observations / unique payer wallets
  r: number;
  accent: "blue" | "teal" | "slate";
};

type BubbleChartProps = {
  bubbles: ProviderBubble[];
  hover: string | null;
  setHover: (id: string | null) => void;
  providerId: string;
};

const W = 960;
const H = 460;
const PAD = { l: 64, r: 28, t: 28, b: 56 };

// X 軸は 1〜N (N は payer wallets 数の最大値) のロングテールになる。
// 線形だと N=1 の小さなバブル群が左端で団子になるので log スケールを使う。
function makeXScale(maxWallets: number) {
  const min = 1;
  const max = Math.max(maxWallets, 2);
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  const span = lmax - lmin || 1;
  return (wallets: number) => {
    const clamped = Math.max(min, wallets);
    const t = (Math.log10(clamped) - lmin) / span;
    return PAD.l + t * (W - PAD.l - PAD.r);
  };
}

// Y は obs/payer (1.0 が "1人1回ヒット")。下端は 1 ではなく 0.5 で
// 1.0 のバブルを軸線にめり込ませない。上端は max + 1 の余白を確保。
function makeYScale(maxObsPerPayer: number) {
  const min = 0.5;
  const max = Math.max(maxObsPerPayer + 0.5, 1.5);
  const top = PAD.t + 12;
  const bottom = H - PAD.b - 12;
  return (value: number) => {
    const t = (Math.max(min, Math.min(max, value)) - min) / (max - min);
    return bottom - t * (bottom - top);
  };
}

// X 軸目盛は 1, 2, 5, 10, 20, 50, 100... の "nice" な値だけ拾う。
function xTicks(maxWallets: number): number[] {
  const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const upper = Math.max(maxWallets, 2);
  const ticks = candidates.filter((v) => v <= upper);
  if (ticks.at(-1) !== upper) ticks.push(upper);
  return ticks;
}

// Y 軸目盛は 1, 2, 3, 5, 10, 20... を max まで。
function yTicks(maxObsPerPayer: number): number[] {
  const candidates = [1, 2, 3, 5, 10, 20, 50];
  const upper = Math.max(Math.ceil(maxObsPerPayer), 2);
  const ticks = candidates.filter((v) => v <= upper);
  if (ticks.at(-1) !== upper) ticks.push(upper);
  return ticks;
}

export function BubbleChart({ bubbles, hover, setHover, providerId }: BubbleChartProps) {
  const router = useRouter();
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = (name: string) => `${gradientPrefix}-${name}`;

  const maxWallets = useMemo(
    () => bubbles.reduce((acc, b) => Math.max(acc, b.wallets), 1),
    [bubbles],
  );
  const maxObsPerPayer = useMemo(
    () => bubbles.reduce((acc, b) => Math.max(acc, b.obsPerPayer), 1),
    [bubbles],
  );
  const x = useMemo(() => makeXScale(maxWallets), [maxWallets]);
  const y = useMemo(() => makeYScale(maxObsPerPayer), [maxObsPerPayer]);
  const ticksX = useMemo(() => xTicks(maxWallets), [maxWallets]);
  const ticksY = useMemo(() => yTicks(maxObsPerPayer), [maxObsPerPayer]);

  const openBubble = (id: string) => {
    router.push(`/providers/${providerId}/customers?co-used=${encodeURIComponent(id)}`);
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        borderColor: "var(--line)",
        background: "#FFFFFF",
      }}
    >
      <div
        style={{
          padding: "14px 18px 10px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-mute)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            Provider relevance map
          </div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>
            Unique payer wallets × observations per payer
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Top-right = high reach + high repeat-usage partnership candidates · radius = wallet count
        </div>
      </div>

      <div style={{ position: "relative", padding: "18px 12px 12px" }}>
        {bubbles.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            BFF wallet-usage graph is empty.
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
            <defs>
              <radialGradient id={grad("priority")} cx="100%" cy="0%" r="80%">
                <stop offset="0%" style={{ stopColor: "var(--bubble-priority-from)" }} />
                <stop offset="60%" style={{ stopColor: "var(--bubble-priority-mid)" }} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id={grad("bubblue")} cx="30%" cy="30%">
                <stop offset="0%" style={{ stopColor: "var(--bubble-blue-from)" }} />
                <stop offset="100%" style={{ stopColor: "var(--bubble-blue-to)" }} />
              </radialGradient>
              <radialGradient id={grad("bubteal")} cx="30%" cy="30%">
                <stop offset="0%" style={{ stopColor: "var(--bubble-teal-from)" }} />
                <stop offset="100%" style={{ stopColor: "var(--bubble-teal-to)" }} />
              </radialGradient>
              <radialGradient id={grad("bubslate")} cx="30%" cy="30%">
                <stop offset="0%" style={{ stopColor: "var(--bubble-slate-from)" }} />
                <stop offset="100%" style={{ stopColor: "var(--bubble-slate-to)" }} />
              </radialGradient>
            </defs>

            {/* top-right priority gradient */}
            <rect
              x={PAD.l}
              y={PAD.t}
              width={W - PAD.l - PAD.r}
              height={H - PAD.t - PAD.b}
              fill={`url(#${grad("priority")})`}
            />

            {/* y grid + ticks */}
            {ticksY.map((t) => (
              <g key={`y-${t}`}>
                <line
                  x1={PAD.l}
                  y1={y(t)}
                  x2={W - PAD.r}
                  y2={y(t)}
                  stroke="rgba(148,163,184,0.18)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD.l - 10}
                  y={y(t) + 4}
                  textAnchor="end"
                  fontFamily="var(--mono)"
                  fontSize="11"
                  fill="var(--text-3)"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* x ticks */}
            {ticksX.map((tick) => (
              <g key={`x-${tick}`}>
                <line
                  x1={x(tick)}
                  y1={H - PAD.b}
                  x2={x(tick)}
                  y2={H - PAD.b + 5}
                  stroke="rgba(148,163,184,0.45)"
                  strokeWidth={1}
                />
                <text
                  x={x(tick)}
                  y={H - PAD.b + 18}
                  textAnchor="middle"
                  fontFamily="var(--mono)"
                  fontSize="11"
                  fill="var(--text-3)"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* axes */}
            <line
              x1={PAD.l}
              y1={H - PAD.b}
              x2={W - PAD.r}
              y2={H - PAD.b}
              stroke="rgba(148,163,184,0.45)"
              strokeWidth={1}
            />
            <line
              x1={PAD.l}
              y1={PAD.t}
              x2={PAD.l}
              y2={H - PAD.b}
              stroke="rgba(148,163,184,0.45)"
              strokeWidth={1}
            />

            {/* axis titles */}
            <text
              x={(PAD.l + W - PAD.r) / 2}
              y={H - 12}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="12"
              fill="var(--text-2)"
            >
              Unique payer wallets (log) →
            </text>
            <text
              x={18}
              y={(PAD.t + H - PAD.b) / 2}
              textAnchor="middle"
              transform={`rotate(-90 18 ${(PAD.t + H - PAD.b) / 2})`}
              fontFamily="var(--mono)"
              fontSize="12"
              fill="var(--text-2)"
            >
              Observations per payer →
            </text>

            {bubbles.map((b, i) => {
              const fill = `url(#${grad(`bub${b.accent}`)})`;
              const isHover = hover === b.id;
              const isDim = !!hover && hover !== b.id;
              const cx = x(b.wallets);
              const cy = y(b.obsPerPayer);
              return (
                <g
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.fullLabel}: ${b.wallets} wallets, ${b.obsPerPayer.toFixed(
                    1,
                  )} observations per payer — open in customers`}
                  onMouseEnter={() => setHover(b.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(b.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => openBubble(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBubble(b.id);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "opacity 180ms ease",
                    opacity: isDim ? 0.3 : 1,
                    outline: "none",
                  }}
                >
                  <title>
                    {b.fullLabel} — {b.wallets} payer wallets · {b.observations} observations ·
                    {b.obsPerPayer.toFixed(1)} obs/payer
                  </title>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={b.r * 1.8}
                    fill={`rgba(47, 93, 154, ${b.accent === "blue" ? 0.16 : b.accent === "teal" ? 0.12 : 0.04})`}
                    style={{ filter: "blur(8px)", transition: "all 180ms ease" }}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={b.r}
                    fill={fill}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={isHover ? 1.6 : 0.6}
                    style={{
                      transition: "all 200ms ease",
                      animation: `bubble-in 500ms ${i * 60}ms both ease-out`,
                    }}
                  />
                  {isHover && (
                    <text
                      x={cx}
                      y={cy - b.r - 8}
                      textAnchor="middle"
                      fontFamily="var(--mono)"
                      fontSize="12"
                      fontWeight="500"
                      fill="var(--text-1)"
                      style={{ pointerEvents: "none" }}
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
