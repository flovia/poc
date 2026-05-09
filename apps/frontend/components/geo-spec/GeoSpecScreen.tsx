import { formatAtomic, shortAddr } from "@/lib/format";
import type { GeoSpec, MppRegistryEndpoint } from "@/lib/geo-spec/source";

type Props = {
  providerId: string;
  spec: GeoSpec | null;
};

export function GeoSpecScreen({ providerId, spec }: Props) {
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Generative Engine Optimization · Pay.sh provider spec
          </div>
          <h1
            className="display"
            style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
          >
            GEO{spec?.title ? ` · ${spec.title}` : ""}
          </h1>
          <p
            style={{
              maxWidth: 820,
              color: "var(--text-2)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: "8px 0 0",
            }}
          >
            Surface the Pay.sh-published description and use case so AI agents (and humans) can
            decide when to call this provider, then drill into the supported chains, assets, API
            paths, and posted prices.
          </p>
        </header>

        {!spec ? (
          <EmptyState providerId={providerId} />
        ) : (
          <>
            <ProviderDetailsSection spec={spec} />
            <MppOfficialRegistrySection spec={spec} />
            <PayShSection spec={spec} />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ providerId }: { providerId: string }) {
  return (
    <article
      className="card"
      style={{ padding: 22, background: "var(--surface-card)", color: "var(--text-2)" }}
    >
      <p style={{ margin: 0 }}>
        No GEO data available for <code className="mono">{providerId}</code>. This provider may not
        be sourced from the Pay.sh catalog, or its catalog row could not be matched.
      </p>
    </article>
  );
}

// Top-level section divider for catalog-source groupings (Pay.sh / MPP).
// Visually heavier than `SectionHeading` so the page reads as two parent
// groups with sub-content beneath each.
function CatalogSectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header
      style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "2px solid var(--text-1, #111)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-1)",
          background: "var(--surface-muted, #f0f1f4)",
          padding: "3px 10px",
          borderRadius: 999,
          marginBottom: 10,
        }}
      >
        {badge}
      </div>
      <h2 className="display" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
        {title}
      </h2>
      {subtitle ? (
        <p style={{ color: "var(--text-mute)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

function ProviderDetailsSection({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 6 }}>
      <SectionHeading eyebrow="Provider details" title="Catalog metadata" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <MetaTile label="Service URL" value={spec.serviceUrl} mono />
        <MetaTile label="Category" value={spec.category} />
        <MetaTile
          label="Endpoints"
          value={spec.endpointCount !== null ? String(spec.endpointCount) : null}
          mono
        />
        <MetaTile label="Metering" value={formatBoolean(spec.hasMetering)} />
        <MetaTile label="Free tier" value={formatBoolean(spec.hasFreeTier)} />
        <MetaTile label="Registry version" value={spec.registryVersion} mono />
        <MetaTile label="Provider sha" value={spec.providerSha} mono />
        <MetaTile
          label="Price range (USD)"
          value={
            spec.priceRangeUsd
              ? spec.priceRangeUsd.min === spec.priceRangeUsd.max
                ? `$${formatPrice(spec.priceRangeUsd.min)}`
                : `$${formatPrice(spec.priceRangeUsd.min)} – $${formatPrice(spec.priceRangeUsd.max)}`
              : null
          }
          mono
        />
      </div>
    </section>
  );
}

function PayShSection({ spec }: { spec: GeoSpec }) {
  const hasDescription = !!(spec.description || spec.useCase);
  const hasOffers = spec.offers.length > 0;
  const hasObservedEndpoints = spec.observedEndpoints.length > 0;
  // Hide the entire section when the active provider has no Pay.sh data at all.
  if (!hasDescription && !hasOffers && !hasObservedEndpoints) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <CatalogSectionHeader
        badge="Pay.sh"
        title="Pay.sh"
        subtitle="Description, supported chains, and observed API paths from the Pay.sh atlas."
      />
      {hasDescription ? (
        <div style={{ marginBottom: 24 }}>
          <SectionHeading eyebrow="Description" title="What this provider tells AI agents" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 14,
            }}
          >
            {spec.description ? <DefinitionCard label="Description" body={spec.description} /> : null}
            {spec.useCase ? <DefinitionCard label="Use case" body={spec.useCase} /> : null}
          </div>
        </div>
      ) : null}
      {hasOffers ? <PayShOffersTable spec={spec} /> : null}
      {hasObservedEndpoints ? <PayShObservedEndpointsTable spec={spec} /> : null}
    </section>
  );
}

function MppOfficialRegistrySection({ spec }: { spec: GeoSpec }) {
  const hasDescription = !!spec.mppDescription;
  const hasMppEndpoints = spec.mppEndpoints.length > 0;
  if (!hasDescription && !hasMppEndpoints) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <CatalogSectionHeader
        badge="MPP official"
        title="MPP Official Registry"
        subtitle="Description and per-path pricing as published in the MPP services registry (mpp.dev)."
      />
      {hasDescription ? (
        <div style={{ marginBottom: 24 }}>
          <SectionHeading eyebrow="Description" title="Registry description" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <DefinitionCard label="Description" body={spec.mppDescription} />
          </div>
        </div>
      ) : null}
      {hasMppEndpoints ? <MppEndpointsTable spec={spec} /> : null}
    </section>
  );
}

