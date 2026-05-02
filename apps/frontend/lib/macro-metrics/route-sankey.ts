import type { X402SankeyChartModel, X402SankeyFlowRow } from "@/lib/x402-analysis/transform";
import type {
  MacroEndpointCategory,
  MacroMetricsDemoData,
  MacroService,
  MacroServiceId,
  MacroWallet,
  MacroWorkflowEvent,
} from "./demo";

const CATEGORY_LABELS: Record<MacroEndpointCategory, string> = {
  pool_search: "Pool search",
  trending_pools: "Trending pools",
  simple_price: "Simple price",
  token_price: "Token price",
  token_detail: "Token detail",
};

const SERVICE_RELIABILITY: Record<MacroServiceId, number> = {
  "northwind-price": 0.992,
  vectormind: 0.968,
  routezero: 0.972,
  signalport: 0.985,
  vaultlayer: 0.979,
  streamdelta: 0.987,
  ledgerlake: 0.964,
};

const CATEGORY_LATENCY_MS: Record<MacroEndpointCategory, number> = {
  pool_search: 780,
  trending_pools: 640,
  simple_price: 260,
  token_price: 420,
  token_detail: 560,
};

const SEGMENT_SUCCESS_ADJUSTMENT: Record<MacroWallet["segment"], number> = {
  trading_bot: 0.004,
  research_agent: 0.002,
  execution_wallet: -0.003,
  one_off: -0.012,
};

