import type {
  MachinePaymentRail,
  RouteAnalyticsSankeyResponse,
  RouteAnalyticsSummaryResponse,
  RouteAnalyticsVisibility,
} from "contracts";
import type React from "react";
import {
  EndpointSankey,
  type EndpointSankeyFlow,
} from "@/components/macro-metrics/EndpointSankey";

type MachinePaymentRoutesScreenProps = {
  summary: RouteAnalyticsSummaryResponse;
  sankey: RouteAnalyticsSankeyResponse;
};

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;

const railLabel = (rail: MachinePaymentRail): string => {
  switch (rail) {
    case "stripe_mpp":
      return "Stripe MPP";
    case "hitpay_mpp":
      return "HitPay MPP";
    case "api_key":
      return "API key";
    case "subscription":
      return "Subscription";
    case "x402":
      return "x402";
    default:
      return "Other";
  }
};

const visibilityLabel = (visibility: RouteAnalyticsVisibility): string =>
  visibility.replaceAll("_", " ");

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--text-1)" }}>
        {value}
      </div>
      {note ? <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-2)" }}>{note}</div> : null}
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "blue" | "green" | "neutral" }) {
  const palette =
    tone === "blue"
      ? { background: "rgba(47, 93, 154, 0.1)", color: "var(--mesh-blue)" }
      : tone === "green"
        ? { background: "rgba(22, 163, 74, 0.1)", color: "#15803d" }
        : { background: "rgba(148, 163, 184, 0.16)", color: "var(--text-2)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        ...palette,
      }}
    >
      {children}
    </span>
  );
}

function buildRouteSankeyFlows(summary: RouteAnalyticsSummaryResponse): EndpointSankeyFlow[] {
  const selectedRoutes = selectSankeyRouteRows(summary);
  const maxAmountUsd = Math.max(...selectedRoutes.map((route) => route.amountUsd ?? 0), 1);
  const grouped = new Map<string, EndpointSankeyFlow>();

  for (const route of selectedRoutes) {
    const source = route.sourceRoute ?? "Direct API client";
    const rail = paymentRailLabel(route);
    const workflow = route.endpointGroup ?? route.workflowId;
    const amountScore = Math.round(((route.amountUsd ?? 0) / maxAmountUsd) * 5);
    const occurrences = Math.max(1, amountScore);

    addEndpointSankeyFlow(grouped, {
      from: source,
      to: rail,
      fromStep: 0,
      toStep: 1,
      occurrences,
      fromLabel: source,
      toLabel: rail,
    });
    addEndpointSankeyFlow(grouped, {
      from: rail,
      to: workflow,
      fromStep: 1,
      toStep: 2,
      occurrences,
      fromLabel: rail,
      toLabel: workflow,
    });
  }

  return Array.from(grouped.values()).sort((left, right) => right.occurrences - left.occurrences);
}

function selectSankeyRouteRows(summary: RouteAnalyticsSummaryResponse) {
  const machineFlowRows = summary.sampleRoutes.filter(
    (route) => route.provenance === "demo_label" && route.endpointGroup?.startsWith("/v1/"),
  );
  if (machineFlowRows.length > 0) return machineFlowRows;

  const demoRails = new Set<MachinePaymentRail>(["stripe_mpp", "hitpay_mpp"]);
  const demoRoutes = summary.sampleRoutes.filter((route) => demoRails.has(route.rail));
  const x402Routes = summary.sampleRoutes
    .filter((route) => route.rail === "x402")
    .sort((left, right) => (right.amountUsd ?? 0) - (left.amountUsd ?? 0))
    .slice(0, 8);

  // Keep the original response-row semantics, but cap noisy x402 fanout so the
  // Nivo Sankey still reads as a diagram instead of a dense table substitute.
  return [...x402Routes, ...demoRoutes].slice(0, 12);
}

function paymentRailLabel(route: RouteAnalyticsSummaryResponse["sampleRoutes"][number]): string {
  if (route.router && ["Solana", "Base", "Tempo", "STP"].includes(route.router)) {
    return `${railLabel(route.rail)} · ${route.router}`;
  }
  return railLabel(route.rail);
}

function addEndpointSankeyFlow(
  grouped: Map<string, EndpointSankeyFlow>,
  flow: EndpointSankeyFlow,
) {
  const key = `${flow.fromStep}:${flow.from}->${flow.toStep}:${flow.to}`;
  const existing = grouped.get(key);
  if (existing) {
    existing.occurrences += flow.occurrences;
    return;
  }
  grouped.set(key, { ...flow });
}

