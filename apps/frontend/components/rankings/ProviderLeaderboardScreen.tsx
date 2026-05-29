"use client";

import type { ProviderRankingResponse } from "contracts";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { describeChain, normalizeChain } from "@/lib/customers/chain";
import { formatAtomic, shortAddr } from "@/lib/format";

type ProviderLeaderboardScreenProps = {
  transactions: ProviderRankingResponse;
  settledAmount: ProviderRankingResponse;
};

type RankingMetric = "transactions" | "settledAmount";
type RankingScope = "provider" | "chain";
type SourceRow = ProviderRankingResponse["providers"][number];
type DisplayRow = {
  key: string;
  name: string;
  serviceLabel: string;
  networks: Array<{ key: string; raw: string }>;
  payToLabel: string;
  payToTitle?: string;
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  assets: string[];
};

const TABLE_LIMIT = 50;

export function ProviderLeaderboardScreen({
  transactions,
  settledAmount,
}: ProviderLeaderboardScreenProps) {
  const [metric, setMetric] = useState<RankingMetric>("transactions");
  const [scope, setScope] = useState<RankingScope>("provider");
  const activeRanking = metric === "transactions" ? transactions : settledAmount;
  const topTransactions = transactions.providers[0];
  const topSettled = settledAmount.providers[0];
  const rows = useMemo(
    () => buildDisplayRows(activeRanking.providers, scope, metric),
    [activeRanking.providers, scope, metric],
  );

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
            detail="Observed provider rows in the loaded snapshot"
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

        <RankingTable
          title={metric === "transactions" ? "Most payment transactions" : "Most settled amount"}
          ranking={activeRanking}
          rows={rows}
          metric={metric}
          onMetricChange={setMetric}
          scope={scope}
          onScopeChange={setScope}
        />
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
  rows,
  metric,
  onMetricChange,
  scope,
  onScopeChange,
}: {
  title: string;
  ranking: ProviderRankingResponse;
  rows: DisplayRow[];
  metric: "transactions" | "settledAmount";
  onMetricChange: (metric: RankingMetric) => void;
  scope: RankingScope;
  onScopeChange: (scope: RankingScope) => void;
}) {
  const visibleRows = rows.slice(0, TABLE_LIMIT);

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
        <div
          style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}
        >
          <div className="ranking-metric-toggle" role="group" aria-label="Ranking row scope">
            <SegmentedToggleButton active={scope === "provider"} onClick={() => onScopeChange("provider")}>
              Provider
            </SegmentedToggleButton>
            <SegmentedToggleButton active={scope === "chain"} onClick={() => onScopeChange("chain")}>
              Chain detail
            </SegmentedToggleButton>
          </div>
          <span className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>
            top {visibleRows.length.toLocaleString()} / {rows.length.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="table-scroll">
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>rank</th>
              <th>provider</th>
              <th>network</th>
              <th>{scope === "provider" ? "payment addresses" : "payment address"}</th>
              <th>
                <SortHeader active={metric === "transactions"} onClick={() => onMetricChange("transactions")}>
                  payment txns
                </SortHeader>
              </th>
              <th>
                <SortHeader active={metric === "settledAmount"} onClick={() => onMetricChange("settledAmount")}>
                  settled amount
                </SortHeader>
              </th>
              <th>unique payers</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${ranking.sort}:${scope}:${index}:${row.key}`}>
                <td className="mono">#{index + 1}</td>
                <td>
                  <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{row.name}</div>
                  <div style={{ marginTop: 3, color: "var(--text-3)", fontSize: 12 }}>
                    {row.serviceLabel}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {row.networks.map((network) => (
                      <NetworkBadge key={network.key} network={network.raw} />
                    ))}
                  </div>
                </td>
                <td className="mono" title={row.payToTitle ?? row.payToLabel}>
                  {row.payToLabel}
                </td>
                <td style={{ fontWeight: metric === "transactions" ? 800 : 600 }}>
                  {row.transactionCount.toLocaleString()}
                </td>
                <td style={{ fontWeight: metric === "settledAmount" ? 800 : 600 }}>
                  {formatAtomic(row.totalVolumeAtomic, 6, 2)} {row.assets.join(" / ")}
                </td>
                <td>{row.uniqueSenderCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildDisplayRows(rows: SourceRow[], scope: RankingScope, metric: RankingMetric): DisplayRow[] {
  const displayRows = scope === "provider" ? buildProviderRows(rows) : rows.map(toChainDisplayRow);
  return displayRows.sort((left, right) => compareDisplayRows(left, right, metric));
}

function toChainDisplayRow(row: SourceRow): DisplayRow {
  return {
    key: `${row.providerId}:${row.network}:${row.asset}:${row.payTo}`,
    name: row.name,
    serviceLabel: row.serviceName ?? row.serviceId ?? row.providerId,
    networks: [{ key: normalizeChain(row.network), raw: row.network }],
    payToLabel: shortAddr(row.payTo),
    payToTitle: row.payTo,
    transactionCount: row.transactionCount,
    uniqueSenderCount: row.uniqueSenderCount,
    totalVolumeAtomic: row.totalVolumeAtomic,
    assets: [displayAsset(row.asset)],
  };
}

function buildProviderRows(rows: SourceRow[]): DisplayRow[] {
  const byProvider = new Map<
    string,
    DisplayRow & {
      payToCount: number;
      payToValues: Set<string>;
      networkValues: Map<string, string>;
      assetValues: Set<string>;
    }
  >();

  for (const row of rows) {
    const providerKey = row.serviceId ?? row.serviceName ?? row.name;
    const existing = byProvider.get(providerKey) ?? {
      key: providerKey,
      name: row.serviceName ?? row.name,
      serviceLabel: row.serviceId ?? row.providerId,
      networks: [],
      payToLabel: "",
      transactionCount: 0,
      uniqueSenderCount: 0,
      totalVolumeAtomic: "0",
      assets: [],
      payToCount: 0,
      payToValues: new Set<string>(),
      networkValues: new Map<string, string>(),
      assetValues: new Set<string>(),
    };
    existing.transactionCount += row.transactionCount;
    existing.uniqueSenderCount += row.uniqueSenderCount;
    existing.totalVolumeAtomic = (BigInt(existing.totalVolumeAtomic) + BigInt(row.totalVolumeAtomic)).toString();
    existing.payToValues.add(row.payTo);
    existing.networkValues.set(normalizeChain(row.network), row.network);
    existing.assetValues.add(displayAsset(row.asset));
    existing.payToCount = existing.payToValues.size;
    byProvider.set(providerKey, existing);
  }

  return [...byProvider.values()].map((row) => ({
    ...row,
    networks: [...row.networkValues.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, raw]) => ({ key, raw })),
    assets: [...row.assetValues].sort(),
    payToLabel: `${row.payToCount.toLocaleString()} payTo${row.payToCount === 1 ? "" : "s"}`,
    payToTitle: [...row.payToValues].sort().join(", "),
  }));
}

function compareDisplayRows(left: DisplayRow, right: DisplayRow, metric: RankingMetric) {
  const amountDelta = BigInt(right.totalVolumeAtomic) - BigInt(left.totalVolumeAtomic);
  if (metric === "settledAmount" && amountDelta !== 0n) return amountDelta > 0n ? 1 : -1;
  const transactionDelta = right.transactionCount - left.transactionCount;
  if (metric === "transactions" && transactionDelta !== 0) return transactionDelta;
  if (transactionDelta !== 0) return transactionDelta;
  if (amountDelta !== 0n) return amountDelta > 0n ? 1 : -1;
  return left.name.localeCompare(right.name);
}

function displayAsset(asset: string) {
  if (/^(ERC20|SPL):/i.test(asset)) return "USDC";
  return asset;
}

function SortHeader({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`ranking-sort-button${active ? " active" : ""}`} onClick={onClick}>
      <span>{children}</span>
      <span aria-hidden>{active ? "↓" : "↕"}</span>
    </button>
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

function SegmentedToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "active" : undefined}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
