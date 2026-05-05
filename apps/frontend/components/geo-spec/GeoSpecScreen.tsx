import { formatAtomic, shortAddr } from "@/lib/format";
import type { GeoSpec } from "@/lib/geo-spec/source";

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
            <GeoGroup spec={spec} />
            <ChainsAssetsSection spec={spec} />
            <EndpointsSection spec={spec} />
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
        be sourced from the Pay.sh atlas, or its catalog row could not be matched.
      </p>
    </article>
  );
}

function GeoGroup({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 6 }}>
      <SectionHeading
        eyebrow="GEO"
        title="What this provider tells AI agents"
        note={
          spec.atlasMissing
            ? "No atlas entry was matched, so description/use case below may be empty."
            : undefined
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 14,
        }}
      >
        <DefinitionCard label="Description" body={spec.description} />
        <DefinitionCard label="Use case" body={spec.useCase} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <MetaTile
          label="Service URL"
          value={spec.serviceUrl}
          mono
        />
        <MetaTile label="Category" value={spec.category} />
        <MetaTile
          label="Endpoints (atlas)"
          value={spec.endpointCount !== null ? String(spec.endpointCount) : null}
          mono
        />
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

function ChainsAssetsSection({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 30 }}>
      <SectionHeading
        eyebrow="Supported chains, assets, and probe price"
        title="Pay.sh offers"
        note={
          spec.offers.length === 0
            ? "No payment offers found in the atlas for this provider."
            : "Each row is one (chain × asset × payTo) combination Pay.sh published. Probe price is the per-call USD amount Pay.sh observed from a probe; individual endpoint prices are not separately published."
        }
      />
      {spec.offers.length === 0 ? null : (
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
      )}
    </section>
  );
}

function EndpointsSection({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 30 }}>
      <SectionHeading
        eyebrow="API paths observed"
        title="Endpoints called against this provider"
        note={
          spec.observedEndpoints.length === 0
            ? "No observed endpoint calls in the current fixture for this provider's serviceId."
            : "Per-endpoint USD price is not separately published in the Pay.sh atlas — only the per-offer probe price above. Totals shown here are the sum of observed amounts in the fixture (atomic, asset-native), not a posted price."
        }
      />
      {spec.observedEndpoints.length === 0 ? null : (
        <article className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: 140 }} />
              <col />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead>
              <tr style={tableHeadRowStyle}>
                <th style={thStyle}>Resource (path)</th>
                <th style={thStyle}>Chains</th>
                <th style={thStyle}>Assets</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Tx count</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Observed total</th>
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
      )}
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
