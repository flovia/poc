"use client";

import { useCallback, useState } from "react";
import { HeaderTooltip } from "./HeaderTooltip";
import { CoUsageProvidersChart } from "./CoUsageProvidersChart";
import { CoUsageProviderDrawer } from "./CoUsageProviderDrawer";
import type { CoUsageProviderRow } from "@/lib/customers/co-usage-providers";

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
                  label="Provider"
                  description="Name of the external x402 API provider that your customers also pay. Resolved from the on-chain pay_to address; falls back to the address when the provider is not yet identified. Click a row to open details."
                />
              </th>
              <th>
                <HeaderTooltip
                  label="Top endpoints"
                  description="Endpoints of this provider that your customers hit most, ranked by shared tx count. Up to 3 are listed inline; the count below shows the total number of distinct endpoints used."
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label="Shared wallets"
                  description="Number of distinct payer wallets that pay both your provider and this external provider through x402."
                  align="right"
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label="Shared tx"
                  description="Total observed x402 transactions from your customers to this external provider, summed across all shared wallets."
                  align="right"
                />
              </th>
              <th style={{ textAlign: "right" }}>
                <HeaderTooltip
                  label="Correlation"
                  description="Average co-usage confidence (0–1) reported by the BFF. Higher values mean the overlap is more likely to be a meaningful behavioral signal rather than coincidental."
                  align="right"
                />
              </th>
              <th>
                <HeaderTooltip
                  label="Opportunity"
                  description="Bundling / partnership opportunity bucketed from the correlation score. High ≥ 0.70, Medium 0.40–0.69, Low < 0.40."
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
                      aria-label={`Open details for ${row.providerName}`}
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
                          +{row.endpoints.length - ENDPOINT_PREVIEW_COUNT} more endpoint
                          {row.endpoints.length - ENDPOINT_PREVIEW_COUNT > 1 ? "s" : ""}
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
                      {opportunityLabel(row.opportunity)}
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
