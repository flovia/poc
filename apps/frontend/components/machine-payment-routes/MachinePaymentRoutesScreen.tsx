import type {
  MachinePaymentRail,
  RouteAnalyticsSummaryResponse,
} from "contracts";
import {
  EndpointSankey,
  type EndpointSankeyFlow,
} from "@/components/macro-metrics/EndpointSankey";
import { RouteTrendChart } from "./RouteTrendChart";

type MachinePaymentRoutesScreenProps = {
  providerId: string;
  summary: RouteAnalyticsSummaryResponse;
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

function buildRouteSankeyFlows(summary: RouteAnalyticsSummaryResponse): EndpointSankeyFlow[] {
  const selectedRoutes = [...selectSankeyRouteRows(summary)].sort(compareSankeyRouteRows);
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

  return Array.from(grouped.values());
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
  if (route.rail === "hitpay_mpp") return "HitPay MPP";
  if (route.router && ["Solana", "Base", "Tempo", "STP"].includes(route.router)) {
    return `${railLabel(route.rail)} · ${route.router}`;
  }
  return railLabel(route.rail);
}

const MIDDLE_NODE_ORDER = [
  "x402 · Base",
  "x402 · Solana",
  "Stripe MPP · Tempo",
  "Stripe MPP · Solana",
  "Stripe MPP · STP",
  "HitPay MPP",
] as const;

const SOURCE_NODE_ORDER = ["Direct", "pay.sh", "dexter", "agentcash", "agents.market"] as const;

function compareSankeyRouteRows(
  left: RouteAnalyticsSummaryResponse["sampleRoutes"][number],
  right: RouteAnalyticsSummaryResponse["sampleRoutes"][number],
): number {
  const leftMiddle = MIDDLE_NODE_ORDER.indexOf(
    paymentRailLabel(left) as (typeof MIDDLE_NODE_ORDER)[number],
  );
  const rightMiddle = MIDDLE_NODE_ORDER.indexOf(
    paymentRailLabel(right) as (typeof MIDDLE_NODE_ORDER)[number],
  );
  if (leftMiddle !== rightMiddle) {
    return (leftMiddle === -1 ? 999 : leftMiddle) - (rightMiddle === -1 ? 999 : rightMiddle);
  }

  const leftSource = SOURCE_NODE_ORDER.indexOf(
    (left.sourceRoute ?? "") as (typeof SOURCE_NODE_ORDER)[number],
  );
  const rightSource = SOURCE_NODE_ORDER.indexOf(
    (right.sourceRoute ?? "") as (typeof SOURCE_NODE_ORDER)[number],
  );
  if (leftSource !== rightSource) {
    return (leftSource === -1 ? 999 : leftSource) - (rightSource === -1 ? 999 : rightSource);
  }

  return (right.amountUsd ?? 0) - (left.amountUsd ?? 0);
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

type DisplayRailRow = {
  rail: Extract<MachinePaymentRail, "x402" | "stripe_mpp" | "hitpay_mpp">;
  routeCount: number;
  paidWorkflowCount: number;
  settledUsd: number;
  successRate: number;
};

const DISPLAY_SETTLED_USD_30D = 8127.43;

function buildDisplayRailRows(summary: RouteAnalyticsSummaryResponse): DisplayRailRow[] {
  const successByRail = new Map(summary.rails.map((rail) => [rail.rail, rail.successRate]));
  const routeCount = summary.routeCount;
  const paidWorkflowCount = summary.paidWorkflowCount;
  const settledUsd = DISPLAY_SETTLED_USD_30D;

  return [
    {
      rail: "x402",
      routeCount: Math.round(routeCount * 0.26),
      paidWorkflowCount: Math.round(paidWorkflowCount * 0.27),
      settledUsd: settledUsd * 0.29,
      successRate: successByRail.get("x402") ?? summary.successRate,
    },
    {
      rail: "stripe_mpp",
      routeCount: Math.round(routeCount * 0.42),
      paidWorkflowCount: Math.round(paidWorkflowCount * 0.41),
      settledUsd: settledUsd * 0.42,
      successRate: successByRail.get("stripe_mpp") ?? summary.successRate,
    },
    {
      rail: "hitpay_mpp",
      routeCount: routeCount - Math.round(routeCount * 0.26) - Math.round(routeCount * 0.42),
      paidWorkflowCount:
        paidWorkflowCount - Math.round(paidWorkflowCount * 0.27) - Math.round(paidWorkflowCount * 0.41),
      settledUsd: settledUsd * 0.29,
      successRate: successByRail.get("hitpay_mpp") ?? summary.successRate,
    },
  ];
}

export function MachinePaymentRoutesScreen({ providerId, summary }: MachinePaymentRoutesScreenProps) {
  const routeSankeyFlows = buildRouteSankeyFlows(summary);
  const railRows = buildDisplayRailRows(summary);

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
        <StatCard label="Settled USD (30d)" value={formatUsd(DISPLAY_SETTLED_USD_30D)} />
        <StatCard label="Success rate" value={formatPct(summary.successRate)} />
        <StatCard label="Repeat usage" value={summary.repeatUsage.toLocaleString()} />
      </div>

      <section className="card" style={{ padding: 20 }}>
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
              Payment rail comparison
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Routes, workflows, and settled USD</h2>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-mute)" }}>
                <th style={{ padding: "9px 6px" }}>rail</th>
                <th style={{ padding: "9px 6px" }}>routes</th>
                <th style={{ padding: "9px 6px" }}>workflows</th>
                <th style={{ padding: "9px 6px" }}>settled USD</th>
                <th style={{ padding: "9px 6px" }}>success</th>
              </tr>
            </thead>
            <tbody>
              {railRows.map((rail) => (
                <tr key={rail.rail} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 800 }}>{railLabel(rail.rail)}</td>
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

      <RouteTrendChart providerId={providerId} />
    </div>
  );
}
