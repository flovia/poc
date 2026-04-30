// Phase 7-8 G2: SDK connected モードでのみ表示される agent 別 retention の追加ブロック.
// design.md §4.3 / requirements.md S4.

import type { SdkRetentionByAgentRow } from "@/lib/sdk-fixtures/types";

type Props = { rows: SdkRetentionByAgentRow[] };

export function RetentionByAgent({ rows }: Props) {
  return (
    <section
      data-testid="retention-by-agent"
      style={{
        marginTop: 24,
        padding: "20px 22px",
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 6,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        SDK preview · Retention by agent
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 14px" }}>
        D14 retention varies by agent type
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line-strong)", color: "var(--text-3)" }}>
            <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Agent
            </th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              D14 retained
            </th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Wallets
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agentType} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "10px" }}>{r.agentType}</td>
              <td style={{ padding: "10px", textAlign: "right" }} className="mono">
                {r.retainedPercentage}%
              </td>
              <td style={{ padding: "10px", textAlign: "right" }} className="mono">
                {r.walletCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
