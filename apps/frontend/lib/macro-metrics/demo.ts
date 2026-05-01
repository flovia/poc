import { PROVIDER_NAME, PROVIDER_PAY_TO, PROTAGONIST_ADDRESS, T0 } from "@/lib/sdk-fixtures/shared";

export type MacroServiceId =
  | "northwind-price"
  | "vectormind"
  | "routezero"
  | "signalport"
  | "vaultlayer"
  | "streamdelta"
  | "ledgerlake";

export type MacroEndpointCategory =
  | "pool_search"
  | "trending_pools"
  | "simple_price"
  | "token_price"
  | "token_detail";

export type MacroPriority = "P0" | "P1" | "P2";
export type MacroRecommendationType = "upsell" | "co-marketing" | "reprice" | "retention-lift";

export type MacroService = {
  id: MacroServiceId;
  name: string;
  payTo: string;
  category: string;
};

export type MacroWallet = {
  address: string;
  label: string;
  segment: "trading_bot" | "research_agent" | "execution_wallet" | "one_off";
  source: "Claude Code" | "Cursor" | "n8n" | "API relay" | "curl";
  intermediary: "Privy" | "Circle Wallets" | "Coinbase CDP" | "Safe" | "Direct";
};

export type MacroWorkflowEvent = {
  eventId: string;
  sessionId: string;
  walletAddress: string;
  serviceId: MacroServiceId;
  endpointCategory: MacroEndpointCategory;
  endpointLabel: string;
  timestamp: number;
  spendAtomic: string;
  txCount: number;
};

export type MacroRecommendation = {
  id: string;
  type: MacroRecommendationType;
  title: string;
  target: string;
  impact: string;
  confidence: number;
  priority: MacroPriority;
  proxy: boolean;
};

export type MacroMetricsDemoData = {
  generatedAt: number;
  primaryProviderId: MacroServiceId;
  services: MacroService[];
  wallets: MacroWallet[];
  events: MacroWorkflowEvent[];
  recommendations: MacroRecommendation[];
};

const USDC = 1_000_000;
const DAY = 86_400;

const services: MacroService[] = [
  {
    id: "northwind-price",
    name: PROVIDER_NAME["northwind-price"],
    payTo: PROVIDER_PAY_TO["northwind-price"],
    category: "Price API",
  },
  {
    id: "vectormind",
    name: PROVIDER_NAME.vectormind,
    payTo: PROVIDER_PAY_TO.vectormind,
    category: "AI inference",
  },
  {
    id: "routezero",
    name: PROVIDER_NAME.routezero,
    payTo: PROVIDER_PAY_TO.routezero,
    category: "Swap execution",
  },
  {
    id: "signalport",
    name: PROVIDER_NAME.signalport,
    payTo: PROVIDER_PAY_TO.signalport,
    category: "Notification",
  },
  {
    id: "vaultlayer",
    name: PROVIDER_NAME.vaultlayer,
    payTo: PROVIDER_PAY_TO.vaultlayer,
    category: "Portfolio",
  },
  {
    id: "streamdelta",
    name: PROVIDER_NAME.streamdelta,
    payTo: PROVIDER_PAY_TO.streamdelta,
    category: "Market feed",
  },
  {
    id: "ledgerlake",
    name: PROVIDER_NAME.ledgerlake,
    payTo: PROVIDER_PAY_TO.ledgerlake,
    category: "Settlement",
  },
];

const wallets: MacroWallet[] = [
  {
    address: PROTAGONIST_ADDRESS,
    label: "Aster trading bot",
    segment: "trading_bot",
    source: "Claude Code",
    intermediary: "Privy",
  },
  {
    address: "0x2B64...91AF",
    label: "Delta arb bot",
    segment: "trading_bot",
    source: "n8n",
    intermediary: "Circle Wallets",
  },
  {
    address: "0x8C10...4D2E",
    label: "Quant desk runner",
    segment: "trading_bot",
    source: "API relay",
    intermediary: "Coinbase CDP",
  },
  {
    address: "0x5E71...B229",
    label: "Research copilot",
    segment: "research_agent",
    source: "Cursor",
    intermediary: "Privy",
  },
  {
    address: "0x19AB...77C0",
    label: "Portfolio analyst",
    segment: "research_agent",
    source: "Claude Code",
    intermediary: "Safe",
  },
  {
    address: "0x7742...0F33",
    label: "Execution wallet",
    segment: "execution_wallet",
    source: "API relay",
    intermediary: "Coinbase CDP",
  },
  {
    address: "0xC021...8E10",
    label: "Treasury rebalance",
    segment: "execution_wallet",
    source: "n8n",
    intermediary: "Safe",
  },
  {
    address: "0xAA90...B120",
    label: "One-off lookup",
    segment: "one_off",
    source: "curl",
    intermediary: "Direct",
  },
  {
    address: "0xE331...44A9",
    label: "Trial builder",
    segment: "one_off",
    source: "Cursor",
    intermediary: "Direct",
  },
];

type WorkflowStep = { serviceId: MacroServiceId; endpointCategory: MacroEndpointCategory };

function workflow(...steps: WorkflowStep[]): WorkflowStep[] {
  return steps;
}

function repeatWorkflow(count: number, ...steps: WorkflowStep[]): WorkflowStep[][] {
  return Array.from({ length: count }, () => workflow(...steps));
}

