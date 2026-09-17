import { describeChain, normalizeChain } from "@/lib/customers/chain";
import { formatAtomic, shortAddr } from "@/lib/format";
import type { ProviderRanking } from "@/lib/provider-ranking";

type ProviderLeaderboardScreenProps = {
  transactions: ProviderRanking;
  settledAmount: ProviderRanking;
};

type RankingRow = ProviderRanking["providers"][number];

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
            detail="Provider rows in the loaded snapshot"
          />
          <SummaryCard
            label="Top by payment txns"
            value={topTransactions?.name ?? "No activity"}
            detail={
              topTransactions
                ? `${topTransactions.transactionCount.toLocaleString()} payments`
                : "No ranked row"
            }
          />
          <SummaryCard
            label="Top by settled amount"
            value={topSettled?.name ?? "No activity"}
            detail={
              topSettled
                ? `${formatAtomic(topSettled.totalVolumeAtomic, 6, 2)} ${topSettled.asset}`
                : "No ranked row"
            }
          />
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          <RankingTable title="Most payment transactions" ranking={transactions} />
          <RankingTable title="Most settled amount" ranking={settledAmount} />
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

function RankingTable({ title, ranking }: { title: string; ranking: ProviderRanking }) {
  const visibleRows = ranking.providers.slice(0, 50);

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
          alignItems: "center",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {ranking.population.replace("_", " ")}
          </div>
          <h2 style={{ margin: 0, fontSize: 19 }}>{title}</h2>
        </div>
        <span className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>
          top {visibleRows.length.toLocaleString()} / {ranking.totalProviderCount.toLocaleString()}
        </span>
      </div>
      <div className="table-scroll">
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>rank</th>
              <th>provider</th>
              <th>network</th>
              <th>payment address</th>
              <th>payment txns</th>
              <th>settled amount</th>
              <th>unique payers</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <ProviderRankingTableRow key={`${ranking.sort}:${row.rank}:${row.providerId}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProviderRankingTableRow({ row }: { row: RankingRow }) {
  return (
    <tr>
      <td className="mono">#{row.rank}</td>
      <td>
        <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{row.name}</div>
        <div style={{ marginTop: 3, color: "var(--text-3)", fontSize: 12 }}>
          {row.serviceName ?? row.serviceId ?? row.providerId}
        </div>
      </td>
      <td>
        <NetworkBadge network={row.network} />
      </td>
      <td className="mono" title={row.payTo}>
        {shortAddr(row.payTo)}
      </td>
      <td>{row.transactionCount.toLocaleString()}</td>
      <td>
        {formatAtomic(row.totalVolumeAtomic, 6, 2)} {displayAsset(row.asset)}
      </td>
      <td>{row.uniqueSenderCount.toLocaleString()}</td>
    </tr>
  );
}

function NetworkBadge({ network }: { network: string }) {
  const chain = describeChain(normalizeChain(network));
  return (
    <span
      title={network}
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: chain.color,
        border: `1px solid ${chain.color}`,
        borderRadius: 999,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {chain.short}
    </span>
  );
}

function displayAsset(asset: string) {
  if (/^(ERC20|SPL):/i.test(asset)) return "USDC";
  return asset;
}
