"use client";

import { Fragment, useMemo } from "react";
import type {
  CustomerProviderUsageDto,
  CustomerTimelineEventDto,
  CustomerTimelineEventType,
} from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras, SdkTimelineExtra } from "@/lib/sdk-fixtures/types";
import { resolveApiPaths } from "@/lib/api-path";
import { formatAtomic, formatTimestamp, shortAddr } from "@/lib/format";
import type { StoredProvider } from "@/lib/types";

type ActivityTimelineProps = {
  timeline: CustomerTimelineEventDto[];
  providers: CustomerProviderUsageDto[];
  payToByProviderId: Map<string, string>;
  storedProviders: StoredProvider[];
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
};

const TYPE_BADGE: Record<CustomerTimelineEventType, { label: string; color: string; bg: string }> = {
  payment: { label: "Payment", color: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  provider_usage: { label: "Provider", color: "#0D9488", bg: "rgba(13,148,136,0.10)" },
  growth: { label: "Growth", color: "#1D4ED8", bg: "rgba(29,78,216,0.10)" },
  upsell_signal: { label: "Upsell", color: "#B45309", bg: "rgba(180,83,9,0.10)" },
};

function formatApiPaths(paths: string[]): { text: string; unmapped: boolean } {
  if (paths.length === 0) return { text: "(unmapped)", unmapped: true };
  return { text: paths.join(", "), unmapped: false };
}

export function ActivityTimeline({
  timeline,
  providers,
  payToByProviderId,
  storedProviders,
  dataMode,
  sdkExtras,
}: ActivityTimelineProps) {
  // U-3 確定: provider 名は BFF providers[].name を canonical に使う
  const nameByProviderId = useMemo(
    () => new Map(providers.map((p) => [p.providerId, p.name])),
    [providers],
  );

  const sdkExtrasByTxHash = useMemo(() => {
    if (dataMode !== "sdkConnected" || !sdkExtras) return null;
    const m = new Map<string, SdkTimelineExtra>();
    for (const ex of sdkExtras.timelineExtras) m.set(ex.txHash, ex);
    return m;
  }, [dataMode, sdkExtras]);

  // 主役 wallet (sdkExtras.upsell !== null) のときだけ grouping ヘッダを出す.
  const showGrouping =
    dataMode === "sdkConnected" && sdkExtras?.upsell !== null && sdkExtrasByTxHash !== null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Activity timeline
        </div>
        <div className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {timeline.length} event{timeline.length === 1 ? "" : "s"}{" "}
          {showGrouping ? "from SDK telemetry preview" : "from BFF projection"}
        </div>
      </div>

      <div className="timeline-body" style={{ maxHeight: 520, overflow: "auto" }}>
        {timeline.length === 0 && (
          <div style={{ padding: 20, color: "var(--text-3)", fontSize: 14 }}>
            No timeline events.
          </div>
        )}
        {timeline.map((event, i) => {
          const badge = TYPE_BADGE[event.type];
          const providerName = event.providerId ? nameByProviderId.get(event.providerId) : undefined;
          const payTo = event.providerId ? payToByProviderId.get(event.providerId) : undefined;
          const sdkExtra = event.txHash
            ? sdkExtrasByTxHash?.get(event.txHash)
            : undefined;
          // SDK extra があれば apiPath を上書き. なければ従来の resolveApiPaths.
          const showApiPath = event.type === "payment" && (payTo !== undefined || !!sdkExtra);
          const apiPathDisplay = sdkExtra
            ? { text: sdkExtra.apiPath, unmapped: false }
            : showApiPath
              ? formatApiPaths(resolveApiPaths(payTo!, storedProviders))
              : null;

          // SDK preview grouping: cycleId が前の行と変わったら見出しを挿入.
          const prevExtra =
            i > 0 && timeline[i - 1].txHash
              ? sdkExtrasByTxHash?.get(timeline[i - 1].txHash!)
              : undefined;
          const cycleHeader =
            showGrouping && sdkExtra && (i === 0 || prevExtra?.cycleId !== sdkExtra.cycleId)
              ? `Hourly trading loop #${sdkExtra.cycleId}`
              : null;

          const isSelfRow = !!sdkExtra?.isSelfProvider;

          return (
            <Fragment key={`${event.timestamp}-${i}`}>
              {cycleHeader && (
                <div
                  data-testid="timeline-cycle-header"
                  style={{
                    padding: "10px 20px 6px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--sdk-purple)",
                    background: "rgba(91,33,182,0.04)",
                    borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  }}
                >
                  {cycleHeader}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 90px minmax(0, 1fr) 110px",
                  alignItems: "start",
                  gap: 14,
                  padding: "12px 20px",
                  borderBottom: i < timeline.length - 1 ? "1px solid var(--line)" : "none",
                  borderLeft: isSelfRow ? "3px solid var(--teal)" : "3px solid transparent",
                  background: isSelfRow ? "rgba(13,148,136,0.04)" : "transparent",
                }}
              >
              <span className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
                {formatTimestamp(event.timestamp)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: badge.color,
                  background: badge.bg,
                  padding: "3px 8px",
                  borderRadius: 4,
                  textAlign: "center",
                  alignSelf: "start",
                }}
              >
                {badge.label}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)" }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2, lineHeight: 1.5 }}>
                  {event.description}
                </div>
                {apiPathDisplay && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: apiPathDisplay.unmapped ? "var(--text-mute)" : "var(--text-2)",
                      fontStyle: apiPathDisplay.unmapped ? "italic" : "normal",
                      marginTop: 4,
                    }}
                  >
                    api: {apiPathDisplay.text}
                  </div>
                )}
                {(event.providerId || event.txHash) && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--text-mute)",
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {event.providerId && (
                      <span>provider: {providerName ?? event.providerId}</span>
                    )}
                    {event.txHash && <span>tx: {shortAddr(event.txHash)}</span>}
                  </div>
                )}
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "right",
                  color: event.amountAtomic || sdkExtra ? "var(--text-1)" : "var(--text-mute)",
                }}
              >
                {sdkExtra
                  ? `$${sdkExtra.amountUsd.toFixed(3)}`
                  : event.amountAtomic
                  ? formatAtomic(event.amountAtomic)
                  : "—"}
              </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
