"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ChainBadge } from "./ChainBadge";
import { HeaderTooltip } from "./HeaderTooltip";
import { Sparkline7d } from "@/components/wallet/Sparkline7d";
import { classNames, formatAtomic, formatTimestamp } from "@/lib/format";
import type { CustomerListItemDto } from "@/lib/api/types";
import { getCustomerChainAttribution } from "@/lib/customers/chain";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";

type CustomersTableProps = {
  customers: CustomerListItemDto[];
  providerId: string;
  dataMode: DashboardMode;
  extrasMap: Map<string, SdkExtras>;
  // フィルタ適用前の元件数。フィルタで 0 件になった場合と、BFF projection が
  // 空の場合とで empty state の文言を出し分けるために使う。
  totalBeforeFilter: number;
};

function AgentBadge({ agentType }: { agentType: string }) {
  return (
    <span
      data-testid="customers-agent-badge"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
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
  totalBeforeFilter,
}: CustomersTableProps) {
  const isSdkConnected = dataMode === "sdkConnected";
  const rowClass = isSdkConnected ? "cust-row cust-row-sdk" : "cust-row";
  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className={`${rowClass} cust-head`}>
        <div>
          <HeaderTooltip
            label="Wallet"
            description="Payer wallet address. Click a wallet to open its profile: spend history, AI agent context, endpoint usage, and cross-provider activity."
          />
        </div>
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label="Agent"
              description="Agent type self-reported by the SDK on this wallet's recent calls (e.g. coding-assistant, research-bot)."
            />
          </div>
        )}
        <div>
          <HeaderTooltip
            label="Chain"
            description="Chain and asset this payer wallet mainly transacts in. Currently fixed to Base / USDC across all rows."
          />
        </div>
        <div>
          <HeaderTooltip
            label="Spend (atomic)"
            description="Total amount this wallet has spent with the current provider, shown in atomic (smallest) token units."
          />
        </div>
        <div>
          <HeaderTooltip
            label="Observations"
            description="Number of payment observations recorded for this wallet by the current provider."
          />
        </div>
        <div>
          <HeaderTooltip
            label="Providers"
            description="How many distinct providers this wallet has paid across the network."
          />
        </div>
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label="Used endpoint"
              description="The API endpoint this wallet hits most often, reported by the SDK."
            />
          </div>
        )}
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label="7d"
              description="Spend trend over the last 7 days, one bar per day."
            />
          </div>
        )}
        <div>
          <HeaderTooltip
            label="Last seen"
            description="Timestamp of the most recent payment observation from this wallet."
            align="right"
          />
        </div>
      </div>
      {customers.length === 0 && (
        <div style={{ padding: 24, color: "var(--text-3)", fontSize: 14 }}>
          {totalBeforeFilter === 0
            ? "No payer wallets found yet."
            : "No payer wallets match the current filters."}
        </div>
      )}
      {customers.map((c, i) => {
        const extras = isSdkConnected ? extrasMap.get(c.address) ?? null : null;
        const chainAttribution = getCustomerChainAttribution(c);
        return (
          <Link
            key={c.address}
            href={`/providers/${providerId}/wallet/${encodeURIComponent(c.address)}`}
            className={classNames(rowClass, "cust-row-link")}
            aria-label={`Open wallet profile for ${c.address}`}
            style={{
              animation: `fade-up 240ms ${Math.min(i * 25, 200)}ms both ease-out`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="row-indicator" />
              <span style={{ minWidth: 0 }}>
                <span
                  className="mono wallet-address-link"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={c.address}
                >
                  {c.address}
                </span>
                <span className="wallet-profile-hint" aria-hidden="true">
                  Wallet profile →
                </span>
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

            <div>
              <ChainBadge chain={chainAttribution.chain} asset={chainAttribution.asset} />
            </div>

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

            {isSdkConnected && (
              <div>
                {extras && extras.sparkline7d.length === 7 ? (
                  <Sparkline7d points={extras.sparkline7d} width={90} height={28} />
                ) : (
                  <span style={{ color: "var(--text-mute)" }}>—</span>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <span className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
                {formatTimestamp(c.lastSeenAt)}
              </span>
              <span className="row-arrow" style={{ display: "inline-flex", alignItems: "center" }}>
                <Icon.arrow width="14" height="14" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
