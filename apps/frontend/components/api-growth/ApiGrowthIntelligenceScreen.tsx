import type { CSSProperties, ReactNode } from "react";
import { EndpointSankey, type EndpointSankeyFlow } from "@/components/macro-metrics/EndpointSankey";
import { formatAtomic, formatRatioPct } from "@/lib/format";
import type {
  ApiGrowthServiceCandidate,
  ApiGrowthInsightCard,
  ApiGrowthIntelligence,
  ApiGrowthEndpointFlow,
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
              See where API users come from, what endpoints they repeat, which workflows look
              agent-ready, and where x402 / Agents packaging should improve adoption.
            </p>
            <FilterChips />
          </div>
        </header>

        <InsightGrid cards={intelligence.insightCards} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr) minmax(340px, 1fr)", gap: 14, alignItems: "start" }}>
          <SectionCard eyebrow="Source / Medium Adoption" title="Where users come from">
            <BubbleMatrix rows={intelligence.sourceMediumQuality.rows} />
            <SourceTable rows={intelligence.sourceMediumQuality.rows} />
          </SectionCard>

          <SectionCard eyebrow="Endpoint & Frequency" title="What they use repeatedly">
            <EndpointBars rows={intelligence.endpointFrequency.rows} />
            <EndpointFlow flows={intelligence.endpointFrequency.flows} />
          </SectionCard>

          <SectionCard eyebrow="x402 / Agents Fit" title="Which workflows are packageable">
            <UseCaseCards cards={intelligence.useCaseFit.cards} />
            <FitMatrix cards={intelligence.useCaseFit.cards} />
          </SectionCard>
        </div>

        <section style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Growth Action Bridge
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 0.86fr) minmax(420px, 1.14fr)", gap: 14, alignItems: "start" }}>
            <SectionCard eyebrow="Other Service Candidates" title="Adjacent API opportunities">
              <OtherServiceCandidates candidates={intelligence.otherServiceCandidates} />
            </SectionCard>

            <SectionCard
              eyebrow="Growth Actions"
              title={(
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Recommended growth actions
                  <AiGeneratedTooltip />
                </span>
              )}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
                {intelligence.recommendations.map((recommendation) => (
                  <div
                    key={recommendation.title}
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr auto",
                      minHeight: 172,
                      padding: 14,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--surface-card)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                      <strong style={{ fontSize: 14, lineHeight: 1.35 }}>{recommendation.title}</strong>
                      <PriorityBadge priority={recommendation.priority} />
                    </div>
                    <p style={{ ...bodyText, margin: "0 0 12px" }}>{recommendation.reason}</p>
                    <div style={{ display: "grid", gap: 8, paddingTop: 10, borderTop: "1px solid var(--line)", color: "var(--text-3)", fontSize: 12 }}>
                      <div style={actionMetaRowStyle}>
                        <span style={actionMetaLabelStyle}>Next step</span>
                        <span style={actionMetaValueStyle}>{recommendation.target}</span>
                      </div>
                      <div style={actionMetaRowStyle}>
                        <span style={actionMetaLabelStyle}>Evidence</span>
                        <span className="mono" style={actionMetaValueStyle}>{recommendation.metric}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
          <p style={{ color: "var(--text-mute)", fontSize: 12, margin: "12px 0 0" }}>{intelligence.proxyNote}</p>
        </section>
      </div>
    </div>
  );
}

const bodyText: CSSProperties = { color: "var(--text-3)", fontSize: 13, lineHeight: 1.55, margin: "6px 0 12px" };

const actionMetaRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  gap: 10,
  alignItems: "baseline",
};

const actionMetaLabelStyle: CSSProperties = {
  color: "var(--text-mute)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const actionMetaValueStyle: CSSProperties = {
  minWidth: 0,
  color: "var(--text-2)",
  lineHeight: 1.35,
};

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

function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
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

