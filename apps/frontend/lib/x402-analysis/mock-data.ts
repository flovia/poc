import { createHash } from "node:crypto";
import type {
  EndpointMasterRow,
  SankeyFlowDailyRow,
  X402CategoryDefinition,
  X402EndpointCategory,
  X402ErrorType,
  X402MockDataset,
  X402RequestEvent,
  X402PaymentStatus,
  X402WorkflowStage,
} from "./types";

const ONE_DAY_MS = 86_400_000;
const TOKEN = "USDC" as const;
const NETWORK = "base";

type FlowBlueprint = {
  user_intent: string;
  from_category: X402EndpointCategory;
  api_intermediary: string;
  to_category: X402EndpointCategory;
  from_endpoint: string;
  from_provider: string;
  from_subcategory: string;
  to_endpoint: string;
  to_provider: string;
  to_subcategory: string;
  next_category: X402EndpointCategory;
  next_endpoint: string;
  next_provider: string;
  next_subcategory: string;
  pricing_model: string;
  base_flow_count: number;
  base_ticket_usdc: number;
  base_success_rate: number;
  base_latency_ms: number;
};

const ENDPOINT_MASTER: EndpointMasterRow[] = [
  {
    endpoint: "/v1/price/history?pair=ETH-USD&window=1h",
    endpoint_category: "Extract",
    endpoint_subcategory: "price_history",
    provider: "Northwind Price API",
    pricing_model: "per_request",
  },
  {
    endpoint: "/v1/price/snapshot?pairs=ETH,ARB,SOL",
    endpoint_category: "Extract",
    endpoint_subcategory: "price_snapshot",
    provider: "Northwind Price API",
    pricing_model: "per_request",
  },
  {
    endpoint: "/v1/market/ohlcv?pair=SOL-USD&interval=1h",
    endpoint_category: "Extract",
    endpoint_subcategory: "ohlcv",
    provider: "Northwind Price API",
    pricing_model: "per_request",
  },
  {
    endpoint: "/v1/pools/search?chain=base&token=ETH",
    endpoint_category: "Search",
    endpoint_subcategory: "pool_lookup",
    provider: "StreamDelta",
    pricing_model: "per_query",
  },
  {
    endpoint: "/v1/mempool/search?pair=ETH-USD",
    endpoint_category: "Search",
    endpoint_subcategory: "mempool_signal",
    provider: "StreamDelta",
    pricing_model: "per_query",
  },
  {
    endpoint: "/v1/orderflow/search?wallet=smart-money",
    endpoint_category: "Search",
    endpoint_subcategory: "orderflow_search",
    provider: "LedgerLake",
    pricing_model: "per_lookup",
  },
  {
    endpoint: "/v1/responses",
    endpoint_category: "Analyze",
    endpoint_subcategory: "trade_thesis",
    provider: "VectorMind AI",
    pricing_model: "per_token",
  },
  {
    endpoint: "/v1/risk/check?pair=ETH-USD",
    endpoint_category: "Analyze",
    endpoint_subcategory: "risk_check",
    provider: "VaultLayer",
    pricing_model: "per_score",
  },
  {
    endpoint: "/v1/policy/simulate",
    endpoint_category: "Analyze",
    endpoint_subcategory: "policy_simulation",
    provider: "VaultLayer",
    pricing_model: "per_request",
  },
  {
    endpoint: "/quote-and-swap",
    endpoint_category: "Transact",
    endpoint_subcategory: "dex_execution",
    provider: "RouteZero DEX",
    pricing_model: "per_success",
  },
  {
    endpoint: "/settle-and-bridge",
    endpoint_category: "Transact",
    endpoint_subcategory: "settlement",
    provider: "RouteZero DEX",
    pricing_model: "per_success",
  },
  {
    endpoint: "/api/messages",
    endpoint_category: "Transact",
    endpoint_subcategory: "alerting",
    provider: "SignalPort",
    pricing_model: "per_message",
  },
];

