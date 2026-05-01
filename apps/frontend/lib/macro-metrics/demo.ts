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
  | "price_lookup"
  | "ai_inference"
  | "swap_execution"
  | "notification"
  | "portfolio_sync"
  | "market_feed"
  | "settlement";

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

const flowBySegment: Record<MacroWallet["segment"], MacroServiceId[]> = {
  trading_bot: ["northwind-price", "vectormind", "routezero", "signalport"],
  research_agent: ["northwind-price", "streamdelta", "vectormind", "vaultlayer"],
  execution_wallet: ["northwind-price", "routezero", "ledgerlake"],
  one_off: ["northwind-price"],
};

const categoryByService: Record<MacroServiceId, MacroEndpointCategory> = {
  "northwind-price": "price_lookup",
  vectormind: "ai_inference",
  routezero: "swap_execution",
  signalport: "notification",
  vaultlayer: "portfolio_sync",
  streamdelta: "market_feed",
  ledgerlake: "settlement",
};

const labelByCategory: Record<MacroEndpointCategory, string> = {
  price_lookup: "GET /v1/prices",
  ai_inference: "POST /v1/completions",
  swap_execution: "POST /v1/swaps",
  notification: "POST /v1/webhooks",
  portfolio_sync: "GET /v1/portfolio",
  market_feed: "GET /v1/markets/stream",
  settlement: "POST /v1/settlements",
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

function atomicUsd(value: number): string {
  return Math.round(value * USDC).toString();
}

function buildEvents(): MacroWorkflowEvent[] {
  const events: MacroWorkflowEvent[] = [];
  let eventNo = 1;

  for (const [walletIndex, wallet] of wallets.entries()) {
    const sessionCount = repeatSessionsBySegment[wallet.segment];
    const flow = flowBySegment[wallet.segment];
    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const dayOffset = sessionCount - sessionIndex + (walletIndex % 3);
      const sessionId = `${wallet.address}:s${sessionIndex + 1}`;
      const baseTimestamp = T0 - dayOffset * DAY + walletIndex * 900 + sessionIndex * 180;
      flow.forEach((serviceId, stepIndex) => {
        const category = categoryByService[serviceId];
        const spendMultiplier = 1 + stepIndex * 0.42 + (sessionIndex % 4) * 0.08;
        events.push({
          eventId: `macro-${String(eventNo++).padStart(4, "0")}`,
          sessionId,
          walletAddress: wallet.address,
          serviceId,
          endpointCategory: category,
          endpointLabel: labelByCategory[category],
          timestamp: baseTimestamp + stepIndex * 75,
          spendAtomic: atomicUsd(spendUsdBySegment[wallet.segment] * spendMultiplier),
          txCount: serviceId === "routezero" ? 2 : 1,
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
