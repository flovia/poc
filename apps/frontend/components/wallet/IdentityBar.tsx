"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { CustomerIdentityDto, CustomerMetricsDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { formatAtomic, formatUsd } from "@/lib/format";
import { useClipboardCopy } from "@/lib/use-clipboard-copy";

type IdentityBarProps = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
  activity?: {
    paymentCount: number;
    providerCount: number;
  };
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
};

export function IdentityBar({ customer, metrics, activity, dataMode, sdkExtras }: IdentityBarProps) {
  const { copied, copy } = useClipboardCopy(1400);
  const isSdkConnected = dataMode === "sdkConnected" && sdkExtras !== null;
  const hasSdkUpsell = isSdkConnected && sdkExtras!.upsell !== null; // 主役のみ
  const totalSpendDisplay =
    isSdkConnected && hasSdkUpsell
      ? formatUsd(sdkExtras!.totalSpendUsd)
      : `${formatAtomic(metrics.spendAtomic)} USDC`;
  const totalSpendSub =
    isSdkConnected && hasSdkUpsell ? "USD · SDK preview (mock)" : "USDC spend";
  const explorer = getWalletExplorer(customer.address, customer.network);
  const copyAddress = () => void copy(customer.address);

  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        background: "#FFFFFF",
        borderColor: "var(--line-strong)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="identity-bar-layout">
        <div className="identity-bar-main" style={{ minWidth: 0, flex: 1 }}>
          <div className="identity-bar-address-row">
            <span
              className="mono display identity-bar-address"
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
              type="button"
              className="btn ghost"
              style={{ padding: "4px 6px", color: "var(--text-3)", flexShrink: 0 }}
              title={copied ? "Copied" : "Copy address"}
              aria-label={copied ? "Address copied" : "Copy address"}
              onClick={copyAddress}
            >
              {copied ? <Icon.check width="13" height="13" /> : <Icon.copy width="13" height="13" />}
            </button>
            <a
              className="btn ghost"
              href={explorer.url}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "4px 7px", color: "var(--text-3)", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5 }}
              title={`Open on ${explorer.label}`}
              aria-label={`Open wallet on ${explorer.label}`}
            >
              <Icon.external width="13" height="13" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{explorer.label}</span>
            </a>
            {copied && (
              <span style={{ color: "var(--teal)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                Copied
              </span>
            )}
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
          </div>
        </div>

        <div
          className="identity-bar-spend"
          style={{
            display: "grid",
            gridTemplateColumns: activity ? "repeat(2, max-content)" : "max-content",
            gap: 24,
            alignItems: "start",
            justifyContent: "end",
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <div className="identity-bar-metric">
            <MetricLabel>Total spend</MetricLabel>
            <MetricValue title={totalSpendDisplay}>{totalSpendDisplay}</MetricValue>
            <div className="identity-bar-metric-subtitle">{totalSpendSub}</div>
          </div>
          {activity && (
            <div className="identity-bar-metric">
              <MetricLabel>Activity</MetricLabel>
              <MetricValue>
                {activity.paymentCount.toLocaleString("en-US")} payment
                {activity.paymentCount === 1 ? "" : "s"}
              </MetricValue>
              <div className="identity-bar-metric-subtitle">
                {activity.providerCount} provider{activity.providerCount === 1 ? "" : "s"} · {activityLabel(metrics)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-mute)",
      }}
    >
      {children}
    </div>
  );
}

function MetricValue({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div
      className="mono display"
      style={{
        fontSize: 26,
        fontWeight: 700,
        color: "var(--text-1)",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
      title={title}
    >
      {children}
    </div>
  );
}

function activityLabel(metrics: CustomerMetricsDto): string {
  return metrics.upsellOpportunity === "high"
    ? "High activity"
    : metrics.upsellOpportunity === "medium"
      ? "Medium activity"
      : "Low activity";
}

function getWalletExplorer(address: string, network: string | undefined): { label: string; url: string } {
  const normalizedNetwork = network?.toLowerCase() ?? "";
  if (normalizedNetwork.includes("solana") || !address.startsWith("0x")) {
    return { label: "Solscan", url: `https://solscan.io/account/${address}` };
  }

  return { label: "BaseScan", url: `https://basescan.org/address/${address}#tokentxns` };
}