const CATEGORY_DEFINITIONS: X402CategoryDefinition[] = [
  {
    category: "Extract",
    display_label: "Market data",
    description:
      "Price history, snapshots, and OHLCV-style market data feeds such as Northwind Price API.",
  },
  {
    category: "Search",
    display_label: "Signal lookup",
    description:
      "Pool, mempool, and orderflow lookups from DeFi signal services such as StreamDelta and LedgerLake.",
  },
  {
    category: "Analyze",
    display_label: "AI inference",
    description:
      "Trading-thesis, risk, and policy simulation APIs such as VectorMind AI and VaultLayer.",
  },
  {
    category: "Transact",
    display_label: "DEX execution & alerts",
    description:
      "Swap routing, settlement, and trade alert delivery such as RouteZero DEX and SignalPort.",
  },
];

const FLOW_BLUEPRINTS: FlowBlueprint[] = [
  {
    user_intent: "Monitor hourly market loop",
    from_category: "Extract",
    api_intermediary: "PayRouter A",
    to_category: "Analyze",
    from_endpoint: "/v1/price/history?pair=ETH-USD&window=1h",
    from_provider: "Northwind Price API",
    from_subcategory: "price_history",
    to_endpoint: "/v1/responses",
    to_provider: "VectorMind AI",
    to_subcategory: "trade_thesis",
    next_category: "Transact",
    next_endpoint: "/quote-and-swap",
    next_provider: "RouteZero DEX",
    next_subcategory: "dex_execution",
    pricing_model: "per_request",
    base_flow_count: 180,
    base_ticket_usdc: 0.18,
    base_success_rate: 0.98,
    base_latency_ms: 980,
  },
  {
    user_intent: "Monitor hourly market loop",
    from_category: "Extract",
    api_intermediary: "PayRouter B",
    to_category: "Search",
    from_endpoint: "/v1/price/snapshot?pairs=ETH,ARB,SOL",
    from_provider: "Northwind Price API",
    from_subcategory: "price_snapshot",
    to_endpoint: "/v1/pools/search?chain=base&token=ETH",
    to_provider: "StreamDelta",
    to_subcategory: "pool_lookup",
    next_category: "Analyze",
    next_endpoint: "/v1/responses",
    next_provider: "VectorMind AI",
    next_subcategory: "trade_thesis",
    pricing_model: "per_request",
    base_flow_count: 145,
    base_ticket_usdc: 0.14,
    base_success_rate: 0.96,
    base_latency_ms: 1420,
  },
  {
    user_intent: "Generate trade thesis",
    from_category: "Search",
    api_intermediary: "PayRouter A",
    to_category: "Analyze",
    from_endpoint: "/v1/mempool/search?pair=ETH-USD",
    from_provider: "StreamDelta",
    from_subcategory: "mempool_signal",
    to_endpoint: "/v1/responses",
    to_provider: "VectorMind AI",
    to_subcategory: "trade_thesis",
    next_category: "Transact",
    next_endpoint: "/quote-and-swap",
    next_provider: "RouteZero DEX",
    next_subcategory: "dex_execution",
    pricing_model: "per_query",
    base_flow_count: 132,
    base_ticket_usdc: 0.2,
    base_success_rate: 0.95,
    base_latency_ms: 1290,
  },
  {
    user_intent: "Route rebalance swap",
    from_category: "Search",
    api_intermediary: "DataBridge X",
    to_category: "Transact",
    from_endpoint: "/v1/orderflow/search?wallet=smart-money",
    from_provider: "LedgerLake",
    from_subcategory: "orderflow_search",
    to_endpoint: "/quote-and-swap",
    to_provider: "RouteZero DEX",
    to_subcategory: "dex_execution",
    next_category: "Analyze",
    next_endpoint: "/v1/risk/check?pair=ETH-USD",
    next_provider: "VaultLayer",
    next_subcategory: "risk_check",
    pricing_model: "per_lookup",
    base_flow_count: 118,
    base_ticket_usdc: 0.3,
    base_success_rate: 0.93,
    base_latency_ms: 2080,
  },
  {
    user_intent: "Route rebalance swap",
    from_category: "Analyze",
    api_intermediary: "PayRouter A",
    to_category: "Transact",
    from_endpoint: "/v1/policy/simulate",
    from_provider: "VaultLayer",
    from_subcategory: "policy_simulation",
    to_endpoint: "/quote-and-swap",
    to_provider: "RouteZero DEX",
    to_subcategory: "dex_execution",
    next_category: "Search",
    next_endpoint: "/v1/pools/search?chain=base&token=ETH",
    next_provider: "StreamDelta",
    next_subcategory: "pool_lookup",
    pricing_model: "per_request",
    base_flow_count: 164,
    base_ticket_usdc: 0.26,
    base_success_rate: 0.94,
    base_latency_ms: 1940,
  },
  {
    user_intent: "Generate trade thesis",
    from_category: "Analyze",
    api_intermediary: "AgentAPI Hub",
    to_category: "Search",
    from_endpoint: "/v1/responses",
    from_provider: "VectorMind AI",
    from_subcategory: "trade_thesis",
    to_endpoint: "/v1/pools/search?chain=base&token=ETH",
    to_provider: "StreamDelta",
    to_subcategory: "pool_lookup",
    next_category: "Transact",
    next_endpoint: "/quote-and-swap",
    next_provider: "RouteZero DEX",
    next_subcategory: "dex_execution",
    pricing_model: "per_token",
    base_flow_count: 92,
    base_ticket_usdc: 0.16,
    base_success_rate: 0.97,
    base_latency_ms: 1560,
  },
  {
    user_intent: "Score risk & exposure",
    from_category: "Transact",
    api_intermediary: "Commerce Facilitator",
    to_category: "Analyze",
    from_endpoint: "/quote-and-swap",
    from_provider: "RouteZero DEX",
    from_subcategory: "dex_execution",
    to_endpoint: "/v1/risk/check?pair=ETH-USD",
    to_provider: "VaultLayer",
    to_subcategory: "risk_check",
    next_category: "Search",
    next_endpoint: "/v1/mempool/search?pair=ETH-USD",
    next_provider: "StreamDelta",
    next_subcategory: "mempool_signal",
    pricing_model: "per_success",
    base_flow_count: 84,
    base_ticket_usdc: 0.1,
    base_success_rate: 0.91,
    base_latency_ms: 2440,
  },
  {
    user_intent: "Route rebalance swap",
    from_category: "Extract",
    api_intermediary: "DataBridge X",
    to_category: "Transact",
    from_endpoint: "/v1/market/ohlcv?pair=SOL-USD&interval=1h",
    from_provider: "Northwind Price API",
    from_subcategory: "ohlcv",
    to_endpoint: "/api/messages",
    to_provider: "SignalPort",
    to_subcategory: "alerting",
    next_category: "Analyze",
    next_endpoint: "/v1/responses",
    next_provider: "VectorMind AI",
    next_subcategory: "trade_thesis",
    pricing_model: "per_request",
    base_flow_count: 126,
    base_ticket_usdc: 0.22,
    base_success_rate: 0.92,
    base_latency_ms: 1720,
  },
  {
    user_intent: "Route rebalance swap",
    from_category: "Search",
    api_intermediary: "Commerce Facilitator",
    to_category: "Transact",
    from_endpoint: "/v1/pools/search?chain=base&token=ETH",
    from_provider: "StreamDelta",
    from_subcategory: "pool_lookup",
    to_endpoint: "/quote-and-swap",
    to_provider: "RouteZero DEX",
    to_subcategory: "dex_execution",
    next_category: "Analyze",
    next_endpoint: "/v1/risk/check?pair=ETH-USD",
    next_provider: "VaultLayer",
    next_subcategory: "risk_check",
    pricing_model: "per_query",
    base_flow_count: 156,
    base_ticket_usdc: 0.34,
    base_success_rate: 0.95,
    base_latency_ms: 2510,
  },
  {
    user_intent: "Score risk & exposure",
    from_category: "Analyze",
    api_intermediary: "DataBridge X",
    to_category: "Extract",
    from_endpoint: "/v1/risk/check?pair=ETH-USD",
    from_provider: "VaultLayer",
    from_subcategory: "risk_check",
    to_endpoint: "/v1/price/snapshot?pairs=ETH,ARB,SOL",
    to_provider: "Northwind Price API",
    to_subcategory: "price_snapshot",
    next_category: "Search",
    next_endpoint: "/v1/pools/search?chain=base&token=ETH",
    next_provider: "StreamDelta",
    next_subcategory: "pool_lookup",
    pricing_model: "per_score",
    base_flow_count: 78,
    base_ticket_usdc: 0.11,
    base_success_rate: 0.9,
    base_latency_ms: 1380,
  },
];