const INTERMEDIARY_LATENCY_MS: Record<MacroWallet["intermediary"], number> = {
  Privy: 45,
  "Circle Wallets": 110,
  "Coinbase CDP": 70,
  Safe: 120,
  Direct: 30,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function usdFromAtomic(atomic: string): number {
  return Number(BigInt(atomic)) / 1_000_000;
}

function serviceDetails(service: MacroService | undefined): string {
  if (!service) return "Unknown intermediary";
  return `${service.name} · ${service.category}`;
}

function middlemanLabel(wallet: MacroWallet | undefined): string {
  if (!wallet) return "Unknown middleman";
  if (wallet.intermediary === "Privy") return "Sponge";
  if (wallet.intermediary === "Coinbase CDP") return "Dexter";
  if (wallet.intermediary === "Circle Wallets") return "agent.market";
  if (wallet.intermediary === "Safe") return "Partner App";
  return "Direct";
}

function middlemanDetails(wallet: MacroWallet | undefined, service: MacroService | undefined): string {
  if (!wallet) return serviceDetails(service);
  return `${wallet.intermediary} · ${wallet.source}`;
}

function flowOrder(
  flows: X402SankeyFlowRow[],
  pickLabel: (flow: X402SankeyFlowRow) => string,
): string[] {
  const totals = new Map<string, number>();
  for (const flow of flows) {
    const label = pickLabel(flow);
    totals.set(label, (totals.get(label) ?? 0) + flow.flow_count);
  }
  return [...totals.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .map(([label]) => label);
}

function aggregateFlows(flows: X402SankeyFlowRow[]): X402SankeyFlowRow[] {
  const grouped = new Map<string, X402SankeyFlowRow[]>();
  for (const flow of flows) {
    const key = `${flow.left_label}|${flow.middle_label}|${flow.right_label}`;
    const current = grouped.get(key);
    if (current) current.push(flow);
    else grouped.set(key, [flow]);
  }

  return [...grouped.values()]
    .map((group) => {
      const first = group[0];
      if (!first) {
        throw new Error("Expected at least one route flow row.");
      }

      const totalFlowCount = group.reduce((sum, flow) => sum + flow.flow_count, 0);
      const totalWorkflowCount = group.reduce((sum, flow) => sum + flow.paid_count, 0);
      const totalSettledUsdc = group.reduce((sum, flow) => sum + flow.settled_usdc, 0);
      const weightedSuccessRate =
        totalFlowCount === 0
          ? 0
          : group.reduce((sum, flow) => sum + flow.success_rate * flow.flow_count, 0) /
            totalFlowCount;
      const weightedErrorRate =
        totalFlowCount === 0
          ? 0
          : group.reduce((sum, flow) => sum + flow.error_rate * flow.flow_count, 0) /
            totalFlowCount;
      const weightedLatency =
        totalFlowCount === 0
          ? 0
          : group.reduce((sum, flow) => sum + flow.p95_latency_ms * flow.flow_count, 0) /
            totalFlowCount;

      return {
        left_label: first.left_label,
        middle_label: first.middle_label,
        right_label: first.right_label,
        left_detail: first.left_detail,
        middle_detail: first.middle_detail,
        right_detail: first.right_detail,
        flow_count: totalFlowCount,
        paid_count: totalWorkflowCount,
        settled_usdc: Number(totalSettledUsdc.toFixed(2)),
        success_rate: Number(weightedSuccessRate.toFixed(3)),
        p95_latency_ms: Math.round(weightedLatency),
        error_rate: Number(weightedErrorRate.toFixed(3)),
        network: first.network,
      } satisfies X402SankeyFlowRow;
    })
    .sort((left, right) => {
      if (right.flow_count !== left.flow_count) return right.flow_count - left.flow_count;
      return right.settled_usdc - left.settled_usdc;
    });
}

function routeQuality(
  start: MacroWorkflowEvent,
  middle: MacroWorkflowEvent,
  next: MacroWorkflowEvent,
  wallet: MacroWallet | undefined,
): Pick<X402SankeyFlowRow, "success_rate" | "error_rate" | "p95_latency_ms"> {
  const reliabilityBase = SERVICE_RELIABILITY[middle.serviceId] ?? 0.97;
  const segmentAdjustment = wallet ? SEGMENT_SUCCESS_ADJUSTMENT[wallet.segment] : 0;
  const sourcePenalty =
    wallet?.source === "curl"
      ? 0.028
      : wallet?.source === "API relay"
        ? 0.014
        : wallet?.source === "n8n"
          ? 0.01
          : 0.006;
  const categoryPenalty =
    middle.endpointCategory === "token_detail"
      ? 0.012
      : middle.endpointCategory === "pool_search"
        ? 0.008
        : middle.endpointCategory === "trending_pools"
          ? 0.006
          : 0.004;
  const txPenalty = Math.max(0, middle.txCount - 1) * 0.008;
  const successRate = clamp(
    reliabilityBase + segmentAdjustment - sourcePenalty - categoryPenalty - txPenalty,
    0.87,
    0.999,
  );
  const latency =
    CATEGORY_LATENCY_MS[middle.endpointCategory] +
    (wallet ? INTERMEDIARY_LATENCY_MS[wallet.intermediary] : 50) +
    (start.endpointCategory === "trending_pools" ? 40 : 0) +
    (next.endpointCategory === "token_detail" ? 55 : 0) +
    Math.max(0, middle.txCount - 1) * 90;

  return {
    success_rate: Number(successRate.toFixed(3)),
    error_rate: Number((1 - successRate).toFixed(3)),
    p95_latency_ms: Math.round(latency),
  };
}

export function buildMacroRouteSankeyChart(
  data: MacroMetricsDemoData,
): X402SankeyChartModel {
  const sessions = new Map<string, MacroWorkflowEvent[]>();
  const serviceById = new Map(data.services.map((service) => [service.id, service]));
  const walletByAddress = new Map(data.wallets.map((wallet) => [wallet.address, wallet]));

  for (const event of data.events) {
    const existing = sessions.get(event.sessionId) ?? [];
    existing.push(event);
    sessions.set(event.sessionId, existing);
  }

  const flows = aggregateFlows(
    [...sessions.values()].flatMap((events) => {
      const ordered = [...events].sort(
        (left, right) => left.timestamp - right.timestamp || left.eventId.localeCompare(right.eventId),
      );
      const start = ordered[0];
      const middle = ordered[1];
      const next = ordered[2];
      if (!start || !middle || !next) return [];

      const service = serviceById.get(middle.serviceId);
      const wallet = walletByAddress.get(middle.walletAddress);
      const quality = routeQuality(start, middle, next, wallet);

      return [
        {
          left_label: CATEGORY_LABELS[start.endpointCategory],
          middle_label: middlemanLabel(wallet),
          right_label: CATEGORY_LABELS[next.endpointCategory],
          left_detail: start.endpointLabel,
          middle_detail: middlemanDetails(wallet, service),
          right_detail: next.endpointLabel,
          flow_count: middle.txCount,
          paid_count: 1,
          settled_usdc: usdFromAtomic(middle.spendAtomic),
          success_rate: quality.success_rate,
          p95_latency_ms: quality.p95_latency_ms,
          error_rate: quality.error_rate,
          network: "base",
        } satisfies X402SankeyFlowRow,
      ];
    }),
  );

  return {
    id: "macro_route_quality",
    eyebrow: "API workflow paths",
    title: "Initial Query → Intermediary → Downstream API",
    description:
      "See how an initial API query moves through intermediary services and what category is called next.",
    layer_labels: {
      left: "Initial query",
      mid: "Intermediary",
      right: "Downstream API",
    },
    layer_order: {
      left: flowOrder(flows, (flow) => flow.left_label),
      mid: flowOrder(flows, (flow) => flow.middle_label),
      right: flowOrder(flows, (flow) => flow.right_label),
    },
    flows,
  };
}
