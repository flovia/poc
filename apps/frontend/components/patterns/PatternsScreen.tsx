"use client";

import { useMemo, useState } from "react";
import { useActiveProvider } from "@/app/providers";
import type { WalletUsageGraphDto } from "@/lib/api/types";
import { shortAddr } from "@/lib/format";
import { BubbleChart, type ProviderBubble } from "./BubbleChart";

type PatternsScreenProps = {
  graph: WalletUsageGraphDto;
  providerId: string;
};

function buildBubbles(graph: WalletUsageGraphDto): ProviderBubble[] {
  const providers = graph.providerWallets;
  if (providers.length === 0) return [];

  // x = co-usage (number of payer wallets), y = average observations per payer.
  const stats = providers.map((entry) => {
    const wallets = entry.payerWallets.length;
    const observations = entry.payerWallets.reduce((acc, p) => acc + p.observations.length, 0);
    const avgObsPerWallet = wallets === 0 ? 0 : observations / wallets;
    return { entry, wallets, observations, avgObsPerWallet };
  });

  const maxWallets = Math.max(...stats.map((s) => s.wallets), 1);
  const maxAvg = Math.max(...stats.map((s) => s.avgObsPerWallet), 1);

  return stats.map(({ entry, wallets, avgObsPerWallet }) => {
    const x = wallets / maxWallets;
    const y = avgObsPerWallet / maxAvg;
    const accent: ProviderBubble["accent"] = x >= 0.66 && y >= 0.66 ? "teal" : x >= 0.4 ? "blue" : "slate";
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

export function PatternsScreen({ graph, providerId }: PatternsScreenProps) {
  const { active, hydrated } = useActiveProvider(providerId);
  const selfProviderName = !hydrated ? "…" : active?.name ?? providerId;
  const [hover, setHover] = useState<string | null>(null);

  const bubbles = useMemo(() => buildBubbles(graph), [graph]);

  return (
    <div style={{ position: "relative", background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ position: "relative", padding: "32px 40px 80px", maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--teal)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)" }}></span>
            {selfProviderName} · BFF Wallet-Usage Graph
          </div>
          <h1
            className="display"
            style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.015em", color: "var(--text-1)" }}
          >
            Ecosystem Co-usage Patterns
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 14.5, margin: "12px 0 0", maxWidth: 780, lineHeight: 1.6 }}>
            Explore how your users interact with other providers. Each bubble represents an external recipient (provider) wallet discovered by the BFF. The X-axis plots the number of unique payer wallets you share, and the Y-axis maps the average interaction frequency per payer. Identity-bearing fields have been algorithmically excluded from this graph:{" "}
            <span className="mono" style={{ fontSize: 12, background: "var(--bg-card)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--line)" }}>
              {graph.identityFieldsExcluded.join(", ") || "—"}
            </span>
            .
          </p>
        </div>

        <BubbleChart bubbles={bubbles} hover={hover} setHover={setHover} providerId={providerId} />
      </div>
    </div>
  );
}
