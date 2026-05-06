"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProviders } from "@/app/providers";
import { ProviderAvatar } from "@/components/shell/ProviderAvatar";
import { isDemoProvider, routeIdForProvider } from "@/lib/providers";
import { describeChain, type CustomerChain } from "@/lib/customers/chain";
import { inferBrandDisplayName, inferBrandDomain } from "@/lib/pay-sh/brand";
import { resolvePaySkill, usePaySkills } from "@/lib/pay-sh/skills";
import {
  DEFAULT_PROVIDER_FILTER,
  chainsOfProvider,
  collectAvailableChains,
  filterProviders,
  protocolsOfProvider,
  visibleProviderChains,
  type ProviderFilterState,
  type ProviderProtocolFilter,
  type ProviderSourceFilter,
} from "@/lib/providers/filter";

const SOURCE_OPTIONS: ReadonlyArray<{ value: ProviderSourceFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pay-sh", label: "Pay.sh" },
];

const PROTOCOL_OPTIONS: ReadonlyArray<{ value: ProviderProtocolFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "MPP", label: "MPP" },
  { value: "x402", label: "x402" },
];


export function ProvidersPicker() {
  const { stored, userProviders, hydrated, demoOpted } = useProviders();
  const skills = usePaySkills();
  const userIds = useMemo(
    () => new Set(userProviders.map((p) => p.providerId)),
    [userProviders],
  );
  const demoIds = useMemo(
    () =>
      new Set(stored.filter((p) => isDemoProvider(p, demoOpted, userIds)).map((p) => p.providerId)),
    [stored, demoOpted, userIds],
  );
  const [filter, setFilter] = useState<ProviderFilterState>(DEFAULT_PROVIDER_FILTER);
  const availableChains = useMemo(() => collectAvailableChains(stored), [stored]);
  const filtered = useMemo(
    () => filterProviders(stored, filter, { demoOpted, userIds, demoIds }),
    [stored, filter, demoOpted, userIds, demoIds],
  );

  const toggleChain = (c: CustomerChain) => {
    setFilter((prev) =>
      prev.chains.includes(c)
        ? { ...prev, chains: prev.chains.filter((x) => x !== c) }
        : { ...prev, chains: [...prev.chains, c] },
    );
  };
  const clearFilters = () => setFilter(DEFAULT_PROVIDER_FILTER);
  const isFiltering =
    filter.query.trim() !== ""
    || filter.source !== "all"
    || filter.protocol !== "all"
    || filter.chains.length > 0;

  if (!hydrated) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="sk" style={{ height: 124, borderRadius: "var(--radius)" }} />
        ))}
      </div>
    );
  }

  if (stored.length === 0) {
    return (
      <article
        className="card"
        style={{
          padding: 28,
          textAlign: "center",
          color: "var(--text-2)",
          background: "var(--surface-card)",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          No API providers yet. Add one from{" "}
          <Link href="/setup" style={{ color: "var(--mesh-blue)", fontWeight: 600 }}>
            Setup
          </Link>
          .
        </p>
      </article>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ProvidersToolbar
        filter={filter}
        onChange={setFilter}
        availableChains={availableChains}
        toggleChain={toggleChain}
        total={stored.length}
        filteredCount={filtered.length}
        isFiltering={isFiltering}
        onClear={clearFilters}
      />
      {filtered.length === 0 ? (
        <article
          className="card"
          style={{
            padding: 28,
            textAlign: "center",
            color: "var(--text-2)",
            background: "var(--surface-card)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            No providers match the current filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--mesh-blue)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </article>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => {
        const isDemo = isDemoProvider(p, demoOpted, userIds);
        // Aggregated catalog sources from the brand-key dedup (e.g.
        // ["pay_sh_curated", "mpp_registry"] for AgentMail). Falls back to the
        // single `catalogSource` when no aggregation happened.
        const allCatalogSources = p.catalogSources ?? (p.catalogSource ? [p.catalogSource] : []);
        const isPaySh = allCatalogSources.includes("pay_sh_curated");
        const isMpp = allCatalogSources.includes("mpp_registry");
        const chains = visibleProviderChains(chainsOfProvider(p));
        const protocols = protocolsOfProvider(p);
        const skill = resolvePaySkill(skills, p.serviceId);
        const displayName = skill?.title || inferBrandDisplayName({ fqn: p.serviceId }) || p.name;
        const brand = inferBrandDomain({
          fqn: skill?.fqn ?? p.serviceId,
          serviceUrl: skill?.service_url ?? p.serviceUrl,
        });
        return (
          <Link
            key={p.providerId}
            href={`/providers/${routeIdForProvider(p)}/customers`}
            className="card"
            style={{
              padding: 18,
              background: "var(--surface-card)",
              color: "inherit",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
              <ProviderAvatar
                name={displayName}
                serviceId={p.serviceId}
                brandDomain={brand.domain}
                brandIconUrl={brand.iconUrl}
                size={40}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-1)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={displayName}
                >
                  {displayName}
                </div>
                {p.serviceId ? (
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--text-mute)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 2,
                    }}
                    title={p.serviceId}
                  >
                    {p.serviceId}
                  </div>
                ) : null}
              </div>
              {(isDemo || isPaySh || isMpp || p.source !== "generated") && (
                <div
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "flex-end",
                  }}
                >
                  {isDemo ? (
                    <CardBadge tone="muted">demo</CardBadge>
                  ) : (
                    <>
                      {isMpp ? <CardBadge tone="muted">MPP official</CardBadge> : null}
                      {isPaySh ? <CardBadge tone="muted">Pay.sh</CardBadge> : null}
                      {!isPaySh && !isMpp ? <CardBadge tone="blue">real</CardBadge> : null}
                    </>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingTop: 10,
                borderTop: "1px solid var(--border-subtle, #eef0f3)",
                marginTop: "auto",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {protocols.length > 0 ? (
                  protocols.map((proto) => (
                    <span
                      key={proto}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "#fff",
                        background:
                          proto === "x402" ? "var(--mesh-blue)" : "var(--sdk-purple)",
                        borderRadius: 999,
                        padding: "1px 7px",
                      }}
                    >
                      {proto}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-mute)" }}>—</span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {chains.length > 0 ? (
                  chains.map((c) => {
                    const v = describeChain(c);
                    return (
                      <span
                        key={c}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: v.color,
                          border: `1px solid ${v.color}`,
                          borderRadius: 999,
                          padding: "1px 6px",
                        }}
                      >
                        {v.short}
                      </span>
                    );
                  })
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-mute)" }}>—</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
        </div>
      )}
    </div>
  );
}

type ProvidersToolbarProps = {
  filter: ProviderFilterState;
  onChange: (next: ProviderFilterState) => void;
  availableChains: CustomerChain[];
  toggleChain: (c: CustomerChain) => void;
  total: number;
  filteredCount: number;
  isFiltering: boolean;
  onClear: () => void;
};

function ProvidersToolbar({
  filter,
  onChange,
  availableChains,
  toggleChain,
  total,
  filteredCount,
  isFiltering,
  onClear,
}: ProvidersToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 14,
        background: "var(--surface-card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          placeholder="Search by name or service id…"
          aria-label="Search providers"
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            padding: "8px 12px",
            fontSize: 14,
            color: "var(--text-1)",
            background: "var(--bg-shell)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            outline: "none",
          }}
        />
        <div
          role="group"
          aria-label="Filter by source"
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 6,
            overflow: "hidden",
            background: "var(--bg-shell)",
          }}
        >
          {SOURCE_OPTIONS.map((opt) => {
            const active = filter.source === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filter, source: opt.value })}
                aria-pressed={active}
                style={{
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  background: active ? "var(--mesh-blue)" : "transparent",
                  color: active ? "#fff" : "var(--text-2)",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div
          role="group"
          aria-label="Filter by protocol"
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 6,
            overflow: "hidden",
            background: "var(--bg-shell)",
          }}
        >
          {PROTOCOL_OPTIONS.map((opt) => {
            const active = filter.protocol === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filter, protocol: opt.value })}
                aria-pressed={active}
                style={{
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  background: active ? "var(--mesh-blue)" : "transparent",
                  color: active ? "#fff" : "var(--text-2)",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--text-mute)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 150,
            justifyContent: "flex-end",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            Showing <strong style={{ color: "var(--text-1)" }}>{filteredCount}</strong> of {total}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={!isFiltering}
            aria-hidden={!isFiltering}
            tabIndex={isFiltering ? 0 : -1}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--mesh-blue)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 4,
              cursor: isFiltering ? "pointer" : "default",
              visibility: isFiltering ? "visible" : "hidden",
            }}
          >
            Clear
          </button>
        </div>
      </div>
      {availableChains.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginRight: 4,
            }}
          >
            Chain
          </span>
          {availableChains.map((c) => {
            const v = describeChain(c);
            const active = filter.chains.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChain(c)}
                aria-pressed={active}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: active ? "#fff" : v.color,
                  background: active ? v.color : "transparent",
                  border: `1px solid ${v.color}`,
                  borderRadius: 999,
                  padding: "2px 9px",
                  cursor: "pointer",
                }}
              >
                {v.short}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardBadge({ children, tone }: { children: React.ReactNode; tone: "muted" | "blue" }) {
  const styles =
    tone === "blue"
      ? {
          background: "rgba(45,127,249,0.14)",
          color: "var(--mesh-blue)",
        }
      : {
          background: "rgba(148,163,184,0.18)",
          color: "var(--text-3)",
        };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 3,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        ...styles,
      }}
    >
      {children}
    </span>
  );
}
