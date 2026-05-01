"use client";

import { useMemo, useState } from "react";
import { useActiveProvider } from "@/app/providers";
import type { WalletUsageGraphDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type {
  SdkRetentionByAgentRow,
  SdkWorkflowCluster,
} from "@/lib/sdk-fixtures/types";
import { shortAddr } from "@/lib/format";
import { BubbleChart, type ProviderBubble } from "./BubbleChart";
import { WorkflowClusters } from "./WorkflowClusters";
import { RetentionByAgent } from "./RetentionByAgent";

type PatternsScreenProps = {
  graph: WalletUsageGraphDto;
  providerId: string;
  dataMode: DashboardMode;
  sdkWorkflowClusters: SdkWorkflowCluster[];
  sdkRetentionByAgent: SdkRetentionByAgentRow[];
};

// claimIds[0] には endpoint URL や provider slug が入りうる。バブル直上に
// そのまま描画すると 60+ 文字の URL が隣のバブルラベルと重なって読めなくなるので、
// host + 末尾 path セグメントだけを抽出して短く整形する。
function shortenLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const tail = segments.at(-1);
    const host = url.host.replace(/^www\./, "");
    const compact = tail ? `${host}/${tail}` : host;
    return compact.length > 28 ? `${compact.slice(0, 27)}…` : compact;
  } catch {
    return trimmed.length > 28 ? `${trimmed.slice(0, 27)}…` : trimmed;
  }
}

function buildBubbles(graph: WalletUsageGraphDto): ProviderBubble[] {
  const providerWallets = graph.providerWallets;
  if (providerWallets.length === 0) return [];

  const stats = providerWallets.map((entry) => {
    const wallets = entry.payerWallets.length;
    const observations = entry.payerWallets.reduce(
      (acc, p) => acc + p.observations.length,
      0,
    );
    const obsPerPayer = wallets === 0 ? 0 : observations / wallets;
    return { entry, wallets, observations, obsPerPayer };
  });

  const maxWallets = Math.max(...stats.map((s) => s.wallets), 1);
  const maxObsPerPayer = Math.max(...stats.map((s) => s.obsPerPayer), 1);

  return stats.map(({ entry, wallets, observations, obsPerPayer }) => {
    const xRel = wallets / maxWallets;
    const yRel = obsPerPayer / maxObsPerPayer;
    const accent: ProviderBubble["accent"] =
      xRel >= 0.5 && yRel >= 0.6
        ? "teal"
        : xRel >= 0.3 || yRel >= 0.6
          ? "blue"
          : "slate";
    const rawLabel = entry.claimIds[0] ?? shortAddr(entry.payTo);
    return {
      id: entry.payTo,
      label: shortenLabel(rawLabel),
      fullLabel: rawLabel,
      wallets,
      observations,
      obsPerPayer,
      r: 8 + Math.round(xRel * 18),
      accent,
    };
  });
}

export function PatternsScreen({
  graph,
  providerId,
  dataMode,
  sdkWorkflowClusters,
  sdkRetentionByAgent,
}: PatternsScreenProps) {
  const { active, hydrated } = useActiveProvider(providerId);
  const selfProviderName = !hydrated ? "…" : active?.name ?? providerId;
  const [hover, setHover] = useState<string | null>(null);

  const bubbles = useMemo(
    () => buildBubbles(graph),
    [graph],
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
            payer wallets (log scale, long-tail friendly); Y-axis is observations per payer (a
            repeat-usage proxy: 1.0 = each payer hit the endpoint once, &gt;1.0 = repeat use).
            Hover a bubble to see its endpoint and counts; click to drill into matching customers.
            Identity-bearing fields are excluded:{" "}
            <span className="mono" style={{ fontSize: 13 }}>
              {graph.identityFieldsExcluded.join(", ") || "—"}
            </span>
            .
          </p>
        </div>

        <BubbleChart bubbles={bubbles} hover={hover} setHover={setHover} providerId={providerId} />

        <p style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 16, maxWidth: 720, lineHeight: 1.55 }}>
          Note: Observations per payer = total observations on this provider ÷ unique payer
          wallets. The current BFF projection collapses each payer×endpoint pair into one
          observation row, so this is a coarse repeat-usage proxy rather than a cohort retention
          metric — once the BFF exposes per-observation timestamps, we will switch this back to a
          14-day retention curve.
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
