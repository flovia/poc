import type { CSSProperties, ReactNode } from "react";
import { EndpointSankey, type EndpointSankeyFlow } from "@/components/macro-metrics/EndpointSankey";
import { MacroRouteSankeySection } from "@/components/macro-metrics/MacroRouteSankeySection";
import { formatAtomic, formatRatioPct } from "@/lib/format";
import type {
  ApiGrowthServiceCandidate,
  ApiGrowthInsightCard,
  ApiGrowthInboundApiCohort,
  ApiGrowthIntelligence,
  ApiGrowthEndpointFlow,
  ApiGrowthRepeatCohort,
  SourceMediumQualityRow,
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DemoBadge />
            <h1 className="display" style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              API Growth Intelligence
            </h1>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
            <p style={{ maxWidth: 880, color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" }}>
              See where API users come from, what endpoints they repeat, why wallets come back,
              and where x402 / Agents packaging should improve adoption.
            </p>
          </div>
        </header>

        <InsightGrid cards={intelligence.insightCards} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 600px), 1fr))", gap: 14, alignItems: "start" }}>
          <SectionCard eyebrow="Source / Medium Adoption">
            <BubbleMatrix rows={intelligence.sourceMediumQuality.rows} />
          </SectionCard>

          <SectionCard eyebrow="Endpoint & Frequency">
            <EndpointFlow flows={intelligence.endpointFrequency.flows} />
          </SectionCard>

          <SectionCard eyebrow="Repeat Intelligence">
            <SourceRepeatCohort cohorts={intelligence.repeatCohorts} />
          </SectionCard>

          <SectionCard eyebrow="Other Service Candidates">
            <OtherServiceCandidates candidates={intelligence.otherServiceCandidates} />
          </SectionCard>
        </div>

        <section style={{ marginTop: 18 }}>
          <MacroRouteSankeySection
            chart={intelligence.routeSankey}
            periodLabel="Last 30 days demo"
          />
        </section>

        <section style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Growth Action Bridge
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 600px), 1fr))", gap: 14, alignItems: "start" }}>
            <SectionCard eyebrow="Inbound API cohorts">
              <InboundApiCohort cohorts={intelligence.inboundApiCohorts} />
            </SectionCard>
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

function DemoBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        background: "rgba(148,163,184,0.18)",
        color: "var(--text-3)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      demo
    </span>
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

