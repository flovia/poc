import type { CSSProperties, ReactNode } from "react";
import { formatAtomic, formatRatioPct, shortAddr } from "@/lib/format";
import type { MacroMetricsViewModel, TrendPoint } from "@/lib/macro-metrics/metrics";

type Props = {
  metrics: MacroMetricsViewModel;
};

export function MacroMetricsScreen({ metrics }: Props) {
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1560, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Demo macro analytics · CEO view
          </div>
          <h1 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Macro Metrics Dashboard
          </h1>
          <p style={{ maxWidth: 820, color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" }}>
            A realistic offline demo comparing monetization, repeat usage, ecosystem adjacency,
            endpoint behavior, and growth actions for the Northwind Price API workflow.
          </p>
        </header>

        <ExecutiveTakeaways items={metrics.executiveTakeaways} note={metrics.proxyNote} />

        <Section title="Overview" eyebrow="P0 macro KPIs">
          <KpiGrid>
            <KpiCard label="Paid active wallets" value={metrics.overview.paidActiveWallets} hint="wallets with paid demo usage" />
            <KpiCard label="Total spend" value={formatAtomic(metrics.overview.totalSpendAtomic, 6, 2)} hint="USDC-denominated atomic demo spend" />
            <KpiCard label="Paid usage / tx" value={metrics.overview.paidUsageTxCount} hint="paid endpoint transactions" />
            <KpiCard label="7d / 30d trend" value={`${formatAtomic(metrics.overview.trend7dSpendAtomic, 6, 1)} / ${formatAtomic(metrics.overview.trend30dSpendAtomic, 6, 1)}`} hint="spend in last 7 / 30 days" />
          </KpiGrid>
          <TrendCard trend7d={metrics.overview.trend7d} trend30d={metrics.overview.trend30d} />
        </Section>

        <Section title="Customer / Wallet Intelligence" eyebrow="Spend concentration and repeat">
          <TwoColumn>
            <Card title="Pareto chart for spend concentration" eyebrow="P0">
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--mesh-blue)" }}>
                {formatRatioPct(metrics.spendConcentration.topThreeWalletShare)}
              </div>
              <p style={bodyText}>Top 3 wallets account for total spend share. {metrics.spendConcentration.walletCountForHalfSpend} wallet(s) reach 50% of spend.</p>
              <BarList
                rows={metrics.spendConcentration.rankedWallets.slice(0, 5).map((wallet) => ({
                  label: wallet.label,
                  value: formatAtomic(wallet.spendAtomic, 6, 1),
                  share: wallet.share,
                }))}
              />
            </Card>
            <Card title="Repeat wallet summary" eyebrow="P0">
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--teal)" }}>
                {formatRatioPct(metrics.repeatSummary.repeatWalletRate)}
              </div>
              <p style={bodyText}>{metrics.repeatSummary.repeatedWallets} of {metrics.repeatSummary.totalWallets} wallets repeat, averaging {metrics.repeatSummary.averageSessionsPerRepeatedWallet.toFixed(1)} sessions per repeated wallet.</p>
              <BarList
                rows={metrics.repeatSummary.bySegment.map((row) => ({
                  label: row.segment.replace(/_/g, " "),
                  value: `${row.repeatedWallets}/${row.totalWallets}`,
                  share: row.repeatRate,
                }))}
              />
            </Card>
          </TwoColumn>
        </Section>

        <Section title="Co-usage / Ecosystem" eyebrow="Other services and shared value">
          <TwoColumn>
            <Card title="Other service candidates" eyebrow="P0 · owner-ready">
              <DataTable
                columns={["Service", "Wallets", "Spend", "Confidence", "Owner"]}
                rows={metrics.otherServiceCandidates.slice(0, 5).map((candidate) => [
                  candidate.serviceName,
                  candidate.sharedWallets,
                  formatAtomic(candidate.sharedSpendAtomic, 6, 1),
                  formatRatioPct(candidate.confidence),
                  candidate.suggestedOwner,
                ])}
              />
            </Card>
            <Card title="Shared spend / shared tx ranked table" eyebrow="P0">
              <DataTable
                columns={["Service", "Shared spend", "Shared tx", "Reason"]}
                rows={metrics.otherServiceCandidates.slice(0, 5).map((candidate) => [
                  candidate.serviceName,
                  formatAtomic(candidate.sharedSpendAtomic, 6, 1),
                  candidate.sharedTxCount,
                  candidate.reason,
                ])}
              />
            </Card>
          </TwoColumn>
        </Section>

        <Section title="Endpoint Behavior" eyebrow="Category usage and flow">
          <TwoColumn>
            <Card title="Endpoint category usage" eyebrow="P0">
              <BarList
                rows={metrics.endpointUsage.map((row) => ({
                  label: row.category.replace(/_/g, " "),
                  value: `${row.txCount} tx · ${row.walletCount} wallets`,
                  share: row.share,
                }))}
              />
            </Card>
            <Card title="Endpoint category flow" eyebrow="P1 proxy flow">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {metrics.endpointFlows.slice(0, 6).map((flow) => (
                  <div key={`${flow.from}->${flow.to}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "10px 12px", borderRadius: 8, background: "var(--bg-elev-2)" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                      <strong style={{ color: "var(--text-1)" }}>{flow.from.replace(/_/g, " ")}</strong>
                      <span style={{ color: "var(--text-mute)", margin: "0 8px" }}>→</span>
                      <strong style={{ color: "var(--text-1)" }}>{flow.to.replace(/_/g, " ")}</strong>
                    </span>
                    <span className="mono" style={{ color: "var(--mesh-blue)", fontWeight: 700 }}>{flow.occurrences}×</span>
                  </div>
                ))}
              </div>
            </Card>
          </TwoColumn>
        </Section>

        <Section title="Growth Action" eyebrow="Recommended plays">
          <TwoColumn>
            <Card title="Source / intermediary ranking" eyebrow="P0">
              <DataTable
                columns={["Source", "Wallets", "Repeat", "Spend"]}
                rows={metrics.sourceRankings.map((row) => [
                  row.source,
                  row.wallets,
                  formatRatioPct(row.repeatRate),
                  formatAtomic(row.spendAtomic, 6, 1),
                ])}
              />
            </Card>
            <Card title="Upsell, co-marketing, reprice and retention actions" eyebrow="P0/P1/P2">
              <div style={{ display: "grid", gap: 10 }}>
                {metrics.recommendations.map((recommendation) => (
                  <div key={recommendation.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{recommendation.title}</strong>
                      <span className="mono" style={{ color: priorityColor(recommendation.priority), fontWeight: 700 }}>{recommendation.priority}</span>
                    </div>
                    <div style={{ color: "var(--text-3)", fontSize: 13, lineHeight: 1.5 }}>
                      {recommendation.target} · {recommendation.impact} · confidence {formatRatioPct(recommendation.confidence)}
                      {recommendation.proxy ? " · demo proxy" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TwoColumn>
        </Section>
      </div>
    </div>
  );
}

const bodyText: CSSProperties = { color: "var(--text-3)", fontSize: 13, lineHeight: 1.55, margin: "8px 0 14px" };

function ExecutiveTakeaways({ items, note }: { items: string[]; note: string }) {
  return (
    <section className="card" style={{ padding: 20, marginBottom: 22, borderColor: "rgba(45,127,249,0.24)", background: "linear-gradient(135deg, rgba(45,127,249,0.08), rgba(20,184,166,0.07))" }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Executive takeaways</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {items.map((item) => (
          <div key={item} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.72)", color: "var(--text-1)", fontSize: 14, lineHeight: 1.5 }}>
            {item}
          </div>
        ))}
      </div>
      <p style={{ color: "var(--text-mute)", fontSize: 12, margin: "12px 0 0" }}>{note}</p>
    </section>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      <h2 className="display" style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 650 }}>{title}</h2>
      {children}
    </section>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 14 }}>{children}</div>;
}

function TwoColumn({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>{children}</div>;
}

function Card({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: 18, background: "var(--surface-card)", borderColor: "var(--line)", minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      <h3 style={{ fontSize: 16, margin: "0 0 14px", fontWeight: 650 }}>{title}</h3>
      {children}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px", background: "#fff" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 27, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function TrendCard({ trend7d, trend30d }: { trend7d: TrendPoint[]; trend30d: TrendPoint[] }) {
  return (
    <Card title="7d / 30d trend line" eyebrow="P0">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <MiniTrend title="Last 7 days" points={trend7d} />
        <MiniTrend title="Last 30 days" points={trend30d} compact />
      </div>
    </Card>
  );
}

function MiniTrend({ title, points, compact }: { title: string; points: TrendPoint[]; compact?: boolean }) {
  const max = Math.max(...points.map((point) => Number(BigInt(point.spendAtomic) / 1_000_000n)), 1);
  return (
    <div>
      <div style={{ color: "var(--text-3)", fontSize: 12, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "end", gap: compact ? 2 : 6, height: 80 }}>
        {points.map((point) => {
          const value = Number(BigInt(point.spendAtomic) / 1_000_000n);
          return <div key={point.day} title={`${point.day}: ${formatAtomic(point.spendAtomic, 6, 1)}`} style={{ flex: 1, height: `${Math.max(5, (value / max) * 78)}px`, borderRadius: "4px 4px 0 0", background: point.txCount > 0 ? "var(--mesh-blue)" : "var(--line)" }} />;
        })}
      </div>
    </div>
  );
}

function BarList({ rows }: { rows: Array<{ label: string; value: string | number; share: number }> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row) => (
        <div key={row.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "var(--text-2)", textTransform: "capitalize" }}>{row.label}</span>
            <span className="mono" style={{ color: "var(--text-1)", fontWeight: 600 }}>{row.value}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.round(row.share * 100))}%`, height: "100%", background: "var(--teal)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-3)", borderBottom: "1px solid var(--line-strong)" }}>
            {columns.map((column) => <th key={column} style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} style={{ borderBottom: "1px solid var(--line)" }}>
              {row.map((cell, index) => <td key={`${row.join("|")}-${index}`} style={{ padding: "10px 8px", color: index === 0 ? "var(--text-1)" : "var(--text-2)", maxWidth: index === row.length - 1 ? 260 : undefined }}>{typeof cell === "string" && cell.startsWith("0x") ? shortAddr(cell) : cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function priorityColor(priority: "P0" | "P1" | "P2") {
  if (priority === "P0") return "var(--teal)";
  if (priority === "P1") return "var(--mesh-blue)";
  return "var(--text-3)";
}
