import { Icon } from "@/components/ui/Icon";
import type {
  CustomerInsightDto,
  CustomerInsightSeverity,
  CustomerMetricsDto,
  CustomerProviderUsageDto,
} from "@/lib/api/types";
import { formatAtomic, formatGrowth, formatRatioPct, formatTimestamp, shortAddr } from "@/lib/format";
import { InsightCard } from "./InsightCard";

const SEVERITY_TONE: Record<CustomerInsightSeverity, "default" | "upsell" | "blue"> = {
  info: "default",
  opportunity: "upsell",
  warning: "blue",
};

export function UpsellCard({ metrics }: { metrics: CustomerMetricsDto }) {
  const opp = metrics.upsellOpportunity;
  const headline =
    opp === "high"
      ? "High upsell opportunity"
      : opp === "medium"
      ? "Medium upsell opportunity"
      : "Low upsell signal";

  return (
    <InsightCard
      tone="upsell"
      icon={<Icon.bolt width="11" height="11" />}
      label="Upsell opportunity"
      delay={60}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div className="display" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {headline}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
            Derived from spend, provider count, growth, and entry-point ratio
          </div>
        </div>
        <span className={`chip ${opp === "high" ? "teal" : ""}`}>{opp}</span>
      </div>

      <div
        style={{
          background: "var(--teal-dim)",
          borderRadius: 10,
          padding: "10px 12px",
          border: "1px solid rgba(13,148,136,0.20)",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-2)",
            marginBottom: 6,
          }}
        >
          Heuristic inputs
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            fontSize: 12.5,
            color: "var(--text-2)",
            lineHeight: 1.55,
          }}
        >
          <li style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Free-tier progress</span>
            <span className="mono" style={{ color: "var(--text-1)" }}>
              {formatRatioPct(metrics.freeTierProgress, 0)}
            </span>
          </li>
          <li style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Activity growth</span>
            <span className="mono" style={{ color: "var(--text-1)" }}>
              {formatGrowth(metrics.activityGrowth)}
            </span>
          </li>
          <li style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Entry-point ratio</span>
            <span className="mono" style={{ color: "var(--text-1)" }}>
              {formatRatioPct(metrics.entryPointRatio, 0)}
            </span>
          </li>
          <li style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>Spend (atomic)</span>
            <span className="mono" style={{ color: "var(--text-1)" }}>
              {formatAtomic(metrics.spendAtomic)}
            </span>
          </li>
        </ul>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-mute)", lineHeight: 1.5 }}>
        Heuristics are PoC-grade. The BFF README warns these are not production revenue analytics.
      </div>
    </InsightCard>
  );
}

export function ProviderUsageList({ providers }: { providers: CustomerProviderUsageDto[] }) {
  return (
    <InsightCard
      tone="blue"
      icon={<Icon.spark width="11" height="11" />}
      label={`Known Provider Usage (${providers.length})`}
      delay={120}
    >
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12, lineHeight: 1.4 }}>
        Attributed from on-chain observations mapped to the BFF provider directory.
      </div>
      {providers.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          No provider usage in this projection.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {providers.map((p) => (
            <div
              key={p.providerId + p.payToWallet}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
                padding: "8px 10px",
                background: "#F8FAFC",
                borderRadius: 8,
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-1)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={p.name}
                >
                  {p.name}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 4 }}>
                  PAY-TO <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{shortAddr(p.payToWallet)}</span> · {p.transactionCount} TX · LAST{" "}
                  <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{formatTimestamp(p.lastSeenAt)}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--mesh-blue)" }}>
                  {formatAtomic(p.spendAtomic)}
                </span>
                <div style={{ fontSize: 9, textTransform: "uppercase", color: "var(--text-3)", marginTop: 2, letterSpacing: "0.05em" }}>
                  Spend
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </InsightCard>
  );
}

export function InsightsList({ insights }: { insights: CustomerInsightDto[] }) {
  if (insights.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {insights.map((insight, i) => (
        <InsightCard key={i} tone={SEVERITY_TONE[insight.severity]} label={insight.severity} delay={180 + i * 40}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", marginBottom: 4 }}>
            {insight.title}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55 }}>
            {insight.description}
          </div>
        </InsightCard>
      ))}
    </div>
  );
}
