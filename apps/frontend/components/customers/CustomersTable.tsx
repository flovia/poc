"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ChainBadge } from "./ChainBadge";
import { HeaderTooltip } from "./HeaderTooltip";
import { Sparkline7d } from "@/components/wallet/Sparkline7d";
import { classNames, formatAtomic, formatTimestamp } from "@/lib/format";
import { useFrontendLocale } from "@/lib/frontend-locale";
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
  const { text } = useFrontendLocale();
  const isSdkConnected = dataMode === "sdkConnected";
  const rowClass = isSdkConnected ? "cust-row cust-row-sdk" : "cust-row";
  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className={`${rowClass} cust-head`}>
        <div>
          <HeaderTooltip
            label={text("Wallet", "ウォレット")}
            description={text("Payer wallet address. The on-chain account that has paid this provider.", "支払いウォレットアドレス。このプロバイダーに支払ったオンチェーンアカウントです。")}
          />
        </div>
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label={text("Agent", "エージェント")}
              description={text("Agent type self-reported by the SDK on this wallet's recent calls (e.g. coding-assistant, research-bot).", "このウォレットの直近呼び出しでSDKが自己申告したエージェント種別です。")}
            />
          </div>
        )}
        <div>
          <HeaderTooltip
            label={text("Chain", "チェーン")}
            description={text("Chain and asset this payer wallet mainly transacts in. Currently fixed to Base / USDC across all rows.", "この支払いウォレットが主に利用するチェーンとアセットです。現在は全行 Base / USDC 固定です。")}
          />
        </div>
        <div>
          <HeaderTooltip
            label={text("Spend (atomic)", "支出（atomic）")}
            description={text("Total amount this wallet has spent with the current provider, shown in atomic (smallest) token units.", "このウォレットが現在のプロバイダーに支払った合計額をatomic（最小単位）で表示します。")}
          />
        </div>
        <div>
          <HeaderTooltip
            label={text("Observations", "観測数")}
            description={text("Number of payment observations recorded for this wallet by the current provider.", "現在のプロバイダーで記録されたこのウォレットの支払い観測数です。")}
          />
        </div>
        <div>
          <HeaderTooltip
            label={text("Providers", "プロバイダー")}
            description={text("How many distinct providers this wallet has paid across the network.", "このウォレットがネットワーク全体で支払った異なるプロバイダー数です。")}
          />
        </div>
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label={text("Used endpoint", "使用エンドポイント")}
              description={text("The API endpoint this wallet hits most often, reported by the SDK.", "SDKから報告された、このウォレットが最もよく呼ぶAPIエンドポイントです。")}
            />
          </div>
        )}
        {isSdkConnected && (
          <div>
            <HeaderTooltip
              label={text("7d", "7日")}
              description={text("Spend trend over the last 7 days, one bar per day.", "直近7日間の支出トレンドです。1日1本のバーで表示します。")}
            />
          </div>
        )}
        <div>
          <HeaderTooltip
            label={text("Last seen", "最終確認")}
            description={text("Timestamp of the most recent payment observation from this wallet.", "このウォレットの最新支払い観測のタイムスタンプです。")}
            align="right"
          />
        </div>
      </div>
      {customers.length === 0 && (
        <div style={{ padding: 24, color: "var(--text-3)", fontSize: 14 }}>
          {totalBeforeFilter === 0
            ? text("No payer wallets found yet.", "支払いウォレットはまだ見つかっていません。")
            : text("No payer wallets match the current filters.", "現在のフィルターに一致する支払いウォレットはありません。")}
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
            aria-label={text(`Open details for wallet ${c.address}`, `ウォレット ${c.address} の詳細を開く`)}
            style={{
              animation: `fade-up 240ms ${Math.min(i * 25, 200)}ms both ease-out`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="row-indicator" />
              <span
                className="mono wallet-address-link"
                style={{
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
