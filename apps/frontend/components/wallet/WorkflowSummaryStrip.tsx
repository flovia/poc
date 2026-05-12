"use client";

import { Fragment, useMemo } from "react";
import type {
  CustomerProviderUsageDto,
  CustomerTimelineEventDto,
} from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import { resolveApiPaths } from "@/lib/api-path";
import type { StoredProvider } from "@/lib/types";

const CYCLE_THRESHOLD_SEC = 300; // 5 分
const MAX_CYCLES_DISPLAYED = 3;

type Props = {
  timeline: CustomerTimelineEventDto[];
  providers: CustomerProviderUsageDto[];
  payToByProviderId: Map<string, string>;
  apiPathsByProviderId: Map<string, string[]>;
  storedProviders: StoredProvider[];
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
};

type CycleEvent = {
  providerName: string;
  apiPathDisplay: string;
  unmapped: boolean;
};

type Cycle = {
  index: number;
  events: CycleEvent[];
};

function formatApiPaths(paths: string[]): { text: string; unmapped: boolean } {
  if (paths.length === 0) return { text: "(unmapped)", unmapped: true };
  return { text: paths.join(", "), unmapped: false };
}

function buildCycles(
  timeline: CustomerTimelineEventDto[],
  providers: CustomerProviderUsageDto[],
  payToByProviderId: Map<string, string>,
  apiPathsByProviderId: Map<string, string[]>,
  storedProviders: StoredProvider[],
  sdkExtrasByTxHash: Map<string, { apiPath: string }> | null,
): { cycles: Cycle[]; remaining: number } {
  const payments = timeline
    .filter((event) => event.type === "payment")
    .sort((a, b) => a.timestamp - b.timestamp);

  const nameByProviderId = new Map(providers.map((p) => [p.providerId, p.name]));

  const allCycles: Cycle[] = [];
  let current: CycleEvent[] = [];
  let prevTimestamp: number | null = null;
  let cycleIndex = 0;

  const flush = () => {
    if (current.length === 0) return;
    cycleIndex += 1;
    allCycles.push({ index: cycleIndex, events: current });
    current = [];
  };

  for (const event of payments) {
    if (prevTimestamp !== null && event.timestamp - prevTimestamp > CYCLE_THRESHOLD_SEC) {
      flush();
    }

    const providerName = event.providerId
      ? nameByProviderId.get(event.providerId) ?? event.providerId
      : "(unknown provider)";

    // SDK extras から apiPath を引けるなら最優先で使う (主役 wallet 専用).
    const sdkExtra = event.txHash ? sdkExtrasByTxHash?.get(event.txHash) : undefined;
    let textInfo: { text: string; unmapped: boolean };
    if (sdkExtra) {
      textInfo = { text: sdkExtra.apiPath, unmapped: false };
    } else {
      const payTo = event.providerId ? payToByProviderId.get(event.providerId) : undefined;
      const storedApiPaths = payTo ? resolveApiPaths(payTo, storedProviders) : [];
      const apiPaths = storedApiPaths.length
        ? storedApiPaths
        : event.providerId
          ? (apiPathsByProviderId.get(event.providerId) ?? [])
          : [];
      textInfo = formatApiPaths(apiPaths);
    }

    current.push({ providerName, apiPathDisplay: textInfo.text, unmapped: textInfo.unmapped });
    prevTimestamp = event.timestamp;
  }
  flush();

  const cycles = allCycles.slice(0, MAX_CYCLES_DISPLAYED);
  const remaining = Math.max(0, allCycles.length - MAX_CYCLES_DISPLAYED);
  return { cycles, remaining };
}

export function WorkflowSummaryStrip({
  timeline,
  providers,
  payToByProviderId,
  apiPathsByProviderId,
  storedProviders,
  dataMode,
  sdkExtras,
}: Props) {
  const sdkExtrasByTxHash = useMemo(() => {
    if (dataMode !== "sdkConnected" || !sdkExtras) return null;
    const m = new Map<string, { apiPath: string }>();
    for (const ex of sdkExtras.timelineExtras) {
      m.set(ex.txHash, { apiPath: ex.apiPath });
    }
    return m;
  }, [dataMode, sdkExtras]);

  const { cycles, remaining } = useMemo(
    () =>
      buildCycles(
        timeline,
        providers,
        payToByProviderId,
        apiPathsByProviderId,
        storedProviders,
        sdkExtrasByTxHash,
      ),
    [timeline, providers, payToByProviderId, apiPathsByProviderId, storedProviders, sdkExtrasByTxHash],
  );

  const cycleLabel = (i: number) =>
    dataMode === "sdkConnected" && sdkExtras?.upsell ? `Hourly trading loop #${i}` : `Cycle ${i}`;

  if (dataMode !== "sdkConnected") return null;
  if (cycles.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--line)" }}>
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
          Workflow summary
        </div>
        <div className="display" style={{ fontSize: 15, color: "var(--text-2)" }}>
          Repeating sequences observed across this wallet&apos;s payments
        </div>
      </div>

      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {cycles.map((cycle) => (
          <div
            key={cycle.index}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6, fontSize: 14 }}
          >
            <span
              className="mono"
              style={{ fontWeight: 600, color: "var(--text-1)", marginRight: 4 }}
            >
              {cycleLabel(cycle.index)}:
            </span>
            {cycle.events.map((event, i) => (
              <Fragment key={i}>
                <span style={{ color: "var(--text-1)" }}>{event.providerName} </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 13,
                    color: event.unmapped ? "var(--text-mute)" : "var(--text-2)",
                    fontStyle: event.unmapped ? "italic" : "normal",
                  }}
                >
                  ({event.apiPathDisplay})
                </span>
                {i < cycle.events.length - 1 && (
                  <span className="mono" style={{ color: "var(--text-mute)", margin: "0 2px" }}>
                    →
                  </span>
                )}
              </Fragment>
            ))}
          </div>
        ))}
        {remaining > 0 && (
          <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
            +{remaining} more {remaining === 1 ? "cycle" : "cycles"}
          </div>
        )}
      </div>
    </div>
  );
}
