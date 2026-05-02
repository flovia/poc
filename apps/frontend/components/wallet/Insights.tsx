import { Icon } from "@/components/ui/Icon";
import type {
  CustomerInsightDto,
  CustomerInsightSeverity,
  CustomerMetricsDto,
  CustomerProviderUsageDto,
} from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { formatAtomic, formatGrowth, formatRatioPct } from "@/lib/format";
import { InsightCard } from "./InsightCard";
import { UpsellExplanationPanel } from "./UpsellExplanationPanel";

const SEVERITY_TONE: Record<CustomerInsightSeverity, "default" | "upsell" | "blue"> = {
  info: "default",
  opportunity: "upsell",
  warning: "blue",
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function UpsellCard({
  address,
  metrics,
  dataMode,
  sdkExtras,
}: {
  address: string;
  metrics: CustomerMetricsDto;
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
}) {
  // SDK connected モード + 主役 (upsell !== null) だけ SDK preview 版に置換.
  if (dataMode === "sdkConnected" && sdkExtras?.upsell) {
    const u = sdkExtras.upsell;
    return (
      <InsightCard
        tone="upsell"
        icon={<Icon.bolt width="11" height="11" />}
        label="SDK preview · Upsell opportunity"
        delay={60}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {u.planName}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
              Projected{" "}
              <span className="mono" style={{ fontWeight: 600, color: "var(--mesh-blue)" }}>
                {formatUsd(u.projectedMrrUsd)}
              </span>{" "}
              MRR
            </div>
          </div>
          <span className="chip blue">high</span>
        </div>
        <div
          style={{
            background: "rgba(123, 97, 168, 0.06)",
            borderRadius: 6,
            padding: "10px 12px",
            border: "1px solid rgba(123, 97, 168, 0.16)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--sdk-purple)",
              marginBottom: 6,
            }}
          >
            Why now
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-1)", lineHeight: 1.6 }}>
            {u.whyNow.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 10 }}>
          <UpsellExplanationPanel address={address} />
        </div>
      </InsightCard>
    );
  }

  return <UpsellCardLive address={address} metrics={metrics} />;
}

function UpsellCardLive({
  address,
  metrics,
}: {
  address: string;
  metrics: CustomerMetricsDto;
}) {
  const opp = metrics.upsellOpportunity;
  const headline =
    opp === "high"
      ? "High upsell signal"
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
          <div className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {headline}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Derived from spend, provider count, growth, and entry-point ratio
          </div>
        </div>
        <span className={`chip ${opp === "high" ? "blue" : ""}`}>{opp}</span>
      </div>

      <div
        style={{
          background: "var(--teal-dim)",
          borderRadius: 10,
          padding: "10px 12px",
          border: "1px solid rgba(44, 122, 123, 0.20)",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
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
            fontSize: 13,
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

      <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
        Heuristics are PoC-grade. The BFF README warns these are not production revenue analytics.
      </div>

      <div style={{ marginTop: 10 }}>
        <UpsellExplanationPanel address={address} />
      </div>
    </InsightCard>
  );
}

export function EntryPointInsight({
  metrics,
  dataMode,
  sdkExtras,
}: {
  metrics: CustomerMetricsDto;
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
}) {
  // SDK connected モードで主役 (entryPointPctText !== null) なら SDK preview 文言で置換.
  if (dataMode === "sdkConnected" && sdkExtras?.entryPointPctText) {
    return (
      <InsightCard
        tone="blue"
        icon={<Icon.spark width="11" height="11" />}
        label="SDK preview · Entry-point badge"
        delay={120}
      >
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-1)" }}>
          Your API is{" "}
          <span className="mono" style={{ color: "var(--mesh-blue)", fontWeight: 700 }}>
            {sdkExtras.entryPointPctText}
          </span>
          .
        </div>
      </InsightCard>
    );
  }

  const ratio = metrics.entryPointRatio;
  const hasEntry = ratio > 0;

  return (
    <InsightCard
      tone="blue"
      icon={<Icon.spark width="11" height="11" />}
      label="Workflow position"
      delay={120}
    >
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-1)" }}>
        {hasEntry ? (
          <>
            <span className="mono" style={{ color: "var(--mesh-blue)", fontWeight: 600 }}>
              {formatRatioPct(ratio, 0)}
            </span>{" "}
            of this wallet&apos;s observations are tied to an attribution candidate, suggesting your endpoint sits on the wallet&apos;s identifiable workflow path.
          </>
        ) : (
          <>No attribution candidates matched this wallet&apos;s observations yet.</>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--line)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--text-mute)",
        }}
      >
        Install the Flovia SDK on your API to capture exact step position and per-loop attribution.
      </div>
    </InsightCard>
  );
}

export function RecentActivityInsight({
  metrics,
  providers,
}: {
  metrics: CustomerMetricsDto;
  providers: CustomerProviderUsageDto[];
}) {
  const growth = metrics.activityGrowth;
  const providerCount = providers.length;
  const hasGrowthSignal = growth !== 0;

  return (
    <InsightCard
      tone="default"
      icon={<Icon.bolt width="11" height="11" />}
      label="Recent activity & co-usage"
      delay={150}
    >
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-1)" }}>
        {hasGrowthSignal ? (
          <>
            Recent activity is{" "}
            <span
              className="mono"
              style={{ color: growth >= 0 ? "var(--mesh-blue)" : "var(--text-3)", fontWeight: 600 }}
            >
              {formatGrowth(growth)}
            </span>{" "}
            versus the earlier baseline; this wallet has paid{" "}
            <span className="mono" style={{ color: "var(--text-1)", fontWeight: 600 }}>
              {providerCount}
            </span>{" "}
            provider {providerCount === 1 ? "wallet" : "wallets"} so far.
          </>
        ) : providerCount > 0 ? (
          <>
            This wallet has paid{" "}
            <span className="mono" style={{ color: "var(--text-1)", fontWeight: 600 }}>
              {providerCount}
            </span>{" "}
            provider {providerCount === 1 ? "wallet" : "wallets"} so far.
          </>
        ) : (
          <>No co-usage activity observed yet.</>
        )}
      </div>
      {!hasGrowthSignal && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--line)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--text-mute)",
          }}
        >
          Growth versus an earlier baseline is not yet available. Install the Flovia SDK on your API
          to track week-over-week activity changes for this wallet.
        </div>
      )}
    </InsightCard>
  );
}

// `info` (= partnership classification) は現状 Co-usage Map と情報が重複し、
// API provider にとって読み取れるアクションが薄いため非表示にする。
// upsell / retention のように具体的な営業判断につながる severity だけ残す。
export function InsightsList({ insights }: { insights: CustomerInsightDto[] }) {
  const actionable = insights.filter((insight) => insight.severity !== "info");
  if (actionable.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {actionable.map((insight, i) => (
        <InsightCard
          key={i}
          tone={SEVERITY_TONE[insight.severity]}
          label={insight.severity}
          delay={180 + i * 40}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)", marginBottom: 4 }}>
            {insight.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>
            {insight.description}
          </div>
        </InsightCard>
      ))}
    </div>
  );
}