export function MachinePaymentRoutesScreen({ summary, sankey }: MachinePaymentRoutesScreenProps) {
  const routeSankeyFlows = buildRouteSankeyFlows(summary);
  const topLinks = [...sankey.links]
    .sort((left, right) => right.settledUsd - left.settledUsd || right.routeCount - left.routeCount)
    .slice(0, 8);
  const labelById = new Map(sankey.nodes.map((node) => [node.id, node.label]));

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-mute)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Machine payment routes
        </div>
        <h1 className="display" style={{ margin: "6px 0 0", fontSize: 32, letterSpacing: "-0.02em" }}>
          Machine Payment Flow
        </h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <StatCard label="Routes" value={summary.routeCount.toLocaleString()} />
        <StatCard label="Paid workflows" value={summary.paidWorkflowCount.toLocaleString()} />
        <StatCard label="Settled USD" value={formatUsd(summary.settledUsd)} />
        <StatCard label="Success rate" value={formatPct(summary.successRate)} />
        <StatCard label="Repeat usage" value={summary.repeatUsage.toLocaleString()} />
      </div>

      <section className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Payment rail comparison</h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 13 }}>
                x402 remains public onchain; Stripe and HitPay MPP rows are provider-attested demo
                routes for P0.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                  <th style={{ padding: "9px 6px" }}>rail</th>
                  <th style={{ padding: "9px 6px" }}>visibility</th>
                  <th style={{ padding: "9px 6px" }}>routes</th>
                  <th style={{ padding: "9px 6px" }}>workflows</th>
                  <th style={{ padding: "9px 6px" }}>settled USD</th>
                  <th style={{ padding: "9px 6px" }}>success</th>
                </tr>
              </thead>
              <tbody>
                {summary.rails.map((rail) => (
                  <tr key={rail.rail} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 6px", fontWeight: 800 }}>{railLabel(rail.rail)}</td>
                    <td style={{ padding: "10px 6px" }}>
                      <Badge tone={rail.visibility === "public_onchain" ? "green" : "blue"}>
                        {visibilityLabel(rail.visibility)}
                      </Badge>
                    </td>
                    <td style={{ padding: "10px 6px" }}>{rail.routeCount.toLocaleString()}</td>
                    <td style={{ padding: "10px 6px" }}>{rail.paidWorkflowCount.toLocaleString()}</td>
                    <td style={{ padding: "10px 6px" }}>{formatUsd(rail.settledUsd)}</td>
                    <td style={{ padding: "10px 6px" }}>{formatPct(rail.successRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Repeated route transitions
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Source route → payment rail → API workflow</h2>
          </div>
          <span className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>
            Nivo Sankey · capped response rows
          </span>
        </div>
        <div style={{ overflow: "visible", display: "flex", justifyContent: "center", minWidth: 0 }}>
          <EndpointSankey
            flows={routeSankeyFlows}
            ariaLabel="Machine payment route Sankey diagram"
            emptyMessage="No route flow detected."
            height={340}
            minWidth={0}
            margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
            labelFontSize={12}
          />
        </div>
        <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 8 }}>
          Built from the route analytics response rows with noisy x402 fanout capped for legibility.
          Wider links indicate stronger per-route settled-USD signal.
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Top route links</h2>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {topLinks.map((link) => (
              <div key={`${link.source}:${link.target}:${link.rail}`} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {labelById.get(link.source) ?? link.source} → {labelById.get(link.target) ?? link.target}
                  </div>
                  <Badge tone={link.visibility === "public_onchain" ? "green" : "blue"}>{railLabel(link.rail)}</Badge>
                </div>
                <div style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  {link.routeCount.toLocaleString()} routes · {link.workflowCount.toLocaleString()} workflows · {formatUsd(link.settledUsd)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Sample route rows</h2>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.sampleRoutes.slice(0, 8).map((route) => (
              <div key={route.routeId} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{route.endpointGroup ?? route.workflowId}</div>
                  <Badge tone={route.visibility === "public_onchain" ? "green" : "blue"}>
                    {railLabel(route.rail)}
                  </Badge>
                </div>
                <div style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12, lineHeight: 1.5 }}>
                  {(route.sourceRoute ?? "Direct API client")} → {railLabel(route.rail)} → {route.endpointGroup ?? route.workflowId}
                  <br />
                  {visibilityLabel(route.visibility)} · {route.currency} · {route.amountUsd !== undefined ? formatUsd(route.amountUsd) : "amount not normalized"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
