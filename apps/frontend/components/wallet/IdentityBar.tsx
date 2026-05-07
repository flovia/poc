"use client";

import { Icon } from "@/components/ui/Icon";
import type { CustomerIdentityDto, CustomerMetricsDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { formatAtomic, formatUsd } from "@/lib/format";
import { useClipboardCopy } from "@/lib/use-clipboard-copy";

type IdentityBarProps = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
};

export function IdentityBar({ customer, metrics, dataMode, sdkExtras }: IdentityBarProps) {
  const { copied, copy } = useClipboardCopy(1400);
  const isSdkConnected = dataMode === "sdkConnected" && sdkExtras !== null;
  const hasSdkUpsell = isSdkConnected && sdkExtras!.upsell !== null; // 主役のみ
  const totalSpendDisplay =
    isSdkConnected && hasSdkUpsell
      ? formatUsd(sdkExtras!.totalSpendUsd)
      : `${formatAtomic(metrics.spendAtomic)} USDC`;
  const totalSpendSub =
    isSdkConnected && hasSdkUpsell ? "USD · SDK preview (mock)" : "USDC spend";
  const baseScanUrl = `https://basescan.org/address/${customer.address}#tokentxns`;
  const copyAddress = () => void copy(customer.address);

  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        background: "#FFFFFF",
        borderColor: "var(--line)",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div className="wallet-identity-grid">
        <div className="wallet-identity-main">
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
              href={baseScanUrl}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "4px 7px", color: "var(--text-3)", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5 }}
              title="Open on BaseScan"
              aria-label="Open wallet on BaseScan"
            >
              <Icon.external width="13" height="13" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>BaseScan</span>
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

        <div className="wallet-identity-spend">
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
