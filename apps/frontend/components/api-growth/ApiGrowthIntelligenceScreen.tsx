import type { CSSProperties, ReactNode } from "react";
import { formatRatioPct } from "@/lib/format";
import type {
  ApiGrowthInsightCard,
  ApiGrowthIntelligence,
  EndpointFrequencyRow,
  SourceMediumQualityRow,
  UseCaseFitCard,
} from "@/lib/api-growth/metrics";

type Props = {
  intelligence: ApiGrowthIntelligence;
};

export function ApiGrowthIntelligenceScreen({ intelligence }: Props) {
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1680, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Growth intelligence · API adoption
          </div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            API Growth Intelligence
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
            <p style={{ maxWidth: 880, color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" }}>
              See where API users come from, what endpoints they use, which use cases look agent-like,
              and where x402 / Agents packaging should improve adoption.
            </p>
            <FilterChips />
          </div>
        </header>

        <InsightGrid cards={intelligence.insightCards} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr) minmax(340px, 1fr)", gap: 14, alignItems: "start" }}>
          <SectionCard eyebrow="Source / Medium Quality" title="Where users come from">
            <BubbleMatrix rows={intelligence.sourceMediumQuality.rows} />
            <SourceTable rows={intelligence.sourceMediumQuality.rows} />
          </SectionCard>

          <SectionCard eyebrow="Endpoint & Frequency" title="What they use repeatedly">
            <EndpointBars rows={intelligence.endpointFrequency.rows} />
            <EndpointFlow flow={intelligence.endpointFrequency.flow} />
          </SectionCard>

          <SectionCard eyebrow="Use Case & x402 / Agents Fit" title="What they are trying to do">
            <UseCaseCards cards={intelligence.useCaseFit.cards} />
            <FitMatrix cards={intelligence.useCaseFit.cards} />
          </SectionCard>
        </div>

        <section style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            GTM & Product Recommendations
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {intelligence.recommendations.map((recommendation) => (
              <div key={recommendation.title} className="card" style={{ padding: 16, background: "var(--surface-card)", borderColor: "var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{recommendation.title}</strong>
                  <PriorityBadge priority={recommendation.priority} />
                </div>
                <p style={bodyText}>{recommendation.reason}</p>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "var(--text-3)", fontSize: 12 }}>
                  <span>{recommendation.target}</span>
                  <span className="mono">{recommendation.metric}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--text-mute)", fontSize: 12, margin: "12px 0 0" }}>{intelligence.proxyNote}</p>
        </section>
      </div>
    </div>
  );
}

const bodyText: CSSProperties = { color: "var(--text-3)", fontSize: 13, lineHeight: 1.55, margin: "6px 0 12px" };

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-mute)",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function FilterChips() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {["30d", "All sources", "All endpoints", "x402 fit", "Confidence"].map((label) => (
        <span key={label} style={chipStyle}>
          {label}
        </span>
      ))}
    </div>
  );
}

function InsightGrid({ cards }: { cards: ApiGrowthInsightCard[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
      {cards.map((card) => (
        <div key={card.label} className="card" style={{ padding: "8px 14px", borderRadius: 10, background: "var(--surface-card)", borderColor: "var(--line)", boxShadow: "var(--shadow-1)" }}>
          <div style={eyebrowStyle}>{card.label}</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 2, color: insightColor(card.tone), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {card.value}
          </div>
          <div style={{ color: "var(--text-mute)", fontSize: 11, marginTop: 1 }}>{card.note}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 0, overflow: "hidden", background: "var(--surface-card)", borderColor: "var(--line)", minWidth: 0 }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ ...eyebrowStyle, marginBottom: 2 }}>{eyebrow}</div>
        <h2 className="display" style={{ fontSize: 15, margin: 0, fontWeight: 600, color: "var(--text-1)" }}>{title}</h2>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

function BubbleMatrix({ rows }: { rows: SourceMediumQualityRow[] }) {
  const maxVolumeShare = Math.max(...rows.map((row) => row.volumeShare), 0.01);
  const plot = { left: 28, top: 14, right: 346, bottom: 204, splitX: 187, splitY: 109 };
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 12, background: "var(--surface-card)", marginBottom: 14 }}>
      <svg viewBox="0 0 360 240" role="img" aria-label="Source medium quality bubble matrix" style={{ width: "100%", height: 240, display: "block" }}>
        <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} fill="var(--surface-subtle)" />
        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={plot.splitX} y1={plot.top} x2={plot.splitX} y2={plot.bottom} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <line x1={plot.left} y1={plot.splitY} x2={plot.right} y2={plot.splitY} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={plot.left + 10} y={plot.top + 16} fill="var(--text-3)" fontSize="10" fontWeight="700">Niche quality</text>
        <text x={plot.splitX + 56} y={plot.top + 16} fill="var(--mesh-blue)" fontSize="10" fontWeight="700">Scale / double down</text>
        <text x={plot.left + 10} y={plot.bottom - 10} fill="var(--text-mute)" fontSize="10">Low priority</text>
        <text x={plot.splitX + 40} y={plot.bottom - 10} fill="var(--text-3)" fontSize="10" fontWeight="700">Improve retention</text>
        {rows.map((row, index) => {
          const normalizedVolume = row.volumeShare / maxVolumeShare;
          const r = 8 + Math.min(row.endpointFrequency / 3, 18);
          const x = plot.left + r + normalizedVolume * (plot.right - plot.left - r * 2);
          const y = plot.bottom - r - row.repeatQuality * (plot.bottom - plot.top - r * 2);
          return (
            <g key={row.source}>
              <circle cx={x} cy={y} r={r} fill={index % 2 === 0 ? "var(--mesh-blue)" : "var(--teal)"} opacity="0.82" stroke="var(--surface-card)" strokeWidth="2" />
              <text x={x} y={y + r + 13} textAnchor="middle" fill="var(--text-2)" fontSize="10" fontWeight="700">{row.source}</text>
            </g>
          );
        })}
        <text x={(plot.left + plot.right) / 2} y="228" textAnchor="middle" fill="var(--text-3)" fontSize="11">Acquisition volume, normalized to largest source</text>
        <text x="10" y={(plot.top + plot.bottom) / 2} transform={`rotate(-90 10 ${(plot.top + plot.bottom) / 2})`} textAnchor="middle" fill="var(--text-3)" fontSize="11">Repeat quality</text>
      </svg>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={chipStyle}>bubble = paid endpoint frequency</span>
        <span style={chipStyle}>color = use case mix</span>
      </div>
    </div>
  );
}

