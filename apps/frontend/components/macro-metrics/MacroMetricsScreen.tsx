"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { EndpointSankey } from "./EndpointSankey";
import { MacroRouteSankeySection } from "./MacroRouteSankeySection";
import { formatAtomic, formatRatioPct, shortAddr } from "@/lib/format";
import type { MacroMetricsViewModel, TrendPoint } from "@/lib/macro-metrics/metrics";
import { useFrontendLocale } from "@/lib/frontend-locale";

type Props = {
  metrics: MacroMetricsViewModel;
  providerId: string;
};

export function MacroMetricsScreen({ metrics, providerId }: Props) {
  const { text } = useFrontendLocale();
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1560, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {text("Demo macro analytics · CEO view", "Demo macro analytics · CEO view（デモ用マクロ分析）")}
          </div>
          <h1 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            {text("Macro Metrics Dashboard", "Macro Metrics Dashboard（マクロ指標）")}
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
            <p style={{ maxWidth: 820, color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" }}>
              {text(
                "A realistic offline demo comparing monetization, repeat usage, ecosystem adjacency, endpoint behavior, and growth actions for the Northwind Price API workflow.",
                "Northwind Price API workflow について、monetization、repeat usage、ecosystem adjacency、endpoint behavior、growth actions を比較する realistic offline demo です。",
              )}
            </p>
            <Link
              href={`/providers/${providerId}/metrics-catalog`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "#fff",
                padding: "9px 12px",
                color: "var(--mesh-blue)",
                fontSize: 13,
                fontWeight: 650,
                boxShadow: "var(--shadow-1)",
              }}
            >
              {text("View full metrics catalog →", "指標カタログをすべて見る →")}
            </Link>
          </div>
        </header>

        <ExecutiveTakeaways items={metrics.executiveTakeaways} note={metrics.proxyNote} />

        <Section title={text("Overview", "Overview（概要）")} eyebrow="P0 macro KPIs">
          <KpiGrid>
            <KpiCard label={text("Paid active wallets", "Paid active wallets（有料アクティブウォレット）")} value={metrics.overview.paidActiveWallets} hint={text("wallets with paid demo usage", "paid demo usage のある wallets")} />
            <KpiCard label={text("Total spend", "総支出")} value={formatAtomic(metrics.overview.totalSpendAtomic, 6, 2)} hint={text("USDC-denominated atomic demo spend", "USDC建てatomicデモ支出")} />
            <KpiCard label={text("Paid transactions", "Paid transactions（有料tx）")} value={metrics.overview.paidUsageTxCount} hint={text("paid endpoint transactions", "paid endpoint transactions")} />
            <KpiCard label={text("7d / 30d trend", "7日 / 30日トレンド")} value={`${formatAtomic(metrics.overview.trend7dSpendAtomic, 6, 1)} / ${formatAtomic(metrics.overview.trend30dSpendAtomic, 6, 1)}`} hint={text("spend in last 7 / 30 days", "直近7日 / 30日の支出")} />
          </KpiGrid>
          <TrendCard trend7d={metrics.overview.trend7d} trend30d={metrics.overview.trend30d} />
        </Section>

        <Section title={text("Customer / Wallet Intelligence", "Customer / Wallet Intelligence（顧客/ウォレット分析）")} eyebrow={text("Spend concentration and repeat", "Spend concentration and repeat（支出集中とリピート）")}>
          <TwoColumn>
            <Card title={text("Pareto chart for spend concentration", "支出集中のパレートチャート")} eyebrow="P0">
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--mesh-blue)" }}>
                {formatRatioPct(metrics.spendConcentration.topThreeWalletShare)}
              </div>
              <p style={bodyText}>{text("Top 3 wallets account for total spend share.", "上位3ウォレットが総支出シェアを占めます。")} {text(`${metrics.spendConcentration.walletCountForHalfSpend} wallet(s) reach 50% of spend.`, `${metrics.spendConcentration.walletCountForHalfSpend}ウォレットで支出の50%に到達します。`)}</p>
              <BarList
                rows={metrics.spendConcentration.rankedWallets.slice(0, 5).map((wallet) => ({
                  label: wallet.label,
                  value: formatAtomic(wallet.spendAtomic, 6, 1),
                  share: wallet.share,
                }))}
              />
            </Card>
            <Card title={text("Repeat wallet summary", "リピートウォレット概要")} eyebrow="P0">
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--teal)" }}>
                {formatRatioPct(metrics.repeatSummary.repeatWalletRate)}
              </div>
              <p style={bodyText}>{text(`${metrics.repeatSummary.repeatedWallets} of ${metrics.repeatSummary.totalWallets} wallets repeat, averaging ${metrics.repeatSummary.averageSessionsPerRepeatedWallet.toFixed(1)} sessions per repeated wallet.`, `${metrics.repeatSummary.totalWallets}ウォレット中${metrics.repeatSummary.repeatedWallets}がリピートし、リピートウォレットあたり平均${metrics.repeatSummary.averageSessionsPerRepeatedWallet.toFixed(1)}セッションです。`)}</p>
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

        <Section title={text("Co-usage / Ecosystem", "併用 / エコシステム")} eyebrow={text("Other services and shared value", "他サービスと共有価値")}>
          <TwoColumn>
            <Card title={text("Co-Usage Providers", "Co-Usage Providers（併用プロバイダー）")} eyebrow={text("P0 · owner review ready", "P0 · owner review ready（担当者レビュー向け）")}>
              <DataTable
                columns={[text("Service", "サービス"), text("Wallets", "ウォレット"), text("Spend", "支出"), text("Confidence", "信頼度"), text("Owner", "担当")]} 
                rows={metrics.coUsageProviders.slice(0, 5).map((candidate) => [
                  candidate.serviceName,
                  candidate.sharedWallets,
                  formatAtomic(candidate.sharedSpendAtomic, 6, 1),
                  formatRatioPct(candidate.confidence),
                  candidate.suggestedOwner,
                ])}
              />
            </Card>
            <Card title={text("Shared spend / shared tx ranking", "Shared spend / shared tx ranking（共有支出/共有tx）")} eyebrow="P0">
              <DataTable
                columns={[text("Service", "サービス"), text("Shared spend", "共有支出"), text("Shared tx", "共有tx"), text("Reason", "理由")]}
                rows={metrics.coUsageProviders.slice(0, 5).map((candidate) => [
                  candidate.serviceName,
                  formatAtomic(candidate.sharedSpendAtomic, 6, 1),
                  candidate.sharedTxCount,
                  candidate.reason,
                ])}
              />
            </Card>
          </TwoColumn>
        </Section>

        <Section title={text("Endpoint Behavior", "エンドポイント挙動")} eyebrow={text("Category usage and flow", "カテゴリ利用とフロー")}>
          <TwoColumn>
            <Card title={text("Endpoint category usage", "エンドポイントカテゴリ利用")} eyebrow="P0">
              <BarList
                rows={metrics.endpointUsage.map((row) => ({
                  label: row.category.replace(/_/g, " "),
                  value: `${row.txCount} tx · ${row.walletCount} wallets`,
                  share: row.share,
                }))}
              />
            </Card>
            <Card title={text("Endpoint category flow", "エンドポイントカテゴリフロー")} eyebrow={text("P1 proxy flow", "P1 代理フロー")}>
              <EndpointSankey flows={metrics.endpointFlows} />
            </Card>
          </TwoColumn>
        </Section>

        <Section title={text("Growth Action", "Growth Action（成長アクション）")} eyebrow={text("Recommended plays", "Recommended plays（推奨施策）")}>
          <TwoColumn>
            <Card title={text("Source / intermediary ranking", "流入元 / 仲介者ランキング")} eyebrow="P0">
              <DataTable
                columns={[text("Source", "流入元"), text("Wallets", "ウォレット"), text("Repeat", "リピート"), text("Spend", "支出")]}
                rows={metrics.sourceRankings.map((row) => [
                  row.source,
                  row.wallets,
                  formatRatioPct(row.repeatRate),
                  formatAtomic(row.spendAtomic, 6, 1),
                ])}
              />
            </Card>
            <Card title={text("Upsell, co-marketing, reprice and retention actions", "アップセル、共同マーケ、価格改定、継続施策")} eyebrow="P0/P1/P2">
              <div style={{ display: "grid", gap: 10 }}>
                {metrics.recommendations.map((recommendation) => (
                  <div key={recommendation.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{recommendation.title}</strong>
                      <span className="mono" style={{ color: priorityColor(recommendation.priority), fontWeight: 700 }}>{recommendation.priority}</span>
                    </div>
                    <div style={{ color: "var(--text-3)", fontSize: 13, lineHeight: 1.5 }}>
                      {recommendation.target} · {recommendation.impact} · {text("confidence", "信頼度")} {formatRatioPct(recommendation.confidence)}
                      {recommendation.proxy ? text(" · demo proxy", " · デモ代理") : ""}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TwoColumn>
        </Section>

        <div style={{ marginTop: 28 }}>
          <MacroRouteSankeySection
            chart={metrics.routeSankey}
            periodLabel={text("Last 30 days demo", "直近30日デモ")}
          />
        </div>
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
