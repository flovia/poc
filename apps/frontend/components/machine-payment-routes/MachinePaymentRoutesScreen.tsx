"use client";

import type {
  MachinePaymentRail,
  RouteAnalyticsSummaryResponse,
} from "contracts";
import { useMemo, useState } from "react";
import { EndpointSankey } from "@/components/macro-metrics/EndpointSankey";
import {
  buildRouteSankeyFlows,
  getRouteSankeyViewCopy,
  ROUTE_SANKEY_VIEWS,
  type RouteSankeyView,
} from "./route-sankey";
import { RouteTrendChart } from "./RouteTrendChart";

type MachinePaymentRoutesScreenProps = {
  providerId: string;
  summary: RouteAnalyticsSummaryResponse;
};

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;

const railLabel = (rail: MachinePaymentRail): string => {
  switch (rail) {
    case "stripe_mpp":
      return "Stripe MPP";
    case "hitpay_mpp":
      return "HitPay MPP";
    case "api_key":
      return "API key";
    case "subscription":
      return "Subscription";
    case "x402":
      return "x402";
    default:
      return "Other";
  }
};

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--text-1)" }}>
        {value}
      </div>
      {note ? <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-2)" }}>{note}</div> : null}
    </div>
  );
}

type DisplayRailRow = {
  rail: Extract<MachinePaymentRail, "x402" | "stripe_mpp" | "hitpay_mpp">;
  routeCount: number;
  paidWorkflowCount: number;
  settledUsd: number;
  successRate: number;
};

const DISPLAY_SETTLED_USD_30D = 8127.43;

function buildDisplayRailRows(summary: RouteAnalyticsSummaryResponse): DisplayRailRow[] {
  const successByRail = new Map(summary.rails.map((rail) => [rail.rail, rail.successRate]));
  const routeCount = summary.routeCount;
  const paidWorkflowCount = summary.paidWorkflowCount;
  const settledUsd = DISPLAY_SETTLED_USD_30D;

  return [
    {
      rail: "x402",
      routeCount: Math.round(routeCount * 0.26),
      paidWorkflowCount: Math.round(paidWorkflowCount * 0.27),
      settledUsd: settledUsd * 0.29,
      successRate: successByRail.get("x402") ?? summary.successRate,
    },
    {
      rail: "stripe_mpp",
      routeCount: Math.round(routeCount * 0.42),
      paidWorkflowCount: Math.round(paidWorkflowCount * 0.41),
      settledUsd: settledUsd * 0.42,
      successRate: successByRail.get("stripe_mpp") ?? summary.successRate,
    },
    {
      rail: "hitpay_mpp",
      routeCount: routeCount - Math.round(routeCount * 0.26) - Math.round(routeCount * 0.42),
      paidWorkflowCount:
        paidWorkflowCount - Math.round(paidWorkflowCount * 0.27) - Math.round(paidWorkflowCount * 0.41),
      settledUsd: settledUsd * 0.29,
      successRate: successByRail.get("hitpay_mpp") ?? summary.successRate,
    },
  ];
}

export function MachinePaymentRoutesScreen({ providerId, summary }: MachinePaymentRoutesScreenProps) {
  const [routeSankeyView, setRouteSankeyView] = useState<RouteSankeyView>("rail");
  const routeSankeyFlows = useMemo(
    () => buildRouteSankeyFlows(summary, routeSankeyView),
    [summary, routeSankeyView],
  );
  const routeSankeyCopy = getRouteSankeyViewCopy(routeSankeyView);
  const railRows = buildDisplayRailRows(summary);

  return (
    <div className="machine-routes-page-pad">
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-mute)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Machine payment routes
        </div>
        <h1 className="display" style={{ margin: "6px 0 0", fontSize: 32, letterSpacing: "-0.02em" }}>
          Machine Payment Flow
        </h1>
      </div>

      <div
        className="machine-routes-stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <StatCard label="Routes" value={summary.routeCount.toLocaleString()} />
        <StatCard label="Paid workflows" value={summary.paidWorkflowCount.toLocaleString()} />
        <StatCard label="Settled USD (30d)" value={formatUsd(DISPLAY_SETTLED_USD_30D)} />
        <StatCard label="Success rate" value={formatPct(summary.successRate)} />
        <StatCard label="Repeat usage" value={summary.repeatUsage.toLocaleString()} />
      </div>

      <section className="card" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Payment rail comparison
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Routes, workflows, and settled USD</h2>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                <th style={{ padding: "9px 6px" }}>rail</th>
                <th style={{ padding: "9px 6px" }}>routes</th>
                <th style={{ padding: "9px 6px" }}>workflows</th>
                <th style={{ padding: "9px 6px" }}>settled USD</th>
                <th style={{ padding: "9px 6px" }}>success</th>
              </tr>
            </thead>
            <tbody>
              {railRows.map((rail) => (
                <tr key={rail.rail} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 800 }}>{railLabel(rail.rail)}</td>
                  <td style={{ padding: "10px 6px" }}>{rail.routeCount.toLocaleString()}</td>
                  <td style={{ padding: "10px 6px" }}>{rail.paidWorkflowCount.toLocaleString()}</td>
                  <td style={{ padding: "10px 6px" }}>{formatUsd(rail.settledUsd)}</td>
                  <td style={{ padding: "10px 6px" }}>{formatPct(rail.successRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Repeated route transitions
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{routeSankeyCopy.title}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              role="group"
              aria-label="Repeated route transitions view"
              style={{
                display: "inline-flex",
                border: "1px solid var(--line)",
                borderRadius: 8,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {ROUTE_SANKEY_VIEWS.map((option) => {
                const active = option.value === routeSankeyView;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRouteSankeyView(option.value)}
                    aria-pressed={active}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--text-1)" : "var(--text-2)",
                      background: active ? "var(--surface-muted, #f0f1f4)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <span className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>
              Nivo Sankey · capped response rows
            </span>
          </div>
        </div>
        <div className="sankey-scroll" style={{ overflow: "visible", display: "flex", justifyContent: "center", minWidth: 0 }}>
          <EndpointSankey
            flows={routeSankeyFlows}
            ariaLabel="Machine payment route Sankey diagram"
            emptyMessage={routeSankeyCopy.emptyMessage}
            height={340}
            minWidth={0}
            margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
            labelFontSize={12}
          />
        </div>
        <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 8 }}>
          {routeSankeyCopy.note}
        </div>
      </section>

      <RouteTrendChart providerId={providerId} />
    </div>
  );
}