function SectionCard({ eyebrow, title, children }: { eyebrow?: string; title?: ReactNode; children: ReactNode }) {
  const hasHeader = eyebrow || title;

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden", background: "var(--surface-card)", borderColor: "var(--line)", minWidth: 0 }}>
      {hasHeader && (
        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--line)" }}>
          {eyebrow && <div style={{ ...eyebrowStyle, marginBottom: 2 }}>{eyebrow}</div>}
          {title && <h2 className="display" style={{ fontSize: 15, margin: 0, fontWeight: 600, color: "var(--text-1)" }}>{title}</h2>}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

function BubbleMatrix({ rows }: { rows: SourceMediumQualityRow[] }) {
  const maxVolumeShare = Math.max(...rows.map((row) => row.volumeShare), 0.01);
  const chartWidth = 480;
  const plot = { left: 28, top: 14, right: 466, bottom: 204, splitX: 247, splitY: 109 };
  const bubbles = rows.map((row, index) => {
    const normalizedVolume = row.volumeShare / maxVolumeShare;
    const r = 8 + Math.min(row.endpointFrequency / 3, 18);
    return {
      row,
      index,
      r,
      x: plot.left + r + normalizedVolume * (plot.right - plot.left - r * 2),
      y: plot.bottom - r - row.repeatQuality * (plot.bottom - plot.top - r * 2),
    };
  });
  const labels = spreadBubbleLabels(
    bubbles.map((bubble) => ({
      source: bubble.row.source,
      x:
        bubble.x < plot.splitX
          ? bubble.x - bubble.r - bubbleLabelWidth(bubble.row.source) / 2 - 5
          : bubble.x + bubble.r + bubbleLabelWidth(bubble.row.source) / 2 + 5,
      y: bubble.y + 4,
    })),
    plot.top + 14,
    plot.bottom - 12,
    chartWidth,
  );

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 12, background: "var(--surface-card)", marginBottom: 14 }}>
      <svg viewBox={`0 0 ${chartWidth} 240`} role="img" aria-label="Source medium quality bubble matrix" style={{ width: "100%", height: 240, display: "block" }}>
        <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} fill="var(--surface-subtle)" />
        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={plot.splitX} y1={plot.top} x2={plot.splitX} y2={plot.bottom} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <line x1={plot.left} y1={plot.splitY} x2={plot.right} y2={plot.splitY} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={plot.left + 10} y={plot.top + 16} fill="var(--text-3)" fontSize="10" fontWeight="700">Niche adoption</text>
        <text x={plot.splitX + 56} y={plot.top + 16} fill="var(--mesh-blue)" fontSize="10" fontWeight="700">Scale / double down</text>
        <text x={plot.left + 10} y={plot.bottom - 10} fill="var(--text-mute)" fontSize="10">Low priority</text>
        <text x={plot.splitX + 40} y={plot.bottom - 10} fill="var(--text-3)" fontSize="10" fontWeight="700">Improve retention</text>
        {bubbles.map(({ row, index, r, x, y }) => {
          const label = labels[index];
          const labelWidth = bubbleLabelWidth(row.source);
          const labelSide = label.x < x ? -1 : 1;
          return (
            <g key={row.source}>
              <circle cx={x} cy={y} r={r} fill={index % 2 === 0 ? "var(--mesh-blue)" : "var(--teal)"} opacity="0.82" stroke="var(--surface-card)" strokeWidth="2" />
              <line x1={x + labelSide * (r + 2)} y1={y} x2={label.x - labelSide * (labelWidth / 2 + 1)} y2={label.y - 4} stroke="var(--line-strong)" strokeWidth="1" opacity="0.58" />
              <rect
                x={label.x - labelWidth / 2}
                y={label.y - 11}
                width={labelWidth}
                height="14"
                rx="4"
                fill="var(--surface-card)"
                stroke="var(--line)"
                opacity="0.94"
              />
              <text x={label.x} y={label.y} textAnchor="middle" fill="var(--text-2)" fontSize="10" fontWeight="700">{row.source}</text>
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

function spreadBubbleLabels(
  labels: Array<{ source: string; x: number; y: number }>,
  minY: number,
  maxY: number,
  chartWidth: number,
): Array<{ source: string; x: number; y: number }> {
  const minGap = 18;
  const sorted = labels
    .map((label, index) => ({
      ...label,
      index,
      x: clamp(label.x, 16 + bubbleLabelWidth(label.source) / 2, chartWidth - 16 - bubbleLabelWidth(label.source) / 2),
      y: clamp(label.y, minY, maxY),
    }))
    .sort((left, right) => left.y - right.y);

  for (let index = 1; index < sorted.length; index += 1) {
    sorted[index].y = Math.max(sorted[index].y, sorted[index - 1].y + minGap);
  }

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const maxAllowed = index === sorted.length - 1 ? maxY : sorted[index + 1].y - minGap;
    sorted[index].y = Math.min(sorted[index].y, maxAllowed);
  }

  return sorted
    .sort((left, right) => left.index - right.index)
    .map(({ source, x, y }) => ({ source, x, y }));
}

function bubbleLabelWidth(label: string): number {
  return Math.max(42, label.length * 5.8 + 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function SourceTable({ rows }: { rows: SourceMediumQualityRow[] }) {
  return (
    <div style={{ display: "grid", gap: 0, borderTop: "1px solid var(--line)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.55fr 0.85fr 0.7fr 0.85fr",
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
        <span style={{ textAlign: "right" }}>Activated</span>
        <span style={{ textAlign: "right" }}>W2 repeat</span>
        <span style={{ textAlign: "right" }}>Calls / wallet</span>
      </div>
      {rows.slice(0, 6).map((row) => (
        <div
          key={row.source}
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.55fr 0.85fr 0.7fr 0.85fr",
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
          <span className="mono" style={{ textAlign: "right", color: "var(--text-1)", fontWeight: 650 }}>{row.firstPaid} · {formatRatioPct(row.activationRate)}</span>
          <span className="mono" style={{ textAlign: "right", color: row.repeatQuality >= 0.7 ? "var(--teal)" : "var(--text-2)", fontWeight: 700 }}>{formatRatioPct(row.repeatQuality)}</span>
          <span className="mono" style={{ textAlign: "right", color: "var(--mesh-blue)", fontWeight: 700 }}>{row.endpointFrequency.toFixed(1)}</span>
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
      <div style={{ overflow: "hidden", display: "flex", justifyContent: "center", minWidth: 0 }}>
        <EndpointSankey
          flows={sankeyFlows}
          compact
          minWidth={0}
          margin={{ top: 12, right: 72, bottom: 12, left: 72 }}
        />
      </div>
      <div style={{ color: "var(--text-mute)", fontSize: 11, marginTop: 8 }}>
        Wider links indicate more observed paid transitions across repeated API sessions.
      </div>
    </div>
  );
}

function SourceRepeatCohort({ cohorts }: { cohorts: ApiGrowthRepeatCohort[] }) {
  if (cohorts.length === 0) return <p style={{ ...bodyText, margin: 0 }}>No repeat cohort in this offline snapshot.</p>;

  const columns: Array<{ key: keyof ApiGrowthRepeatCohort; label: string }> = [
    { key: "week0", label: "W0" },
    { key: "week1", label: "W1" },
    { key: "week2", label: "W2" },
    { key: "week3", label: "W3" },
  ];

  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={eyebrowStyle}>Source repeat cohort</div>
        <span style={{ color: "var(--text-mute)", fontSize: 11 }}>share of paid wallets active again</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr repeat(4, 0.55fr)", gap: 6, color: "var(--text-mute)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <span>Source cohort</span>
          {columns.map((column) => (
            <span key={column.label} style={{ textAlign: "center" }}>{column.label}</span>
          ))}
        </div>
        {cohorts.slice(0, 6).map((cohort) => (
          <div key={cohort.cohort} style={{ display: "grid", gridTemplateColumns: "1.15fr repeat(4, 0.55fr)", gap: 6, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cohort.cohort}</strong>
              <span style={{ color: "var(--text-mute)", fontSize: 10 }}>{cohort.paidWallets} paid wallets</span>
            </div>
            {columns.map((column) => {
              const value = Number(cohort[column.key]);
              return (
                <span
                  key={column.label}
                  className="mono"
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 28,
                    borderRadius: 6,
                    background: repeatCohortCellColor(value),
                    color: value >= 0.72 ? "#ffffff" : "var(--text-2)",
                    fontSize: 11,
                    fontWeight: 750,
                  }}
                >
                  {formatRatioPct(value)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function repeatCohortCellColor(value: number): string {
  if (value >= 0.85) return "var(--mesh-blue)";
  if (value >= 0.72) return "var(--teal)";
  if (value >= 0.55) return "rgba(20, 184, 166, 0.16)";
  return "var(--surface-muted)";
}

function OtherServiceCandidates({
  candidates,
}: {
  candidates: ApiGrowthServiceCandidate[];
}) {
  if (candidates.length === 0) {
    return <p style={{ ...bodyText, margin: 0 }}>No cross-service candidates in this offline snapshot.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {candidates.slice(0, 4).map((candidate) => (
        <div key={candidate.serviceId} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 6 }}>
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

function InboundApiCohort({ cohorts }: { cohorts: ApiGrowthInboundApiCohort[] }) {
  if (cohorts.length === 0) return null;

  const columns: Array<{ key: keyof ApiGrowthInboundApiCohort; label: string }> = [
    { key: "week0", label: "W0" },
    { key: "week1", label: "W1" },
    { key: "week2", label: "W2" },
    { key: "week3", label: "W3" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ color: "var(--text-mute)", fontSize: 11 }}>return after trying this API</span>
      </div>
      <p style={{ ...bodyText, margin: "0 0 8px", fontSize: 12 }}>
        Customers with prior activity on another API, grouped by that observed API, then measured by
        whether they returned after trying this API.
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.5fr repeat(4, 0.48fr)", gap: 6, color: "var(--text-mute)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <span>Origin API</span>
          <span style={{ textAlign: "right" }}>Tried</span>
          {columns.map((column) => (
            <span key={column.label} style={{ textAlign: "center" }}>{column.label}</span>
          ))}
        </div>
        {cohorts.map((cohort) => (
          <div key={cohort.originApi} style={{ display: "grid", gridTemplateColumns: "1.15fr 0.5fr repeat(4, 0.48fr)", gap: 6, alignItems: "center" }}>
            <strong style={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{cohort.originApi}</strong>
            <span className="mono" style={{ color: "var(--text-2)", fontSize: 11, fontWeight: 750, textAlign: "right" }}>{cohort.triedWallets}</span>
            {columns.map((column) => {
              const value = Number(cohort[column.key]);
              return (
                <span
                  key={column.label}
                  className="mono"
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 26,
                    borderRadius: 6,
                    background: repeatCohortCellColor(value),
                    color: value >= 0.72 ? "#ffffff" : "var(--text-2)",
                    fontSize: 10,
                    fontWeight: 750,
                  }}
                >
                  {formatRatioPct(value)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
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

function insightColor(tone: ApiGrowthInsightCard["tone"]): string {
  if (tone === "teal") return "var(--teal)";
  if (tone === "warn") return "var(--warn)";
  return "var(--mesh-blue)";
}
