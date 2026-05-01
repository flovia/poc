import type { ReactNode } from "react";
import type {
  CatalogMetric,
  CatalogPreview,
  CatalogPriority,
  CatalogStatus,
  MetricsCatalogViewModel,
} from "@/lib/macro-metrics/catalog";

type Props = {
  catalog: MetricsCatalogViewModel;
};

const PRIORITIES: CatalogPriority[] = ["P0", "P1", "P2", "P3"];

export function MetricsCatalogScreen({ catalog }: Props) {
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1560, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Full metrics catalog · demo/proxy review surface
          </div>
          <h1 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Full Metrics Catalog
          </h1>
          <p style={{ maxWidth: 820, color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" }}>
            Every requested P0/P1/P2/P3 metric is represented with what it means, why it matters,
            recommended visualization, current support status, and a realistic demo preview.
          </p>
        </header>

        <SummaryStrip catalog={catalog} />

        {PRIORITIES.map((priority) => {
          const items = catalog.byPriority[priority] ?? [];
          if (items.length === 0) return null;
          return (
            <section key={priority} style={{ marginTop: 30 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {priority} · {items.length} metrics
              </div>
              <h2 className="display" style={{ fontSize: 23, fontWeight: 650, margin: "0 0 14px" }}>
                {priorityTitle(priority)}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
                {items.map((item) => (
                  <MetricCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SummaryStrip({ catalog }: Props) {
  const summary = catalog.summary;
  const cards = [
    { label: "Total metrics", value: summary.total, hint: "P0–P3 requested catalog" },
    { label: "Supported", value: summary.supported, hint: "derived from current demo model" },
    { label: "Demo proxy", value: summary.demoProxy, hint: "illustrative but visible" },
    { label: "Needs live data", value: summary.needsLiveData, hint: "latency / error telemetry" },
    { label: "Future analytics", value: summary.futureAnalytics, hint: "statistical / clustering" },
  ];

  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
      {cards.map((card) => (
        <div key={card.label} className="card" style={{ padding: "14px 16px", background: "#fff" }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>
            {card.label}
          </div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
            {card.value}
          </div>
          <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 3 }}>{card.hint}</div>
        </div>
      ))}
    </section>
  );
}

function MetricCard({ item }: { item: CatalogMetric }) {
  return (
    <article className="card" style={{ padding: 18, background: "var(--surface-card)", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
            <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
            <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 680, lineHeight: 1.3 }}>{item.title}</h3>
        </div>
        <span className="mono" style={{ color: "var(--text-mute)", fontSize: 11, whiteSpace: "nowrap" }}>
          {item.visualization}
        </span>
      </div>

      <Definition label="Represents">{item.represents}</Definition>
      <Definition label="Why it matters">{item.whyItMatters}</Definition>
      {item.caveat && <Definition label="Caveat">{item.caveat}</Definition>}
      <Preview preview={item.preview} />
    </article>
  );
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p style={{ margin: "8px 0", color: "var(--text-3)", fontSize: 13, lineHeight: 1.5 }}>
      <strong style={{ color: "var(--text-1)", fontWeight: 650 }}>{label}: </strong>
      {children}
    </p>
  );
}

function Preview({ preview }: { preview: CatalogPreview }) {
  return (
    <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }}>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--text-1)" }}>
        {preview.headline}
      </div>
      {preview.kind === "kpi" && <Rows rows={preview.rows ?? []} />}
      {preview.kind === "bars" && <Bars rows={preview.rows ?? []} />}
      {preview.kind === "table" && <Rows rows={preview.rows ?? []} />}
      {preview.kind === "flow" && <Rows rows={preview.rows ?? []} arrows />}
      {preview.kind === "heatmap" && <Heatmap cells={preview.cells ?? []} />}
      {preview.kind === "quadrant" && <Scatter points={preview.points ?? []} quadrant />}
      {preview.kind === "scatter" && <Scatter points={preview.points ?? []} />}
      {preview.kind === "cluster" && <Scatter points={preview.points ?? []} cluster />}
      {preview.kind === "forest" && <Forest rows={preview.rows ?? []} />}
      {preview.kind === "box" && <BoxRows rows={preview.rows ?? []} />}
    </div>
  );
}

function Rows({ rows, arrows }: { rows: NonNullable<CatalogPreview["rows"]>; arrows?: boolean }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, fontSize: 13 }}>
          <span style={{ color: "var(--text-2)", minWidth: 0 }}>{arrows ? row.label.replace(" → ", "  →  ") : row.label}</span>
          <span className="mono" style={{ color: "var(--text-1)", fontWeight: 650 }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Bars({ rows }: { rows: NonNullable<CatalogPreview["rows"]> }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--text-2)", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
            <span className="mono" style={{ color: "var(--text-1)", fontWeight: 650 }}>{row.value}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((row.share ?? 0.25) * 100)}%`, background: "var(--mesh-blue)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ cells }: { cells: NonNullable<CatalogPreview["cells"]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: 5 }}>
      {cells.map((cell) => (
        <div key={`${cell.x}-${cell.y}`} title={`${cell.y} × ${cell.x}`} style={{ minHeight: 34, borderRadius: 5, background: `rgba(45,127,249,${0.1 + cell.value * 0.78})`, color: "var(--text-1)", fontSize: 11, padding: 6 }}>
          {cell.label ?? `${cell.x}`}
        </div>
      ))}
    </div>
  );
}

function Scatter({ points, quadrant, cluster }: { points: NonNullable<CatalogPreview["points"]>; quadrant?: boolean; cluster?: boolean }) {
  return (
    <div style={{ position: "relative", height: 130, border: "1px solid var(--line)", borderRadius: 8, background: quadrant ? "linear-gradient(90deg, transparent 49%, var(--line) 50%, transparent 51%), linear-gradient(0deg, transparent 49%, var(--line) 50%, transparent 51%)" : "var(--bg-elev-2)" }}>
      {points.map((point) => (
        <div key={point.label} title={point.label} style={{ position: "absolute", left: `${point.x * 86 + 5}%`, bottom: `${point.y * 78 + 8}%`, transform: "translate(-50%, 50%)", width: `${16 + (point.size ?? 0.4) * 18}px`, height: `${16 + (point.size ?? 0.4) * 18}px`, borderRadius: cluster ? 6 : "50%", background: cluster ? "var(--teal)" : "var(--mesh-blue)", opacity: 0.82 }} />
      ))}
    </div>
  );
}

function Forest({ rows }: { rows: NonNullable<CatalogPreview["rows"]> }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr 58px", gap: 8, alignItems: "center", fontSize: 12 }}>
          <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
          <div style={{ height: 2, background: "var(--line)", position: "relative" }}>
            <span style={{ position: "absolute", left: `${Math.round((row.share ?? 0.5) * 100)}%`, top: -5, width: 12, height: 12, borderRadius: "50%", background: "var(--teal)" }} />
          </div>
          <span className="mono" style={{ textAlign: "right", fontWeight: 650 }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function BoxRows({ rows }: { rows: NonNullable<CatalogPreview["rows"]> }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 10, alignItems: "center", fontSize: 12 }}>
          <span style={{ color: "var(--text-2)" }}>{row.label}</span>
          <div style={{ height: 10, borderRadius: 5, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${Math.round((row.share ?? 0.5) * 100)}%`, height: "100%", background: "var(--teal)" }} />
          </div>
          <span className="mono" style={{ fontWeight: 650 }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Badge({ tone, children }: { tone: "blue" | "teal" | "amber" | "slate" | "purple"; children: ReactNode }) {
  return (
    <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", ...badgeStyle(tone) }}>
      {children}
    </span>
  );
}

function priorityTitle(priority: CatalogPriority): string {
  if (priority === "P0") return "MVP-critical metrics";
  if (priority === "P1") return "Differentiation metrics after MVP";
  if (priority === "P2") return "Growth, pricing, and reliability metrics";
  return "Advanced analytics / future differentiation";
}

function statusLabel(status: CatalogStatus): string {
  return status.replace(/-/g, " ");
}

function priorityTone(priority: CatalogPriority) {
  if (priority === "P0") return "teal" as const;
  if (priority === "P1") return "blue" as const;
  if (priority === "P2") return "amber" as const;
  return "purple" as const;
}

function statusTone(status: CatalogStatus) {
  if (status === "supported") return "teal" as const;
  if (status === "demo-proxy") return "blue" as const;
  if (status === "needs-live-data") return "amber" as const;
  return "purple" as const;
}

function badgeStyle(tone: "blue" | "teal" | "amber" | "slate" | "purple") {
  if (tone === "teal") return { background: "rgba(20,184,166,0.13)", color: "var(--teal)" };
  if (tone === "blue") return { background: "rgba(45,127,249,0.13)", color: "var(--mesh-blue)" };
  if (tone === "amber") return { background: "rgba(245,158,11,0.15)", color: "#B45309" };
  if (tone === "purple") return { background: "rgba(124,58,237,0.13)", color: "#6D28D9" };
  return { background: "rgba(148,163,184,0.14)", color: "var(--text-3)" };
}