function PayShOffersTable({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="Supported chains, assets, and probe price"
        title="Pay.sh offers"
        note="Each row is one (chain × asset × payTo) combination Pay.sh published. Probe price is the per-call USD amount Pay.sh observed from a probe; individual endpoint prices are not separately published."
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={tableHeadRowStyle}>
                <th style={thStyle}>Protocol</th>
                <th style={thStyle}>Chain</th>
                <th style={thStyle}>Asset</th>
                <th style={thStyle}>payTo</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Probe price (USD)</th>
              </tr>
            </thead>
            <tbody>
              {spec.offers.map((o, i) => (
                <tr key={`${o.protocol}-${o.chain}-${o.asset}-${o.payTo}-${i}`} style={tableRowStyle}>
                  <td style={tdStyle}>{o.protocol}</td>
                  <td style={tdStyle}>{o.chain}</td>
                  <td style={tdStyle}>{o.asset}</td>
                  <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                    {shortAddr(o.payTo)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    ${formatPrice(o.probePriceUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
    </section>
  );
}

function PayShObservedEndpointsTable({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="API paths observed"
        title="Endpoints called against this provider"
        note="Per-endpoint USD price is not separately published in the Pay.sh catalog — only the per-offer probe price above. Observed spend is the total paid amount seen in the current fixture, formatted as USDC where applicable, not a posted price."
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 140 }} />
              <col />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead>
              <tr style={tableHeadRowStyle}>
                <th style={thStyle}>Resource (path)</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Chains</th>
                <th style={thStyle}>Assets</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Tx count</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Observed spend (USDC)</th>
              </tr>
            </thead>
            <tbody>
              {spec.observedEndpoints.map((e) => (
                <tr key={e.resource} style={tableRowStyle}>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      wordBreak: "break-all",
                    }}
                    title={e.resource}
                  >
                    {pathOf(e.resource)}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                    {e.method ?? "—"}
                  </td>
                  <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>{e.description ?? "—"}</td>
                  <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>
                    {e.networks.join(", ") || "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      overflowWrap: "anywhere",
                      wordBreak: "break-all",
                    }}
                    title={e.assets.join(", ")}
                  >
                    {e.assets.join(", ") || "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                    {e.transactionCount.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                    {formatAtomic(e.totalAmountAtomic)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {eyebrow}
      </div>
      <h2 className="display" style={{ fontSize: 20, fontWeight: 650, margin: "0 0 6px" }}>
        {title}
      </h2>
      {note ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function DefinitionCard({ label, body }: { label: string; body: string | null }) {
  return (
    <article className="card" style={{ padding: 18, background: "var(--surface-card)" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: body ? "var(--text-1)" : "var(--text-mute)",
        }}
      >
        {body || "—"}
      </p>
    </article>
  );
}

function MetaTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "12px 14px", background: "#fff" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className={mono ? "mono" : undefined}
        style={{
          fontSize: 14,
          fontWeight: 600,
          wordBreak: "break-all",
          color: value ? "var(--text-1)" : "var(--text-mute)",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function pathOf(resource: string): string {
  try {
    const u = new URL(resource);
    return u.pathname + (u.search || "");
  } catch {
    return resource;
  }
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 0.01) return value.toFixed(4);
  if (value < 1) return value.toFixed(3);
  if (value < 100) return value.toFixed(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatBoolean(value: boolean | null): string | null {
  if (value === null) return null;
  return value ? "Yes" : "No";
}

const tableHeadRowStyle: React.CSSProperties = {
  background: "var(--surface-muted, #f6f7f9)",
  borderBottom: "1px solid var(--border-subtle, #e5e7eb)",
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-subtle, #eef0f3)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-mute)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-1)",
};

// Render the registry-declared paid endpoints exposed by MPP services. Mirrors
// the layout of `PayShObservedEndpointsTable` so the user can compare
// path-by-path price tables across both catalog sources.
function MppEndpointsTable({ spec }: { spec: GeoSpec }) {
  const sessionPresent = spec.mppEndpoints.some((e) => e.intent === "session");
  const dynamicPresent = spec.mppEndpoints.some((e) => e.dynamic === true);
  const noteParts: string[] = [
    "Prices are published in the MPP services registry. `charge` = per-call fixed price.",
  ];
  if (sessionPresent) {
    noteParts.push(
      "`session` = per-session billing; the listed unit (e.g. per request) is the billable increment when known.",
    );
  }
  if (dynamicPresent) {
    noteParts.push(
      "`dynamic` rows quote no fixed price — the runtime price depends on input/output (e.g. tokens, MB).",
    );
  }

  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="API paths · MPP registry"
        title="Endpoints declared by the MPP services registry"
        note={noteParts.join(" ")}
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Resource (path)</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Intent</th>
              <th style={thStyle}>Unit</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {spec.mppEndpoints.map((e, i) => (
              <tr key={`${e.method ?? "GET"}-${e.resource}-${i}`} style={tableRowStyle}>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                  title={e.resource}
                >
                  {pathOf(e.resource)}
                </td>
                <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                  {e.method ?? "—"}
                </td>
                <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>{e.description ?? "—"}</td>
                <td style={tdStyle}>{e.intent ?? "—"}</td>
                <td style={tdStyle}>{formatUnit(e)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                  {formatRegistryPrice(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function formatUnit(e: MppRegistryEndpoint): string {
  if (e.intent === "session") {
    return e.unitType ? `per ${e.unitType}` : "per session";
  }
  if (e.intent === "charge") {
    return e.unitType ? `per ${e.unitType}` : "per call";
  }
  return e.unitType ? `per ${e.unitType}` : "—";
}

function formatRegistryPrice(e: MppRegistryEndpoint): string {
  if (e.dynamic) return "dynamic";
  if (!e.amountAtomic) return "—";
  if (e.decimals === undefined) return `${e.amountAtomic} atomic`;
  // Use parseFloat after manual scaling so trailing zeros collapse cleanly.
  const denom = 10 ** e.decimals;
  const value = Number(e.amountAtomic) / denom;
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) {
    // For sub-cent prices show 4 decimals so $0.0001 is readable.
    return `$${value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return `$${value.toFixed(2)}`;
}
