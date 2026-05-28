import type { ProviderRankingResponse } from "contracts";
import { formatAtomic, shortAddr } from "@/lib/format";

type ProviderLeaderboardScreenProps = {
  transactions: ProviderRankingResponse;
  settledAmount: ProviderRankingResponse;
};

export function ProviderLeaderboardScreen({
  transactions,
  settledAmount,
}: ProviderLeaderboardScreenProps) {
  const topTransactions = transactions.providers[0];
  const topSettled = settledAmount.providers[0];

  return (
    <div className="scroll">
      <div className="page-pad page-pad--wide">
        <header style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Rankings
          </div>
          <h1 className="display" style={{ margin: 0, fontSize: 34, letterSpacing: "-0.03em" }}>
            Observed Provider Leaderboard
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 820,
              color: "var(--text-2)",
              lineHeight: 1.6,
              fontSize: 15,
            }}
          >
            Rankings are derived from the currently loaded observed-provider snapshot. They do not
            claim complete coverage of every paid API provider across every rail.
          </p>
        </header>

        <section
          className="ranking-summary-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            label="Observed providers"
            value={String(transactions.totalProviderCount)}
            detail="Provider/payTo rows in the loaded snapshot"
          />
          <SummaryCard
            label="Top by payment txns"
            value={topTransactions?.name ?? "No activity"}
            detail={topTransactions ? `${topTransactions.transactionCount.toLocaleString()} payments` : "No ranked row"}
          />
          <SummaryCard
            label="Top by settled amount"
            value={topSettled?.name ?? "No activity"}
            detail={topSettled ? `${formatAtomic(topSettled.totalVolumeAtomic, 6, 2)} ${topSettled.asset}` : "No ranked row"}
          />
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <RankingTable title="Most payment transactions" ranking={transactions} metric="transactions" />
          <RankingTable title="Most settled amount" ranking={settledAmount} metric="settledAmount" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="card" style={{ padding: 18, minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-1)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={value}
      >
        {value}
      </div>
      <p style={{ margin: "8px 0 0", color: "var(--text-3)", fontSize: 12, lineHeight: 1.5 }}>
        {detail}
      </p>
    </article>
  );
}

function RankingTable({
  title,
  ranking,
  metric,
}: {
  title: string;
  ranking: ProviderRankingResponse;
  metric: "transactions" | "settledAmount";
}) {
  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "18px 20px 14px",
          background: "var(--surface-subtle)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "baseline",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {ranking.population.replace("_", " ")}
          </div>
          <h2 style={{ margin: 0, fontSize: 19 }}>{title}</h2>
        </div>
        <span className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>
          top {ranking.providerCount.toLocaleString()} / {ranking.totalProviderCount.toLocaleString()}
        </span>
      </div>
      <div className="table-scroll">
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>rank</th>
              <th>provider</th>
              <th>network</th>
              <th>payTo</th>
              <th>payment txns</th>
              <th>settled amount</th>
              <th>unique payers</th>
            </tr>
          </thead>
          <tbody>
            {ranking.providers.map((provider) => (
              <tr key={`${ranking.sort}:${provider.providerId}`}>
                <td className="mono">#{provider.rank}</td>
                <td>
                  <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{provider.name}</div>
                  <div style={{ marginTop: 3, color: "var(--text-3)", fontSize: 12 }}>
                    {provider.serviceName ?? provider.serviceId ?? provider.providerId}
                  </div>
                </td>
                <td>
                  <span className="chip mute">{provider.network}</span>
                </td>
                <td className="mono" title={provider.payTo}>
                  {shortAddr(provider.payTo)}
                </td>
                <td style={{ fontWeight: metric === "transactions" ? 800 : 600 }}>
                  {provider.transactionCount.toLocaleString()}
                </td>
                <td style={{ fontWeight: metric === "settledAmount" ? 800 : 600 }}>
                  {formatAtomic(provider.totalVolumeAtomic, 6, 2)} {provider.asset}
                </td>
                <td>{provider.uniqueSenderCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
