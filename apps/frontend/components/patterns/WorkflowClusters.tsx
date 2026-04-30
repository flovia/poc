// Phase 7-8 G1: SDK connected モードでのみ表示される workflow cluster の追加ブロック.
// design.md §4.3 / requirements.md S4.

import type { SdkWorkflowCluster } from "@/lib/sdk-fixtures/types";

type Props = { clusters: SdkWorkflowCluster[] };

export function WorkflowClusters({ clusters }: Props) {
  return (
    <section
      data-testid="workflow-clusters"
      style={{
        marginTop: 32,
        padding: "20px 22px",
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 6,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        SDK preview · Workflow clusters
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 14px" }}>
        Three patterns explain most observed wallets
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {clusters.map((c) => (
          <li
            key={c.clusterId}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "10px 12px",
              background: "var(--bg-elev-2)",
              borderRadius: 4,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {c.label}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 13,
                  color: "var(--text-3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.sequence.join(" → ")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 120,
                  height: 6,
                  background: "var(--line)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${c.walletPercentage}%`,
                    height: "100%",
                    background: "var(--mesh-blue)",
                  }}
                />
              </div>
              <span
                className="mono"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", width: 36, textAlign: "right" }}
              >
                {c.walletPercentage}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
