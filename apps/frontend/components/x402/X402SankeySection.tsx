"use client";

import { useState } from "react";
import type { X402MetricMode } from "@/lib/x402-analysis/types";
import type { X402AnalysisViewModel } from "@/lib/x402-analysis/transform";
import { X402SankeyChart } from "./X402SankeyChart";

type X402SankeySectionProps = {
  viewModel: X402AnalysisViewModel;
  eyebrow?: string;
  title?: string;
  description?: string;
  surface?: "flat" | "card";
};

const METRIC_LABELS: Record<X402MetricMode, string> = {
  flow_count: "flow_count",
  settled_usdc: "settled_usdc",
};

export function X402SankeySection({
  viewModel,
  eyebrow = "x402 analysis",
  title = "Sankey views",
  description = "Two sankey views show both the intent-level routing through middlemen and the endpoint sequence immediately before and after the target API call.",
  surface = "flat",
}: X402SankeySectionProps) {
  const [metric, setMetric] = useState<X402MetricMode>("flow_count");
  const isCard = surface === "card";

  return (
    <section
      className={isCard ? "card" : undefined}
      style={{
        padding: isCard ? 18 : 0,
      }}
    >
      <div style={{ marginBottom: 18 }}>
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
          {eyebrow}
        </div>
        <h2
          className="display"
          style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" }}
        >
          {title}
        </h2>
        <p style={{ color: "var(--text-2)", fontSize: 15, margin: "6px 0 0", maxWidth: 820 }}>
          {description}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
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
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {METRIC_LABELS[option]}
          </button>
        ))}
        <div style={{ alignSelf: "center", fontSize: 12, color: "var(--text-mute)", marginLeft: 4 }}>
          Period: {viewModel.period_label}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {viewModel.sankey_patterns.map((chart) => (
          <X402SankeyChart key={chart.id} chart={chart} metric={metric} />
        ))}
      </div>
    </section>
  );
}
