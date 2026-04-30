"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";

export type ProviderBubble = {
  id: string;
  label: string;
  x: number; // 0..1
  y: number; // 0..1
  r: number;
  wallets: number;
  accent: "blue" | "teal" | "slate";
};

type BubbleChartProps = {
  bubbles: ProviderBubble[];
  hover: string | null;
  setHover: (id: string | null) => void;
  providerId: string;
};

const W = 720;
const H = 380;
const PAD = { l: 56, r: 24, t: 24, b: 48 };

const px = (x: number) => PAD.l + x * (W - PAD.l - PAD.r);
const py = (y: number) => H - PAD.b - y * (H - PAD.t - PAD.b);

export function BubbleChart({ bubbles, hover, setHover, providerId }: BubbleChartProps) {
  const router = useRouter();
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = (name: string) => `${gradientPrefix}-${name}`;

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
            Unique payer wallets × 14d-retained payer ratio
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Top-right = high-co-usage + high-retention partnership candidates · radius = wallet count
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
                <stop offset="0%" stopColor="rgba(45,212,191,0.16)" />
                <stop offset="60%" stopColor="rgba(96,165,250,0.04)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id={grad("bubblue")} cx="30%" cy="30%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#1E3A8A" />
              </radialGradient>
              <radialGradient id={grad("bubteal")} cx="30%" cy="30%">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#0F766E" />
              </radialGradient>
              <radialGradient id={grad("bubslate")} cx="30%" cy="30%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#334155" />
              </radialGradient>
            </defs>
            <rect
              x={PAD.l}
              y={PAD.t}
              width={W - PAD.l - PAD.r}
              height={H - PAD.t - PAD.b}
              fill={`url(#${grad("priority")})`}
            />

            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="rgba(148,163,184,0.25)" strokeWidth="1" />

            <text
              x={W / 2}
              y={H - 14}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="12"
              fill="var(--text-3)"
            >
              Unique payer wallets →
            </text>
            <text
              x={16}
              y={H / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${H / 2})`}
              fontFamily="var(--mono)"
              fontSize="12"
              fill="var(--text-3)"
            >
              14d-retained payer ratio →
            </text>

            {bubbles.map((b, i) => {
              const fill = `url(#${grad(`bub${b.accent}`)})`;
              const isHover = hover === b.id;
              const isDim = !!hover && hover !== b.id;
              return (
                <g
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.label}: ${b.wallets} wallets — open in customers`}
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
                  style={{ cursor: "pointer", transition: "opacity 180ms ease", opacity: isDim ? 0.35 : 1, outline: "none" }}
                >
                  <circle
                    cx={px(b.x)}
                    cy={py(b.y)}
                    r={b.r * 1.8}
                    fill={`rgba(96,165,250,${b.accent === "blue" ? 0.16 : b.accent === "teal" ? 0.12 : 0.04})`}
                    style={{ filter: "blur(8px)", transition: "all 180ms ease" }}
                  />
                  <circle
                    cx={px(b.x)}
                    cy={py(b.y)}
                    r={b.r}
                    fill={fill}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={isHover ? 1.6 : 0.6}
                    style={{
                      transition: "all 200ms ease",
                      animation: `bubble-in 500ms ${i * 60}ms both ease-out`,
                    }}
                  />
                  <text
                    x={px(b.x)}
                    y={py(b.y) - b.r - 8}
                    textAnchor="middle"
                    fontFamily="var(--mono)"
                    fontSize="12"
                    fontWeight="500"
                    fill={isHover ? "var(--text-1)" : "var(--text-2)"}
                    style={{ pointerEvents: "none", transition: "fill 180ms ease" }}
                  >
                    {b.label}
                  </text>
                  <text
                    x={px(b.x)}
                    y={py(b.y) + b.r + 14}
                    textAnchor="middle"
                    fontFamily="var(--mono)"
                    fontSize="11"
                    fill="var(--text-mute)"
                    style={{ pointerEvents: "none" }}
                  >
                    {b.wallets} wallets
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
