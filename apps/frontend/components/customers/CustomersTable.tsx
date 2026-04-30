"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UpsellPill } from "./UpsellPill";
import { Sparkline7d } from "@/components/wallet/Sparkline7d";
import { classNames, formatAtomic, formatGrowth, formatTimestamp } from "@/lib/format";
import type { CustomerListItemDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";

type CustomersTableProps = {
  customers: CustomerListItemDto[];
  providerId: string;
  dataMode: DashboardMode;
  extrasMap: Map<string, SdkExtras>;
};

function AgentBadge({ agentType }: { agentType: string }) {
  return (
    <span
      data-testid="customers-agent-badge"
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 3,
        background: "var(--sdk-purple)",
        color: "#FFFFFF",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
      title={agentType}
    >
      {agentType}
    </span>
  );
}

export function CustomersTable({
  customers,
  providerId,
  dataMode,
  extrasMap,
}: CustomersTableProps) {
  const isSdkConnected = dataMode === "sdkConnected";
  const rowClass = isSdkConnected ? "cust-row cust-row-sdk" : "cust-row";
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className={`${rowClass} cust-head`}>
        <div>Wallet</div>
        {isSdkConnected && <div>Agent</div>}
        <div>Spend (atomic)</div>
        <div>Observations</div>
        <div>Providers</div>
        {isSdkConnected && <div>Used endpoint</div>}
        <div>Activity growth</div>
        {isSdkConnected && <div>7d</div>}
        <div>Last seen</div>
        <div>Upsell</div>
        <div aria-hidden />
      </div>
      {customers.length === 0 && (
        <div style={{ padding: 24, color: "var(--text-3)", fontSize: 14 }}>
          No payer wallets in BFF projection yet.
        </div>
      )}
      {customers.map((c, i) => {
        const extras = isSdkConnected ? extrasMap.get(c.address) ?? null : null;
        return (
          <Link
            key={c.address}
            href={`/providers/${providerId}/wallet/${encodeURIComponent(c.address)}`}
            className={classNames(rowClass)}
            style={{
              animation: `fade-up 240ms ${Math.min(i * 25, 200)}ms both ease-out`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="row-indicator" />
              <span
                className="mono"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={c.address}
              >
                {c.address}
              </span>
              {c.label && (
                <span className="chip" style={{ fontSize: 11, padding: "1px 6px" }}>
                  {c.label}
                </span>
              )}
            </div>

            {isSdkConnected && (
              <div style={{ minWidth: 0 }}>
                {extras?.agentType ? <AgentBadge agentType={extras.agentType} /> : <span style={{ color: "var(--text-mute)" }}>—</span>}
              </div>
            )}

            <div className="mono" style={{ fontSize: 14, color: "var(--text-1)" }}>
              {formatAtomic(c.spendAtomic)}
            </div>
            <div className="mono" style={{ fontSize: 14, color: "var(--text-2)" }}>
              {c.observationCount}
            </div>
            <div className="mono" style={{ fontSize: 14, color: "var(--text-2)" }}>
              {c.providerCount}
            </div>

            {isSdkConnected && (
              <div
                data-testid="customers-endpoint"
                className="mono"
                style={{
                  fontSize: 13,
                  color: extras?.usedEndpointsTopK[0] ? "var(--text-2)" : "var(--text-mute)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontStyle: extras?.usedEndpointsTopK[0] ? "normal" : "italic",
                }}
              >
                {extras?.usedEndpointsTopK[0] ?? "(none)"}
              </div>
            )}

            <div
              className="mono"
              style={{
                fontSize: 13,
                color:
                  c.activityGrowth > 0
                    ? "var(--mesh-blue)"
                    : c.activityGrowth < 0
                    ? "var(--text-3)"
                    : "var(--text-2)",
                fontWeight: 600,
              }}
            >
              {formatGrowth(c.activityGrowth)}
            </div>

            {isSdkConnected && (
              <div>
                {extras && extras.sparkline7d.length === 7 ? (
                  <Sparkline7d points={extras.sparkline7d} width={90} height={28} />
                ) : (
                  <span style={{ color: "var(--text-mute)" }}>—</span>
                )}
              </div>
            )}

            <div className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
              {formatTimestamp(c.lastSeenAt)}
            </div>
            <div>
              <UpsellPill opportunity={c.upsellOpportunity} />
            </div>
            <div className="row-arrow" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Icon.arrow width="14" height="14" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