const ERROR_TYPES: X402ErrorType[] = [
  "payment_verification_failed",
  "insufficient_funds",
  "api_timeout",
  "provider_5xx",
  "invalid_signature",
];

function hashFraction(seed: string): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function pick<T>(seed: string, values: readonly T[]): T {
  return values[Math.floor(hashFraction(seed) * values.length)] ?? values[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function between(seed: string, min: number, max: number): number {
  return min + (max - min) * hashFraction(seed);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function maskWallet(seed: string): string {
  const digest = createHash("sha256").update(seed).digest("hex");
  return `0x${digest.slice(0, 6)}...${digest.slice(-4)}`;
}

function buildEndpointMasterRows(): EndpointMasterRow[] {
  return ENDPOINT_MASTER;
}

function buildRequestEvent(
  blueprint: FlowBlueprint,
  date: Date,
  workflowIndex: number,
  stepOrder: number,
  stage: X402WorkflowStage,
  status: X402PaymentStatus,
  amountUsdc: number,
  latencyMs: number,
  errorType: X402ErrorType,
): X402RequestEvent {
  const workflowId = `wf-${formatDay(date).replaceAll("-", "")}-${blueprint.api_intermediary.replaceAll(
    " ",
    "",
  )}-${String(workflowIndex).padStart(4, "0")}`;
  const buyerSeed = `${workflowId}:buyer`;
  const sellerSeed = `${workflowId}:seller`;
  const stepSeed = `${workflowId}:${stage}:${stepOrder}`;
  const endpoint =
    stage === "before_target"
      ? blueprint.from_endpoint
      : stage === "target"
        ? blueprint.to_endpoint
        : blueprint.next_endpoint;
  const provider =
    stage === "before_target"
      ? blueprint.from_provider
      : stage === "target"
        ? blueprint.to_provider
        : blueprint.next_provider;
  const endpointCategory =
    stage === "before_target"
      ? blueprint.from_category
      : stage === "target"
        ? blueprint.to_category
        : blueprint.next_category;

  return {
    event_id: `evt-${stepSeed}`,
    workflow_id: workflowId,
    step_order: stepOrder,
    workflow_stage: stage,
    timestamp: formatTimestamp(
      new Date(date.getTime() + workflowIndex * 9_000 + (stepOrder - 1) * 21_000),
    ),
    user_intent: blueprint.user_intent,
    buyer_type: pick(stepSeed, ["agent", "human", "automation", "service"]),
    buyer_wallet_hash: maskWallet(buyerSeed),
    seller_wallet_hash: maskWallet(sellerSeed),
    api_intermediary: blueprint.api_intermediary,
    provider,
    endpoint,
    endpoint_category: endpointCategory,
    amount_usdc: amountUsdc,
    network: NETWORK,
    token: TOKEN,
    payment_status: status,
    http_status:
      status === "failed"
        ? errorType === "payment_verification_failed" || errorType === "insufficient_funds"
          ? 402
          : 500
        : 200,
    latency_ms: latencyMs,
    error_type: errorType,
  };
}

function buildDailyFlowRow(
  date: Date,
  blueprint: FlowBlueprint,
  workflowCount: number,
  successRate: number,
  settledUsdc: number,
  p95LatencyMs: number,
  paidCount: number,
): SankeyFlowDailyRow {
  return {
    date: formatDay(date),
    from_category: blueprint.from_category,
    api_intermediary: blueprint.api_intermediary,
    to_category: blueprint.to_category,
    flow_count: workflowCount,
    paid_count: paidCount,
    settled_usdc: round(settledUsdc, 2),
    success_rate: round(successRate, 3),
    p95_latency_ms: Math.round(p95LatencyMs),
    error_rate: round(1 - successRate, 3),
    network: NETWORK,
  };
}

function buildDailyForBlueprint(
  date: Date,
  blueprint: FlowBlueprint,
  daySeed: string,
): {
  events: X402RequestEvent[];
  row: SankeyFlowDailyRow;
} {
  const count = clamp(
    Math.round(blueprint.base_flow_count * between(`${daySeed}:count`, 0.8, 1.2)),
    50,
    1200,
  );
  const successRate = clamp(
    round(blueprint.base_success_rate + between(`${daySeed}:success`, -0.03, 0.03), 3),
    0.88,
    0.99,
  );
  const paidCount = clamp(Math.round(count * successRate), 0, count);
  const settledCount = clamp(
    Math.round(paidCount * between(`${daySeed}:settled-share`, 0.62, 0.88)),
    0,
    paidCount,
  );
  const failureCount = count - paidCount;
  const p95LatencyMs = clamp(
    Math.round(blueprint.base_latency_ms * between(`${daySeed}:latency`, 0.84, 1.2)),
    600,
    3500,
  );

  const events: X402RequestEvent[] = [];
  let settledTotal = 0;

  for (let index = 0; index < count; index += 1) {
    const workflowSeed = `${daySeed}:${blueprint.api_intermediary}:${index}`;
    const settled = index < settledCount;
    const paid = index >= settledCount && index < paidCount;
    const failed = index >= paidCount;
    const status = failed ? "failed" : settled ? "settled" : "paid";
    const errorType = failed ? pick(`${workflowSeed}:error`, ERROR_TYPES) : "none";
    const sourceAmount = round(
      blueprint.base_ticket_usdc * between(`${workflowSeed}:source-amount`, 0.8, 1.12),
      3,
    );
    const targetAmount = round(
      blueprint.base_ticket_usdc * between(`${workflowSeed}:target-amount`, 0.9, 1.35),
      3,
    );
    const targetLatency = clamp(
      Math.round(
        blueprint.base_latency_ms *
          between(`${workflowSeed}:target-latency`, failed ? 0.92 : 0.62, failed ? 1.18 : 1.05),
      ),
      120,
      4000,
    );
    const sourceLatency = clamp(
      Math.round(blueprint.base_latency_ms * between(`${workflowSeed}:source-latency`, 0.18, 0.48)),
      60,
      1200,
    );
    const afterTargetLatency = clamp(
      Math.round(
        blueprint.base_latency_ms *
          between(
            `${workflowSeed}:after-target-latency`,
            failed ? 0.88 : 0.42,
            failed ? 1.08 : 0.94,
          ),
      ),
      90,
      3200,
    );
    const afterTargetAmount = round(
      blueprint.base_ticket_usdc * between(`${workflowSeed}:after-target-amount`, 0.65, 1.08),
      3,
    );

    events.push(
      buildRequestEvent(
        blueprint,
        date,
        index,
        1,
        "before_target",
        "required",
        sourceAmount,
        sourceLatency,
        "none",
      ),
      buildRequestEvent(
        blueprint,
        date,
        index,
        2,
        "target",
        status,
        status === "settled" ? targetAmount : status === "paid" ? round(targetAmount * 0.75, 3) : 0,
        targetLatency,
        errorType,
      ),
    );

    if (!failed) {
      events.push(
        buildRequestEvent(
          blueprint,
          date,
          index,
          3,
          "after_target",
          status === "settled" ? "settled" : "paid",
          status === "settled" ? afterTargetAmount : round(afterTargetAmount * 0.8, 3),
          afterTargetLatency,
          "none",
        ),
      );
    }

    if (settled) {
      settledTotal += targetAmount;
    } else if (paid) {
      settledTotal += round(targetAmount * 0.75, 3);
    }
  }

  return {
    events,
    row: buildDailyFlowRow(
      date,
      blueprint,
      count,
      paidCount / count,
      settledTotal,
      p95LatencyMs,
      paidCount,
    ),
  };
}

export function buildX402MockDataset(baseDate = new Date()): X402MockDataset {
  const today = utcDay(baseDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const requestEvents: X402RequestEvent[] = [];
  const sankeyFlowsDaily: SankeyFlowDailyRow[] = [];

  for (const date of days) {
    const daySeed = formatDay(date);
    for (const blueprint of FLOW_BLUEPRINTS) {
      const { events, row } = buildDailyForBlueprint(date, blueprint, daySeed);
      requestEvents.push(...events);
      sankeyFlowsDaily.push(row);
    }
  }

  return {
    x402_request_events: requestEvents.sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    ),
    endpoint_master: buildEndpointMasterRows(),
    sankey_flows_daily: sankeyFlowsDaily.sort((left, right) => {
      const byDate = left.date.localeCompare(right.date);
      if (byDate !== 0) return byDate;
      const byIntermediary = left.api_intermediary.localeCompare(right.api_intermediary);
      if (byIntermediary !== 0) return byIntermediary;
      return left.from_category.localeCompare(right.from_category);
    }),
  };
}

export { CATEGORY_DEFINITIONS as X402_CATEGORY_DEFINITIONS };
export { FLOW_BLUEPRINTS as X402_FLOW_BLUEPRINTS };
