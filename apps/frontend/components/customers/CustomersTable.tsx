"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UpsellPill } from "./UpsellPill";
import { classNames, formatAtomic, formatGrowth, formatTimestamp } from "@/lib/format";
import type { CustomerListItemDto } from "@/lib/api/types";

type CustomersTableProps = {
  customers: CustomerListItemDto[];
  providerId: string;
};

export function CustomersTable({ customers, providerId }: CustomersTableProps) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="cust-row cust-head">
        <div>Wallet</div>
        <div>Spend (atomic)</div>
        <div>Observations</div>
        <div>Providers</div>
        <div>Activity growth</div>
        <div>Last seen</div>
        <div>Upsell</div>
      </div>
      {customers.length === 0 && (
        <div style={{ padding: 24, color: "var(--text-3)", fontSize: 13 }}>
          No payer wallets in BFF projection yet.
        </div>
      )}
      {customers.map((c, i) => (
        <Link
          key={c.address}
          href={`/providers/${providerId}/wallet/${encodeURIComponent(c.address)}`}
          className={classNames("cust-row")}
          style={{
            animation: `fade-up 240ms ${Math.min(i * 25, 200)}ms both ease-out`,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span className="row-indicator" />
            <span
              className="mono"
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={c.address}
            >
              {c.address}
            </span>
            {c.label && (
              <span className="chip" style={{ fontSize: 10.5, padding: "1px 6px" }}>
                {c.label}
              </span>
            )}
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--text-1)" }}>
            {formatAtomic(c.spendAtomic)}
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--text-2)" }}>
            {c.observationCount}
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--text-2)" }}>
            {c.providerCount}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 12.5,
              color:
                c.activityGrowth > 0
                  ? "var(--mesh-blue)"
                  : c.activityGrowth < 0
                  ? "var(--text-3)"
                  : "var(--text-2)",
              fontWeight: 600,
            }}
          >
            {formatGrowth(c.activityGrowth)}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>
            {formatTimestamp(c.lastSeenAt)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UpsellPill opportunity={c.upsellOpportunity} />
            <Icon.arrow width="14" height="14" style={{ color: "var(--text-3)" }} />
          </div>
        </Link>
      ))}
    </div>
  );
}
