"use client";

import type { X402AnalysisViewModel, X402IntermediarySummaryRow } from "@/lib/x402-analysis/transform";
import { X402SankeySection } from "./X402SankeySection";

type X402AnalysisDashboardProps = {
  viewModel: X402AnalysisViewModel;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number): string {
  return `${Math.round(value).toLocaleString()} ms`;
}

function summaryRows(viewModel: X402AnalysisViewModel): X402IntermediarySummaryRow[] {
  return viewModel.intermediary_summary;
}

function KeyValue({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: accent ? "rgba(47, 93, 154, 0.05)" : "white",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>{value}</div>
    </div>
  );
}

export function X402AnalysisDashboard({ viewModel }: X402AnalysisDashboardProps) {
  const recentDailyRows = viewModel.sankey_flows_daily.slice(-14).reverse();
  const requestEvents = viewModel.request_events_sample;
  const topSummaryRows = summaryRows(viewModel).slice(0, 5);

  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ position: "relative", padding: "32px 40px 84px", maxWidth: 1540, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginBottom: 6,
            }}
          >
            x402 analysis
          </div>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" }}>
            API utilization and payment flow
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 15, margin: "6px 0 0", maxWidth: 820 }}>
            Two sankey views show both the intent-level routing through middlemen and the endpoint
            sequence immediately before and after the target API call.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <KeyValue label="Flow count" value={viewModel.totals.flow_count.toLocaleString()} accent />
          <KeyValue label="Settled USDC" value={`$${formatUsd(viewModel.totals.settled_usdc)}`} />
          <KeyValue label="Success rate" value={formatPct(viewModel.totals.success_rate)} />
          <KeyValue label="P95 latency" value={formatLatency(viewModel.totals.p95_latency_ms)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <X402SankeySection viewModel={viewModel} />

          <div className="card" style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
                marginBottom: 12,
              }}
            >
              Intermediary leaderboard
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topSummaryRows.map((row) => (
                <div
                  key={row.api_intermediary}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{row.api_intermediary}</div>
                    <div className="mono" style={{ color: "var(--mesh-blue)", fontSize: 12 }}>
                      ${formatUsd(row.settled_usdc)}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {row.flow_count.toLocaleString()} flows · {formatPct(row.success_rate)} success ·{" "}
                    {formatLatency(row.p95_latency_ms)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          {viewModel.category_definitions.map((item) => (
            <div key={item.category} className="card" style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--mesh-blue)",
                  marginBottom: 6,
                }}
              >
                {item.display_label ?? item.category}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{item.description}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            marginTop: 20,
            alignItems: "start",
          }}
        >
          <div className="card" style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
                marginBottom: 10,
              }}
            >
              Endpoint master
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                    <th style={{ padding: "8px 6px" }}>endpoint</th>
                    <th style={{ padding: "8px 6px" }}>category</th>
                    <th style={{ padding: "8px 6px" }}>subcategory</th>
                    <th style={{ padding: "8px 6px" }}>provider</th>
                    <th style={{ padding: "8px 6px" }}>pricing</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.endpoint_master.map((row) => (
                    <tr key={row.endpoint} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--mono)", color: "var(--text-1)" }}>
                        {row.endpoint}
                      </td>
                      <td style={{ padding: "8px 6px" }}>{row.endpoint_category}</td>
                      <td style={{ padding: "8px 6px" }}>{row.endpoint_subcategory}</td>
                      <td style={{ padding: "8px 6px" }}>{row.provider}</td>
                      <td style={{ padding: "8px 6px", color: "var(--text-2)" }}>{row.pricing_model}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
                marginBottom: 10,
              }}
            >
              Recent request events
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                    <th style={{ padding: "8px 6px" }}>timestamp</th>
                    <th style={{ padding: "8px 6px" }}>workflow</th>
                    <th style={{ padding: "8px 6px" }}>step</th>
                    <th style={{ padding: "8px 6px" }}>intermediary</th>
                    <th style={{ padding: "8px 6px" }}>endpoint</th>
                    <th style={{ padding: "8px 6px" }}>status</th>
                    <th style={{ padding: "8px 6px" }}>latency</th>
                    <th style={{ padding: "8px 6px" }}>error</th>
                  </tr>
                </thead>
                <tbody>
                  {requestEvents.map((row) => (
                    <tr key={row.event_id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--mono)" }}>{row.timestamp}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--mono)" }}>{row.workflow_id}</td>
                      <td style={{ padding: "8px 6px" }}>{row.step_order}</td>
                      <td style={{ padding: "8px 6px" }}>{row.api_intermediary}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--mono)" }}>{row.endpoint}</td>
                      <td style={{ padding: "8px 6px" }}>{row.payment_status}</td>
                      <td style={{ padding: "8px 6px" }}>{formatLatency(row.latency_ms)}</td>
                      <td style={{ padding: "8px 6px" }}>{row.error_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, marginTop: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginBottom: 10,
            }}
          >
            Recent daily sankey rows
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                  <th style={{ padding: "8px 6px" }}>date</th>
                  <th style={{ padding: "8px 6px" }}>from</th>
                  <th style={{ padding: "8px 6px" }}>intermediary</th>
                  <th style={{ padding: "8px 6px" }}>to</th>
                  <th style={{ padding: "8px 6px" }}>flow_count</th>
                  <th style={{ padding: "8px 6px" }}>paid_count</th>
                  <th style={{ padding: "8px 6px" }}>settled_usdc</th>
                  <th style={{ padding: "8px 6px" }}>success_rate</th>
                  <th style={{ padding: "8px 6px" }}>p95_latency_ms</th>
                  <th style={{ padding: "8px 6px" }}>error_rate</th>
                </tr>
              </thead>
              <tbody>
                {recentDailyRows.map((row) => (
                  <tr key={`${row.date}:${row.from_category}:${row.api_intermediary}:${row.to_category}`} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 6px" }}>{row.date}</td>
                    <td style={{ padding: "8px 6px" }}>{row.from_category}</td>
                    <td style={{ padding: "8px 6px" }}>{row.api_intermediary}</td>
                    <td style={{ padding: "8px 6px" }}>{row.to_category}</td>
                    <td style={{ padding: "8px 6px" }}>{row.flow_count.toLocaleString()}</td>
                    <td style={{ padding: "8px 6px" }}>{row.paid_count.toLocaleString()}</td>
                    <td style={{ padding: "8px 6px" }}>${formatUsd(row.settled_usdc)}</td>
                    <td style={{ padding: "8px 6px" }}>{formatPct(row.success_rate)}</td>
                    <td style={{ padding: "8px 6px" }}>{formatLatency(row.p95_latency_ms)}</td>
                    <td style={{ padding: "8px 6px" }}>{formatPct(row.error_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
