"use client";

import { useMemo, useState } from "react";
import type { CustomerProviderUsageDto } from "@/lib/api/types";
import {
  type CoUsageEndpoint,
  type CoUsageHostGroup,
  groupProvidersByHost,
} from "@/lib/customers/co-usage";
import { classNames, formatAtomic, formatTimestamp, shortAddr } from "@/lib/format";

type Props = {
  address: string;
  providers: CustomerProviderUsageDto[];
};

export function CoUsageRanking({ address: _address, providers }: Props) {
  const groups = useMemo(() => groupProvidersByHost(providers), [providers]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (groups.length === 0) return null;

  const maxHostTx = Math.max(...groups.map((g) => g.transactionCount), 1);

  const toggle = (host: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(host)) next.delete(host);
      else next.add(host);
      return next;
    });
  };

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
          Co-usage map
        </div>
        <div className="display" style={{ fontSize: 15, color: "var(--text-2)" }}>
          Providers paid by this wallet, ranked by transaction count
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {groups.map((group) => (
          <HostRow
            key={group.host}
            group={group}
            maxHostTx={maxHostTx}
            isExpanded={expanded.has(group.host)}
            onToggle={() => toggle(group.host)}
          />
        ))}
      </ul>
    </div>
  );
}

function HostRow({
  group,
  maxHostTx,
  isExpanded,
  onToggle,
}: {
  group: CoUsageHostGroup;
  maxHostTx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const widthPct = (group.transactionCount / maxHostTx) * 100;
  const expandable = group.endpoints.length > 1;
  const maxEndpointTx = Math.max(...group.endpoints.map((e) => e.transactionCount), 1);

  const summary = (
    <HostSummary group={group} expandable={expandable} isExpanded={isExpanded} />
  );

  return (
    <li className="co-usage-host-row" style={{ borderBottom: "1px solid var(--line)" }}>
      {expandable ? (
        <button
          type="button"
          className="co-usage-host-toggle"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          {summary}
          <Bar widthPct={widthPct} tone="primary" />
        </button>
      ) : (
        <div className="co-usage-host-static">
          {summary}
          <Bar widthPct={widthPct} tone="primary" />
        </div>
      )}

      {isExpanded && expandable && (
        <ul className="co-usage-endpoint-list">
          {group.endpoints.map((endpoint) => (
            <EndpointRow
              key={endpoint.providerId}
              endpoint={endpoint}
              maxEndpointTx={maxEndpointTx}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function HostSummary({
  group,
  expandable,
  isExpanded,
}: {
  group: CoUsageHostGroup;
  expandable: boolean;
  isExpanded: boolean;
}) {
  return (
    <span className="summary">
      <span className="summary-left">
        <Chevron expanded={isExpanded} visible={expandable} />
        <span className="mono host-name" title={group.host}>
          {group.host}
        </span>
        {expandable && <span className="host-badge">{group.endpoints.length} endpoints</span>}
      </span>
      <span className="summary-right">
        <span>
          <strong>{group.transactionCount.toLocaleString()}</strong> tx
        </span>
        <span className="mono spend">{formatAtomic(group.spendAtomic)} USDC</span>
      </span>
    </span>
  );
}

function EndpointRow({
  endpoint,
  maxEndpointTx,
}: {
  endpoint: CoUsageEndpoint;
  maxEndpointTx: number;
}) {
  const widthPct = (endpoint.transactionCount / maxEndpointTx) * 100;
  return (
    <li className="co-usage-endpoint-row">
      <div className="summary">
        <span className="mono path" title={endpoint.name}>
          {endpoint.path}
        </span>
        <div className="summary-right">
          <span>
            <span className="count">{endpoint.transactionCount.toLocaleString()}</span> tx
          </span>
          <span className="mono">{formatAtomic(endpoint.spendAtomic)} USDC</span>
        </div>
      </div>
      <Bar widthPct={widthPct} tone="muted" />
      <div className="mono meta">
        <span>pay-to {shortAddr(endpoint.payToWallet)}</span>
        <span>last seen {formatTimestamp(endpoint.lastSeenAt)}</span>
      </div>
    </li>
  );
}

function Bar({ widthPct, tone }: { widthPct: number; tone: "primary" | "muted" }) {
  return (
    <span className={classNames("co-usage-bar", tone === "muted" && "muted")}>
      <span className="fill" style={{ width: `${widthPct}%` }} />
    </span>
  );
}

function Chevron({ expanded, visible }: { expanded: boolean; visible: boolean }) {
  return (
    <span
      aria-hidden
      className={classNames(
        "co-usage-chevron",
        !visible && "invisible",
        expanded && "expanded",
      )}
    >
      <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
        <path
          d="M4 2.5 L8 6 L4 9.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