function AiGeneratedTooltip() {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        aria-label="AI-generated actions"
        className="api-growth-ai-trigger"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "var(--surface-muted)",
          color: "var(--text-3)",
          cursor: "help",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none">
          <rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="2.2" r="1" fill="currentColor" />
          <circle cx="6.2" cy="8.7" r="0.8" fill="currentColor" />
          <circle cx="9.8" cy="8.7" r="0.8" fill="currentColor" />
          <path d="M6.2 11h3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span
        style={{
          position: "absolute",
          zIndex: 10,
          left: "50%",
          top: "calc(100% + 8px)",
          width: 260,
          transform: "translateX(-50%)",
          padding: "9px 10px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "var(--surface-card)",
          boxShadow: "var(--shadow-2)",
          color: "var(--text-2)",
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.45,
          opacity: 0,
          pointerEvents: "none",
        }}
        className="api-growth-ai-tooltip"
      >
        Generated by AI from source, repeat wallet, endpoint frequency, and adjacent API signals.
      </span>
      <style>{`.api-growth-ai-trigger:hover + .api-growth-ai-tooltip, .api-growth-ai-trigger:focus + .api-growth-ai-tooltip { opacity: 1 !important; }`}</style>
    </span>
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
        <text x={plot.left + 10} y={plot.top + 16} fill="var(--text-3)" fontSize="10" fontWeight="700">Niche adoption</text>
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
        <text x="10" y={(plot.top + plot.bottom) / 2} transform={`rotate(-90 10 ${(plot.top + plot.bottom) / 2})`} textAnchor="middle" fill="var(--text-3)" fontSize="11">Repeat adoption</text>
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
    <div style={{ display: "grid", gap: 0, borderTop: "1px solid var(--line)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 0.6fr 0.7fr 0.7fr 0.85fr",
          gap: 8,
          padding: "8px 0",
          color: "var(--text-mute)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>Source</span>
        <span style={{ textAlign: "right" }}>Wallets</span>
        <span style={{ textAlign: "right" }}>First paid</span>
        <span style={{ textAlign: "right" }}>W2 repeat</span>
        <span style={{ textAlign: "right" }}>Calls / wallet</span>
      </div>
      {rows.slice(0, 6).map((row) => (
        <div
          key={row.source}
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.6fr 0.7fr 0.7fr 0.85fr",
            gap: 8,
            alignItems: "center",
            padding: "10px 0",
            borderTop: "1px solid var(--line)",
            fontSize: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{row.source}</strong>
          </div>
          <span className="mono" style={{ textAlign: "right", color: "var(--text-1)", fontWeight: 650 }}>{row.wallets}</span>
          <span className="mono" style={{ textAlign: "right", color: "var(--text-1)", fontWeight: 650 }}>{row.firstPaid}</span>
          <span className="mono" style={{ textAlign: "right", color: row.repeatQuality >= 0.7 ? "var(--teal)" : "var(--text-2)", fontWeight: 700 }}>{formatRatioPct(row.repeatQuality)}</span>
          <span className="mono" style={{ textAlign: "right", color: "var(--mesh-blue)", fontWeight: 700 }}>{row.endpointFrequency.toFixed(1)}</span>
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
            <span className="mono" style={{ color: "var(--text-3)" }}>{row.paidFrequency.toLocaleString()} calls</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: "var(--surface-muted)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(6, (row.paidFrequency / max) * 100)}%`, height: "100%", background: "var(--mesh-blue)" }} />
          </div>
          <div style={{ color: "var(--text-mute)", fontSize: 11, marginTop: 3 }}>{row.wallets} wallets · {row.callsPerWallet} calls / wallet · {row.repeatSessions} repeat sessions</div>
        </div>
      ))}
    </div>
  );
}

function EndpointFlow({ flows }: { flows: ApiGrowthEndpointFlow[] }) {
  const sankeyFlows: EndpointSankeyFlow[] = flows;
  const strongestFlow = [...flows].sort((left, right) => right.occurrences - left.occurrences)[0];

  return (
    <div style={{ padding: 14, borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
        <div style={eyebrowStyle}>Repeated endpoint transitions</div>
        {strongestFlow && (
          <span className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>
            top path: {strongestFlow.from} → {strongestFlow.to}
          </span>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <EndpointSankey flows={sankeyFlows} compact />
      </div>
      <div style={{ color: "var(--text-mute)", fontSize: 11, marginTop: 8 }}>
        Wider links indicate more observed paid transitions across repeated API sessions.
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
            <strong style={{ fontSize: 13 }}>{card.endpointFlow}</strong>
            <PriorityBadge priority={card.productPriority} />
          </div>
          <div style={{ color: "var(--text-3)", fontSize: 12, marginBottom: 8 }}>
            likely use case: {card.useCase} · {card.sourceMix}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--text-mute)", fontSize: 11, marginBottom: 8 }}>
            <span>Frequency</span>
            <span className="mono" style={{ color: "var(--text-2)", fontWeight: 650 }}>{card.frequency.toFixed(1)} calls / wallet</span>
          </div>
          <ScorePills agentFit={card.agentFit} x402Fit={card.x402Fit} confidence={card.confidence} />
        </div>
      ))}
    </div>
  );
}

function FitMatrix({ cards }: { cards: UseCaseFitCard[] }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Package fit matrix</div>
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

function OtherServiceCandidates({ candidates }: { candidates: ApiGrowthServiceCandidate[] }) {
  if (candidates.length === 0) {
    return <p style={{ ...bodyText, margin: 0 }}>No cross-service candidates in this offline snapshot.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ ...bodyText, margin: "0 0 2px" }}>
        APIs with high overlap among repeat wallets using this provider. Ranked by shared wallet
        count, spend, and workflow fit.
      </p>
      {candidates.slice(0, 4).map((candidate) => (
        <div key={candidate.serviceId} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 8 }}>
            <div>
              <strong style={{ fontSize: 14 }}>{candidate.serviceName}</strong>
            </div>
            <span className="mono" style={{ color: "var(--mesh-blue)", fontSize: 12, fontWeight: 800 }}>{formatRatioPct(candidate.confidence)} fit</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "var(--text-3)", fontSize: 12 }}>
            <span>{candidate.sharedWallets} shared wallets</span>
            <span className="mono">${formatAtomic(candidate.sharedSpendAtomic, 6, 0)} paid spend</span>
          </div>
        </div>
      ))}
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
