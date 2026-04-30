"use client";

import { useState } from "react";
import type { CustomerProviderUsageDto } from "@/lib/api/types";
import { formatAtomic, formatTimestamp, shortAddr } from "@/lib/format";

const W = 720;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const NODE_R_CENTER = 22;
const RING_RADIUS = 110;

type Props = {
  address: string;
  providers: CustomerProviderUsageDto[];
};

type Node = {
  id: string;
  cx: number;
  cy: number;
  r: number;
  label: string;
  provider: CustomerProviderUsageDto;
};

function buildNodes(providers: CustomerProviderUsageDto[]): Node[] {
  if (providers.length === 0) return [];
  const maxTx = Math.max(...providers.map((p) => p.transactionCount), 1);
  return providers.map((p, i) => {
    // 上 (北) を 0° として時計回りに等角配置
    const angle = (2 * Math.PI * i) / providers.length - Math.PI / 2;
    const cx = CX + RING_RADIUS * Math.cos(angle);
    const cy = CY + RING_RADIUS * Math.sin(angle);
    const r = 8 + (p.transactionCount / maxTx) * 16;
    return { id: p.providerId, cx, cy, r, label: p.name, provider: p };
  });
}

export function NetworkStarChart({ address, providers }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  // 設計 §3.5: providers が空のときは何も描画しない (SC-1 #3 はこの分岐で担保)
  if (providers.length === 0) return null;

  const nodes = buildNodes(providers);
  const maxTx = Math.max(...providers.map((p) => p.transactionCount), 1);
  const hovered = hover ? nodes.find((n) => n.id === hover) ?? null : null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Co-usage map
        </div>
        <div className="display" style={{ fontSize: 14, color: "var(--text-2)" }}>
          Providers paid by this wallet, sized by transaction count
        </div>
      </div>

      <div style={{ position: "relative", padding: "12px 20px 20px" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {/* edges (中心 → 各ノード) */}
          {nodes.map((n) => {
            const strokeWidth = 0.6 + (n.provider.transactionCount / maxTx) * 1.6;
            const isActive = hover === n.id;
            return (
              <line
                key={`edge-${n.id}`}
                x1={CX}
                y1={CY}
                x2={n.cx}
                y2={n.cy}
                stroke={isActive ? "rgba(37,99,235,0.85)" : "rgba(37,99,235,0.30)"}
                strokeWidth={strokeWidth}
                style={{ transition: "stroke 180ms ease" }}
              />
            );
          })}

          {/* center node */}
          <g>
            <circle cx={CX} cy={CY} r={NODE_R_CENTER} fill="#0D9488" />
            <text
              x={CX}
              y={CY + 4}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="11"
              fill="white"
            >
              {shortAddr(address)}
            </text>
          </g>

          {/* peripheral nodes */}
          {/*
            アクセシビリティ方針: クリックで遷移しないので role="button" や tabIndex は付けない。
            tooltip は HTML overlay (詳細) と SVG <title> (フォールバック) の 2 系統で提供する。
          */}
          {nodes.map((n) => {
            const isHover = hover === n.id;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "default" }}
              >
                <title>{`${n.label}: ${n.provider.transactionCount} tx`}</title>
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r={n.r}
                  fill="#1D4ED8"
                  stroke="white"
                  strokeWidth={isHover ? 2 : 1}
                  style={{ transition: "stroke-width 180ms ease" }}
                />
                <text
                  x={n.cx}
                  y={n.cy + n.r + 14}
                  textAnchor="middle"
                  fontFamily="var(--mono)"
                  fontSize="11"
                  fill={isHover ? "var(--text-1)" : "var(--text-2)"}
                  style={{ transition: "fill 180ms ease" }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* tooltip (固定右上) */}
        {hovered && (
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              padding: "10px 12px",
              background: "rgba(15,23,42,0.92)",
              color: "white",
              borderRadius: 6,
              fontSize: 11.5,
              maxWidth: 240,
              pointerEvents: "none",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{hovered.label}</div>
            <div className="mono" style={{ fontSize: 10.5, opacity: 0.7, marginBottom: 6 }}>
              pay-to {shortAddr(hovered.provider.payToWallet)}
            </div>
            <div>tx: {hovered.provider.transactionCount}</div>
            <div>spend: {formatAtomic(hovered.provider.spendAtomic)}</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              last seen: {formatTimestamp(hovered.provider.lastSeenAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
