import { FreeTierBar } from "@/components/ui/FreeTierBar";
import { Icon } from "@/components/ui/Icon";
import type { CustomerIdentityDto, CustomerMetricsDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { formatAtomic, formatGrowth, formatRatioPct } from "@/lib/format";
import { KPI } from "./KPI";
import { Sparkline7d } from "./Sparkline7d";

type IdentityBarProps = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGrowthFromRatio(ratio: number): string {
  const pct = Math.round(ratio * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export function IdentityBar({ customer, metrics, dataMode, sdkExtras }: IdentityBarProps) {
  const isSdkConnected = dataMode === "sdkConnected" && sdkExtras !== null;
  const hasSdkUpsell = isSdkConnected && sdkExtras!.upsell !== null; // 主役のみ
  const freeTierPct = Math.round(
    (isSdkConnected && hasSdkUpsell
      ? sdkExtras!.freeTierProgress
      : metrics.freeTierProgress) * 100,
  );
  const totalSpendDisplay =
    isSdkConnected && hasSdkUpsell
      ? formatUsd(sdkExtras!.totalSpendUsd)
      : formatAtomic(metrics.spendAtomic);
  const totalSpendSub =
    isSdkConnected && hasSdkUpsell ? "USD · SDK preview (mock)" : "atomic units (USDC*)";
  const growthDisplay =
    isSdkConnected && hasSdkUpsell
      ? formatGrowthFromRatio(sdkExtras!.growth7d)
      : formatGrowth(metrics.activityGrowth);
  const growthSub =
    isSdkConnected && hasSdkUpsell ? "7-day volume vs. prior week" : "later vs. earlier observations";
  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        background: "#FFFFFF",
        borderColor: "var(--line)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, auto) 1fr auto",
          gap: 24,
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left: Address + identity caveat */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--mesh-blue)",
                boxShadow: "none",
              }}
            />
            <span
              className="mono display"
              style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.01em" }}
            >
              {customer.address}
            </span>
            <button
              className="btn ghost"
              style={{ padding: "4px 6px", color: "var(--text-3)" }}
              title="Copy"
            >
              <Icon.copy width="13" height="13" />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--text-2)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon.bolt width="12" height="12" style={{ color: "var(--teal)" }} />
              {customer.label ?? "Payer wallet"}
            </span>
            {isSdkConnected && sdkExtras?.agentType && (
              <span
                data-testid="sdk-agent-badge"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 3,
                  background: "var(--sdk-purple)",
                  color: "#FFFFFF",
                  letterSpacing: "0.02em",
                }}
              >
                {sdkExtras.agentType}
              </span>
            )}
            <span style={{ color: "var(--text-mute)" }}>·</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              role: {customer.role} · basis: {customer.identityBasis}
            </span>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--text-mute)",
              maxWidth: 420,
              lineHeight: 1.5,
            }}
          >
            {customer.caveat}
          </div>
        </div>

        {/* Center: KPIs derived from BFF metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          <KPI
            label="Total spend"
            big
            value={totalSpendDisplay}
            sub={totalSpendSub}
            hue="default"
          />
          <KPI
            label="Activity growth"
            big
            value={
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  className="mono"
                  style={{ fontSize: 28, fontWeight: 600, color: "var(--mesh-blue)" }}
                >
                  {growthDisplay}
                </span>
                {isSdkConnected && hasSdkUpsell && sdkExtras!.sparkline7d.length > 0 && (
                  <Sparkline7d points={sdkExtras!.sparkline7d} width={140} height={36} />
                )}
              </div>
            }
            sub={growthSub}
            hue="blue"
          />
          <KPI
            label="Spend progress"
            value={
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: freeTierPct >= 80 ? "var(--warn)" : "var(--text-1)",
                  }}
                >
                  {freeTierPct}%
                </span>
                <FreeTierBar pct={freeTierPct} height={6} />
              </div>
            }
            sub="PoC heuristic: linear progress to 3M atomic units"
            hue={freeTierPct >= 80 ? "warn" : "default"}
          />
        </div>

        {/* Right: entry-point ratio */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 4,
            background: "#F8FAFC",
            border: "1px solid var(--line-strong)",
            boxShadow: "none",
            minWidth: 220,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--teal)",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon.bolt width="11" height="11" /> Entry-point ratio
          </div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
            <span className="mono" style={{ color: "var(--mesh-blue)" }}>
              {formatRatioPct(metrics.entryPointRatio, 0)}
            </span>{" "}
            of observations matched an attribution candidate
          </div>
        </div>
      </div>
    </div>
  );
}
