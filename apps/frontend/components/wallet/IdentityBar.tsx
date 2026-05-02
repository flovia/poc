import { Icon } from "@/components/ui/Icon";
import type { CustomerIdentityDto, CustomerMetricsDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { formatAtomic } from "@/lib/format";

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

export function IdentityBar({ customer, metrics, dataMode, sdkExtras }: IdentityBarProps) {
  const isSdkConnected = dataMode === "sdkConnected" && sdkExtras !== null;
  const hasSdkUpsell = isSdkConnected && sdkExtras!.upsell !== null; // 主役のみ
  const totalSpendDisplay =
    isSdkConnected && hasSdkUpsell
      ? formatUsd(sdkExtras!.totalSpendUsd)
      : formatAtomic(metrics.spendAtomic);
  const totalSpendSub =
    isSdkConnected && hasSdkUpsell ? "USD · SDK preview (mock)" : "atomic units (USDC*)";
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
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--mesh-blue)",
                boxShadow: "none",
                flexShrink: 0,
              }}
            />
            <span
              className="mono display"
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {customer.address}
            </span>
            <button
              className="btn ghost"
              style={{ padding: "4px 6px", color: "var(--text-3)", flexShrink: 0 }}
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
            }}
          >
            Total spend
          </div>
          <div
            className="mono display"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
            title={totalSpendDisplay}
          >
            {totalSpendDisplay}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{totalSpendSub}</div>
        </div>
      </div>
    </div>
  );
}
