"use client";

import { useMemo, useState } from "react";
import { useActiveProvider } from "@/app/providers";
import type { PaymentObservationDto, WalletUsageGraphDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type {
  SdkRetentionByAgentRow,
  SdkWorkflowCluster,
} from "@/lib/sdk-fixtures/types";
import { shortAddr } from "@/lib/format";
import { BubbleChart, type ProviderBubble } from "./BubbleChart";
import { WorkflowClusters } from "./WorkflowClusters";
import { RetentionByAgent } from "./RetentionByAgent";

const RETENTION_THRESHOLD_SEC = 14 * 86400; // 14 days

type PatternsScreenProps = {
  graph: WalletUsageGraphDto;
  observations: PaymentObservationDto[];
  providerId: string;
  dataMode: DashboardMode;
  sdkWorkflowClusters: SdkWorkflowCluster[];
  sdkRetentionByAgent: SdkRetentionByAgentRow[];
};

// payer x recipient ごとの first / last block_timestamp を集計し、
// 14 日以上スパンのある組 (= retained) のキー集合を返す。
// キーは `${payer}|${recipient}` の lowercase pair。
function buildRetainedSet(observations: PaymentObservationDto[]): Set<string> {
  const ranges = new Map<string, { min: number; max: number }>();
  for (const obs of observations) {
    const payer = obs.payerWallet.toLowerCase();
    const recipient = obs.recipientWallet.toLowerCase();
    const key = `${payer}|${recipient}`;
    const ts = obs.blockTimestamp;
    const range = ranges.get(key);
    if (!range) {
      ranges.set(key, { min: ts, max: ts });
    } else {
      range.min = Math.min(range.min, ts);
      range.max = Math.max(range.max, ts);
    }
  }
  const retained = new Set<string>();
  for (const [key, { min, max }] of ranges) {
    if (max - min >= RETENTION_THRESHOLD_SEC) retained.add(key);
  }
  return retained;
}

function buildBubbles(
  graph: WalletUsageGraphDto,
  observations: PaymentObservationDto[],
): ProviderBubble[] {
  const providerWallets = graph.providerWallets;
  if (providerWallets.length === 0) return [];

  const retained = buildRetainedSet(observations);

  const stats = providerWallets.map((entry) => {
    const recipient = entry.payTo.toLowerCase();
    const wallets = entry.payerWallets.length;
    let retainedCount = 0;
    for (const p of entry.payerWallets) {
      const key = `${p.wallet.toLowerCase()}|${recipient}`;
      if (retained.has(key)) retainedCount += 1;
    }
    const retainedRatio = wallets === 0 ? 0 : retainedCount / wallets;
    return { entry, wallets, retainedRatio };
  });

  const maxWallets = Math.max(...stats.map((s) => s.wallets), 1);

  return stats.map(({ entry, wallets, retainedRatio }) => {
    const x = wallets / maxWallets;
    const y = retainedRatio; // 0..1 の実比率をそのまま使う
    const accent: ProviderBubble["accent"] =
      x >= 0.66 && retainedRatio >= 0.5
        ? "teal"
        : x >= 0.4
        ? "blue"
        : "slate";
    return {
      id: entry.payTo,
      label: entry.claimIds[0] ?? shortAddr(entry.payTo),
      x,
      y,
      r: 8 + Math.round((wallets / maxWallets) * 24),
      wallets,
      accent,
    };
  });
}

export function PatternsScreen({
  graph,
  observations,
  providerId,
  dataMode,
  sdkWorkflowClusters,
  sdkRetentionByAgent,
}: PatternsScreenProps) {
  const { active, hydrated } = useActiveProvider(providerId);
  const selfProviderName = !hydrated ? "…" : active?.name ?? providerId;
  const [hover, setHover] = useState<string | null>(null);

  const bubbles = useMemo(
    () => buildBubbles(graph, observations),
    [graph, observations],
  );

  const isSdkConnected = dataMode === "sdkConnected";

  return (
    <div style={{ position: "relative", background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ position: "relative", padding: "32px 40px 80px", maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginBottom: 6,
            }}
          >
            {selfProviderName} · BFF wallet-usage graph
          </div>
          <h1
            className="display"
            style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" }}
          >
            Co-usage patterns across payer wallets
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 15, margin: "6px 0 0", maxWidth: 720 }}>
            Each bubble is a recipient (provider) wallet observed by the BFF. X-axis is unique
            payer wallets, Y-axis is the share of payer wallets whose observed activity for that
            provider spans 14 days or more (a simplified retention proxy). Identity-bearing fields
            are excluded:{" "}
            <span className="mono" style={{ fontSize: 13 }}>
              {graph.identityFieldsExcluded.join(", ") || "—"}
            </span>
            .
          </p>
        </div>

        <BubbleChart bubbles={bubbles} hover={hover} setHover={setHover} providerId={providerId} />

        <p style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 16, maxWidth: 720, lineHeight: 1.55 }}>
          Note: Retention is the share of payer wallets whose first and last observed payment to a
          provider are at least 14 days apart. This is a PoC heuristic, not a cohort-based D14
          retention metric.
        </p>

        {isSdkConnected && sdkWorkflowClusters.length > 0 && (
          <WorkflowClusters clusters={sdkWorkflowClusters} />
        )}
        {isSdkConnected && sdkRetentionByAgent.length > 0 && (
          <RetentionByAgent rows={sdkRetentionByAgent} />
        )}
      </div>
    </div>
  );
}
