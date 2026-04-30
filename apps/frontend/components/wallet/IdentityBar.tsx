import { FreeTierBar } from "@/components/ui/FreeTierBar";
import { Icon } from "@/components/ui/Icon";
import type { CustomerIdentityDto, CustomerMetricsDto } from "@/lib/api/types";
import { formatAtomic, formatGrowth, formatRatioPct } from "@/lib/format";
import { KPI } from "./KPI";

type IdentityBarProps = {
  customer: CustomerIdentityDto;
  metrics: CustomerMetricsDto;
};

export function IdentityBar({ customer, metrics }: IdentityBarProps) {
  const freeTierPct = Math.round(metrics.freeTierProgress * 100);
  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        background: "#FFFFFF",
        borderColor: "var(--line)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, auto) 1fr auto",
          gap: 24,
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left: Address + identity caveat */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--mesh-blue)",
                boxShadow: "none",
              }}
            />
            <span
              className="mono display"
              style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.01em" }}
            >
              {customer.address}
            </span>
            <button
              className="btn ghost"
              style={{ padding: "4px 6px", color: "var(--text-3)" }}
              title="Copy"
            >
              <Icon.copy width="13" height="13" />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12.5,
              color: "var(--text-2)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
              <Icon.bolt width="12" height="12" style={{ color: "var(--teal)" }} />
              {customer.label ?? "Payer wallet"}
            </span>
            <span style={{ color: "var(--text-mute)" }}>|</span>
            <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ textTransform: "uppercase", fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", color: "var(--text-mute)" }}>Provenance</span>
              Role: <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{customer.role}</span> · Basis: <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{customer.identityBasis}</span>
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "#F8FAFC",
              borderRadius: 6,
              border: "1px dashed var(--line-strong)",
              fontSize: 11,
              color: "var(--text-2)",
              maxWidth: 460,
              lineHeight: 1.5,
            }}
          >
            {customer.caveat}
          </div>
        </div>

        {/* Center: KPIs derived from BFF metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          <KPI
            label="Total spend"
            big
            value={formatAtomic(metrics.spendAtomic)}
            sub="atomic units (USDC*)"
            hue="default"
          />
          <KPI
            label="Activity growth"
            big
            value={formatGrowth(metrics.activityGrowth)}
            sub="later vs. earlier observations"
            hue="blue"
          />
          <KPI
            label="Free tier"
            value={
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: freeTierPct >= 80 ? "var(--warn)" : "var(--text-1)",
                  }}
                >
                  {freeTierPct}%
                </span>
                <FreeTierBar pct={freeTierPct} height={6} />
              </div>
            }
            sub="freeTierProgress heuristic"
            hue={freeTierPct >= 80 ? "warn" : "default"}
          />
        </div>

        {/* Right: entry-point ratio */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 4,
            background: "#F8FAFC",
            border: "1px solid var(--line-strong)",
            boxShadow: "none",
            minWidth: 220,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--teal)",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon.bolt width="11" height="11" /> Entry-point ratio
          </div>
          <div className="display" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
            <span className="mono" style={{ color: "var(--mesh-blue)" }}>
              {formatRatioPct(metrics.entryPointRatio, 0)}
            </span>{" "}
            of observations matched an attribution candidate
          </div>
        </div>
      </div>
    </div>
  );
}
