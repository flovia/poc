"use client";

import { useCallback, useState } from "react";
import { HeaderTooltip } from "./HeaderTooltip";
import { CoUsageProvidersChart } from "./CoUsageProvidersChart";
import { CoUsageProviderDrawer } from "./CoUsageProviderDrawer";
import type { CoUsageProviderRow } from "@/lib/customers/co-usage-providers";
import { useFrontendLocale } from "@/lib/frontend-locale";

const ENDPOINT_PREVIEW_COUNT = 3;

const opportunityChipClass = (level: "high" | "medium" | "low") => {
  if (level === "high") return "chip blue";
  if (level === "medium") return "chip teal";
  return "chip mute";
};

const opportunityLabel = (level: "high" | "medium" | "low") => {
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
};

const shortEndpoint = (serviceName: string): string => {
  try {
    const url = new URL(serviceName);
    const path = url.pathname === "/" ? "" : url.pathname;
    return path || url.hostname;
  } catch {
    return serviceName.length > 48 ? `${serviceName.slice(0, 47)}…` : serviceName;
  }
};

export function CoUsageProvidersView({
  rows,
  providerId,
}: {
  rows: CoUsageProviderRow[];
  providerId: string;
}) {
  const { text } = useFrontendLocale();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const select = useCallback((row: CoUsageProviderRow) => {
    setSelectedKey(row.payToWallet ?? row.providerId);
  }, []);
  const close = useCallback(() => setSelectedKey(null), []);

  const selectedRow =
    rows.find((r) => (r.payToWallet ?? r.providerId) === selectedKey) ?? null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <CoUsageProvidersChart rows={rows} onRowSelect={select} />
      </div>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--surface-card)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <table className="dt">
          <thead>
            <tr>
              <th>
                <HeaderTooltip
                  label={text("Provider", "プロバイダー")}
                  description={text("Name of the external x402 API provider that your customers also pay. Resolved from the on-chain pay_to address; falls back to the address when the provider is not yet identified. Click a row to open details.", "あなたの顧客が併せて支払っている外部x402 APIプロバイダー名です。オンチェーンのpay_toアドレスから解決し、未特定の場合はアドレスにフォールバックします。行をクリックすると詳細を開きます。")}
                />
              </th>
              <th>
                <HeaderTooltip
                  label={text("Top endpoints", "上位エンドポイント")}
                  description={text("Endpoints of this provider that your customers hit most, ranked by shared tx count. Up to 3 are listed inline; the count below shows the total number of distinct endpoints used.", "あなたの顧客がこのプロバイダーで最も使っているエンドポイントを共有tx数順に表示します。最大3件を行内に表示し、下の数値は利用された異なるエンドポイント総数です。")}
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label={text("Shared wallets", "共有ウォレット")}
                  description={text("Number of distinct payer wallets that pay both your provider and this external provider through x402.", "あなたのプロバイダーとこの外部プロバイダーの両方にx402で支払った異なるウォレット数です。")}
                  align="right"
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label={text("Shared tx", "共有tx")}
                  description={text("Total observed x402 transactions from your customers to this external provider, summed across all shared wallets.", "共有ウォレット全体で観測された、あなたの顧客からこの外部プロバイダーへのx402取引合計です。")}
                  align="right"
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label={text("Correlation", "相関")}
                  description={text("Average co-usage confidence (0–1). Higher values mean the overlap is more likely to be a meaningful behavioral signal rather than coincidental.", "平均併用信頼度（0–1）です。値が高いほど偶然ではなく意味のある行動シグナルである可能性が高くなります。")}
                  align="right"
                />
              </th>
              <th>
                <HeaderTooltip
                  label={text("Opportunity", "機会")}
                  description={text("Bundling / partnership opportunity bucketed from the correlation score. High ≥ 0.70, Medium 0.40–0.69, Low < 0.40.", "相関スコアから分類したバンドル/提携機会です。High ≥ 0.70、Medium 0.40–0.69、Low < 0.40。")}
                  align="right"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = row.payToWallet ?? row.providerId;
              return (
                <tr key={key}>
                  <td>
                    <button
                      type="button"
                      onClick={() => select(row)}
                      aria-label={text(`Open details for ${row.providerName}`, `${row.providerName} の詳細を開く`)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--mesh-blue)",
                          textDecoration: "underline",
                          textDecorationStyle: "dotted",
                          textDecorationColor: "var(--text-mute)",
                        }}
                      >
                        {row.providerName}
                      </div>
                      {row.payToWallet && (
                        <div
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: "var(--text-3)",
                            marginTop: 2,
                            wordBreak: "break-all",
                          }}
                        >
                          {row.payToWallet}
                        </div>
                      )}
                    </button>
                  </td>
                  <td style={{ color: "var(--text-2)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {row.endpoints.slice(0, ENDPOINT_PREVIEW_COUNT).map((ep, i) => (
                        <div
                          key={ep.serviceName}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: i === 0 ? "var(--text-1)" : "var(--text-2)",
                          }}
                          title={ep.serviceName}
                        >
                          <span
                            className="mono"
                            style={{
                              flex: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 360,
                            }}
                          >
                            {shortEndpoint(ep.serviceName)}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              color: "var(--text-3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ep.sharedTxCount} tx
                          </span>
                        </div>
                      ))}
                      {row.endpoints.length > ENDPOINT_PREVIEW_COUNT && (
                        <div style={{ fontSize: 11, color: "var(--text-mute)" }}>
                          {text(
                            `+${row.endpoints.length - ENDPOINT_PREVIEW_COUNT} more endpoint${row.endpoints.length - ENDPOINT_PREVIEW_COUNT > 1 ? "s" : ""}`,
                            `他${row.endpoints.length - ENDPOINT_PREVIEW_COUNT}エンドポイント`,
                          )}
                        </div>
                      )}
                      {row.endpoints.length === 0 && (
                        <span style={{ color: "var(--text-mute)" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>{row.sharedWallets.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{row.sharedTxCount.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }} className="mono">
                    {row.confidence.toFixed(2)}
                  </td>
                  <td>
                    <span className={opportunityChipClass(row.opportunity)}>
                      {text(
                        opportunityLabel(row.opportunity),
                        row.opportunity === "high" ? "高" : row.opportunity === "medium" ? "中" : "低",
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CoUsageProviderDrawer row={selectedRow} providerId={providerId} onClose={close} />
    </>
  );
}