function SourceTable({ rows }: { rows: SourceMediumQualityRow[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.slice(0, 6).map((row) => (
        <div key={row.source} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{row.source}</strong>
            <div style={{ color: "var(--text-3)", fontSize: 12 }}>{row.wallets} wallets · {row.useCaseMix}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ color: "var(--mesh-blue)", fontWeight: 700 }}>{Math.round(row.qualityScore * 100)}</div>
            <div style={{ color: "var(--text-mute)", fontSize: 11 }}>quality</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EndpointBars({ rows }: { rows: EndpointFrequencyRow[] }) {
  const max = Math.max(...rows.map((row) => row.paidFrequency), 1);
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
      {rows.map((row) => (
        <div key={row.endpoint}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 5 }}>
            <strong>{row.endpoint}</strong>
            <span className="mono" style={{ color: "var(--text-3)" }}>{row.callsPerWallet} calls / wallet</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: "var(--surface-muted)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(6, (row.paidFrequency / max) * 100)}%`, height: "100%", background: "var(--mesh-blue)" }} />
          </div>
          <div style={{ color: "var(--text-mute)", fontSize: 11, marginTop: 3 }}>{row.wallets} wallets · {row.repeatSessions} repeat sessions</div>
        </div>
      ))}
    </div>
  );
}

function EndpointFlow({ flow }: { flow: EndpointFrequencyRow["endpoint"][] }) {
  return (
    <div style={{ padding: 14, borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-card)" }}>
      <div style={{ ...eyebrowStyle, marginBottom: 10 }}>repeat flow = agent-like signal</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {flow.map((endpoint, index) => (
          <span key={endpoint} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="mono" style={{ padding: "6px 8px", borderRadius: 4, background: "var(--surface-muted)", border: "1px solid var(--line)", fontSize: 12 }}>{endpoint}</span>
            {index < flow.length - 1 && <span style={{ color: "var(--text-3)", fontWeight: 700 }}>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function UseCaseCards({ cards }: { cards: UseCaseFitCard[] }) {
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      {cards.slice(0, 4).map((card) => (
        <div key={card.useCase} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--surface-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>{card.useCase}</strong>
            <PriorityBadge priority={card.productPriority} />
          </div>
          <div style={{ color: "var(--text-3)", fontSize: 12, marginBottom: 8 }}>{card.endpointFlow} · {card.sourceMix}</div>
          <ScorePills agentFit={card.agentFit} x402Fit={card.x402Fit} confidence={card.confidence} />
        </div>
      ))}
    </div>
  );
}

function FitMatrix({ cards }: { cards: UseCaseFitCard[] }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Fit matrix</div>
      <div style={{ display: "grid", gap: 8 }}>
        {cards.slice(0, 3).map((card) => (
          <div key={card.useCase} style={{ display: "grid", gridTemplateColumns: "1fr 54px 54px", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.useCase}</span>
            <span className="mono" style={{ color: "var(--mesh-blue)", fontWeight: 700 }}>{Math.round(card.agentFit * 100)}</span>
            <span className="mono" style={{ color: "var(--teal)", fontWeight: 700 }}>{Math.round(card.x402Fit * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorePills({ agentFit, x402Fit, confidence }: { agentFit: number; x402Fit: number; confidence: number }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <span style={scorePillStyle}>Agent fit {formatRatioPct(agentFit)}</span>
      <span style={scorePillStyle}>x402 fit {formatRatioPct(x402Fit)}</span>
      <span style={scorePillStyle}>confidence {formatRatioPct(confidence)}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "P0" | "P1" | "P2" }) {
  const color = priority === "P0" ? "var(--mesh-blue)" : priority === "P1" ? "var(--teal)" : "var(--warn)";
  return <span className="mono" style={{ color, fontWeight: 800, fontSize: 12 }}>{priority}</span>;
}

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--surface-card)",
  padding: "6px 9px",
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
};

const scorePillStyle: CSSProperties = {
  borderRadius: 999,
  background: "var(--surface-muted)",
  color: "var(--text-2)",
  padding: "4px 7px",
  fontSize: 11,
  fontWeight: 650,
};

function insightColor(tone: ApiGrowthInsightCard["tone"]): string {
  if (tone === "teal") return "var(--teal)";
  if (tone === "warn") return "var(--warn)";
  return "var(--mesh-blue)";
}