const workflowVariantsBySegment: Record<MacroWallet["segment"], WorkflowStep[][]> = {
  trading_bot: [
    ...repeatWorkflow(
      6,
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
    ),
    ...repeatWorkflow(
      2,
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
    ),
    workflow(
      { serviceId: "streamdelta", endpointCategory: "trending_pools" },
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
    ),
    workflow(
      { serviceId: "northwind-price", endpointCategory: "token_price" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
    ),
  ],
  research_agent: [
    ...repeatWorkflow(
      3,
      { serviceId: "streamdelta", endpointCategory: "trending_pools" },
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
    ),
    workflow(
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
    ),
    workflow(
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "streamdelta", endpointCategory: "trending_pools" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
    ),
    workflow(
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
    ),
  ],
  execution_wallet: [
    ...repeatWorkflow(
      3,
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
    ),
    workflow(
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "streamdelta", endpointCategory: "trending_pools" },
    ),
    workflow(
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
    ),
  ],
  one_off: [
    workflow(
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "northwind-price", endpointCategory: "token_price" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
    ),
    workflow(
      { serviceId: "northwind-price", endpointCategory: "pool_search" },
      { serviceId: "northwind-price", endpointCategory: "simple_price" },
      { serviceId: "ledgerlake", endpointCategory: "token_detail" },
    ),
  ],
};

function workflowFor(wallet: MacroWallet, sessionIndex: number): WorkflowStep[] {
  const variants = workflowVariantsBySegment[wallet.segment];
  return variants[sessionIndex % variants.length];
}

const labelByCategory: Record<MacroEndpointCategory, string> = {
  pool_search: "GET /api/v3/x402/onchain/search/pools",
  trending_pools: "GET /api/v3/x402/onchain/networks/base/trending_pools",
  simple_price: "GET /api/v3/x402/simple/price",
  token_price: "GET /api/v3/x402/onchain/simple/networks/base/token_price/:address",
  token_detail: "GET /api/v3/x402/onchain/networks/base/tokens/:address",
};

const repeatSessionsBySegment: Record<MacroWallet["segment"], number> = {
  trading_bot: 18,
  research_agent: 9,
  execution_wallet: 7,
  one_off: 1,
};

const spendUsdBySegment: Record<MacroWallet["segment"], number> = {
  trading_bot: 3.8,
  research_agent: 1.25,
  execution_wallet: 5.6,
  one_off: 0.08,
};

const endpointSpendMultiplier: Record<MacroEndpointCategory, number> = {
  pool_search: 0.9,
  trending_pools: 0.75,
  simple_price: 0.35,
  token_price: 0.55,
  token_detail: 1.15,
};

function atomicUsd(value: number): string {
  return Math.round(value * USDC).toString();
}

function buildEvents(): MacroWorkflowEvent[] {
  const events: MacroWorkflowEvent[] = [];
  let eventNo = 1;

  for (const [walletIndex, wallet] of wallets.entries()) {
    const sessionCount = repeatSessionsBySegment[wallet.segment];
    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const flow = workflowFor(wallet, sessionIndex);
      const dayOffset = sessionCount - sessionIndex + (walletIndex % 3);
      const sessionId = `${wallet.address}:s${sessionIndex + 1}`;
      const baseTimestamp = T0 - dayOffset * DAY + walletIndex * 900 + sessionIndex * 180;
      flow.forEach((step, stepIndex) => {
        const spendMultiplier = endpointSpendMultiplier[step.endpointCategory] + stepIndex * 0.14 + (sessionIndex % 4) * 0.05;
        events.push({
          eventId: `macro-${String(eventNo++).padStart(4, "0")}`,
          sessionId,
          walletAddress: wallet.address,
          serviceId: step.serviceId,
          endpointCategory: step.endpointCategory,
          endpointLabel: labelByCategory[step.endpointCategory],
          timestamp: baseTimestamp + stepIndex * 75,
          spendAtomic: atomicUsd(spendUsdBySegment[wallet.segment] * spendMultiplier),
          txCount: step.endpointCategory === "simple_price" || step.endpointCategory === "token_price" ? 2 : 1,
        });
      });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId));
}

export const MACRO_METRICS_DEMO_DATA: MacroMetricsDemoData = {
  generatedAt: T0,
  primaryProviderId: "northwind-price",
  services,
  wallets,
  events: buildEvents(),
  recommendations: [
    {
      id: "upsell-trading-bots",
      type: "upsell",
      title: "Convert high-repeat trading bots to committed tier",
      target: "Trading bot segment",
      impact: "+$18.4k ARR proxy from wallets already repeating 15+ sessions",
      confidence: 0.88,
      priority: "P0",
      proxy: false,
    },
    {
      id: "co-market-vectormind-routezero",
      type: "co-marketing",
      title: "Package Price API with VectorMind and RouteZero",
      target: "AI trading workflow",
      impact: "Top shared workflow explains most high-value repeated sequences",
      confidence: 0.81,
      priority: "P1",
      proxy: false,
    },
    {
      id: "discount-research-agents",
      type: "reprice",
      title: "Offer research-agent bundle discount",
      target: "Research agents",
      impact: "Reduce drop-off after price + market-feed exploration",
      confidence: 0.66,
      priority: "P2",
      proxy: true,
    },
    {
      id: "retention-lift-privy",
      type: "retention-lift",
      title: "Prioritize Privy-sourced onboarding playbook",
      target: "Privy intermediary",
      impact: "+9pp retention lift proxy vs direct curl traffic",
      confidence: 0.72,
      priority: "P2",
      proxy: true,
    },
  ],
};
