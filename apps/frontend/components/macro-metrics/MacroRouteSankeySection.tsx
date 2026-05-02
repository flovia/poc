"use client";

import { useState } from "react";
import { X402SankeyChart } from "@/components/x402/X402SankeyChart";
import type { X402SankeyChartModel } from "@/lib/x402-analysis/transform";
import type { X402MetricMode } from "@/lib/x402-analysis/types";

const METRIC_LABELS: Record<X402MetricMode, string> = {
  flow_count: "Request count",
  settled_usdc: "Settled USDC",
};

export function MacroRouteSankeySection({
  chart,
  periodLabel = "Last 30 days demo",
}: {
  chart: X402SankeyChartModel;
  periodLabel?: string;
}) {
  const [metric, setMetric] = useState<X402MetricMode>("flow_count");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {chart.eyebrow}
          </div>
          <h3
            className="display"
            style={{ margin: 0, fontSize: 20, fontWeight: 650, letterSpacing: "-0.015em" }}
          >
            {chart.title}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text-2)",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 840,
            }}
          >
            {chart.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(["flow_count", "settled_usdc"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              style={{
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: metric === option ? "rgba(47, 93, 154, 0.1)" : "white",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                color: metric === option ? "var(--mesh-blue)" : "var(--text-2)",
              }}
            >
              {METRIC_LABELS[option]}
            </button>
          ))}
          <span style={{ fontSize: 12, color: "var(--text-mute)", marginLeft: 4 }}>
            Period: {periodLabel}
          </span>
        </div>
      </div>

      <X402SankeyChart
        chart={chart}
        metric={metric}
        paidCountLabel="Workflow count"
        showHeader={false}
      />
    </div>
  );
}
