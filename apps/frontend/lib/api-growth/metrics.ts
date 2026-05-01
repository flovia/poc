import type {
  MacroEndpointCategory,
  MacroMetricsDemoData,
  MacroWallet,
} from "@/lib/macro-metrics/demo";

export type ApiGrowthInsightCard = {
  label: string;
  value: string;
  note: string;
  tone: "primary" | "teal" | "warn";
};

export type SourceMediumQualityRow = {
  source: string;
  wallets: number;
  firstPaid: number;
  repeatRate: number;
  endpointFrequency: number;
  qualityScore: number;
  volumeShare: number;
  repeatQuality: number;
  useCaseMix: string;
};

export type EndpointFrequencyRow = {
  endpoint: MacroEndpointCategory;
  label: string;
  wallets: number;
  callsPerWallet: number;
  repeatSessions: number;
  paidFrequency: number;
  share: number;
};

export type UseCaseFitCard = {
  useCase: string;
  sourceMix: string;
  endpointFlow: string;
  frequency: number;
  agentFit: number;
  x402Fit: number;
  confidence: number;
  productPriority: "P0" | "P1" | "P2";
};

export type ApiGrowthRecommendation = {
  title: string;
  reason: string;
  target: string;
  metric: string;
  priority: "P0" | "P1" | "P2";
};

export type ApiGrowthIntelligence = {
  insightCards: ApiGrowthInsightCard[];
  sourceMediumQuality: {
    rows: SourceMediumQualityRow[];
  };
  endpointFrequency: {
    rows: EndpointFrequencyRow[];
    flow: MacroEndpointCategory[];
  };
  useCaseFit: {
    cards: UseCaseFitCard[];
  };
  recommendations: ApiGrowthRecommendation[];
  proxyNote: string;
};

const AGENT_FLOW: MacroEndpointCategory[] = ["pool_search", "token_price", "token_detail"];

const useCaseBySegment: Record<MacroWallet["segment"], string> = {
  trading_bot: "Trading bot / agent workflow",
  research_agent: "Research agent",
  execution_wallet: "Execution workflow",
  one_off: "One-off lookup",
};

const sourceQualityProxy: Record<
  string,
  { wallets: number; firstPaidRate: number; repeatQuality: number }
> = {
  "Agent SDK": { wallets: 45, firstPaidRate: 0.78, repeatQuality: 0.9 },
  Dexter: { wallets: 60, firstPaidRate: 0.72, repeatQuality: 0.82 },
  Direct: { wallets: 100, firstPaidRate: 0.34, repeatQuality: 0.22 },
  Docs: { wallets: 35, firstPaidRate: 0.46, repeatQuality: 0.38 },
  "Partner App": { wallets: 55, firstPaidRate: 0.61, repeatQuality: 0.64 },
  Sponge: { wallets: 80, firstPaidRate: 0.55, repeatQuality: 0.46 },
};

const maxSourceProxyWallets = Math.max(...Object.values(sourceQualityProxy).map((source) => source.wallets));

function sourceMediumFor(wallet: MacroWallet): string {
  if (wallet.intermediary === "Circle Wallets") return "Agent SDK";
  if (wallet.intermediary === "Coinbase CDP") return "Dexter";
  if (wallet.intermediary === "Privy") return "Sponge";
  if (wallet.intermediary === "Safe") return "Partner App";
  if (wallet.source === "Cursor") return "Docs";
  return "Direct";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ratio(part: number, total: number): number {
  return total === 0 ? 0 : part / total;
}

function topBy<T>(rows: T[], score: (row: T) => number): T | undefined {
  return [...rows].sort((left, right) => score(right) - score(left))[0];
}

export function buildApiGrowthIntelligence(data: MacroMetricsDemoData): ApiGrowthIntelligence {
  const walletByAddress = new Map(data.wallets.map((wallet) => [wallet.address, wallet]));
  const sessionsByWallet = new Map<string, Set<string>>();
  const eventsByEndpoint = new Map<MacroEndpointCategory, typeof data.events>();
  const totalEvents = data.events.length;

  for (const event of data.events) {
    const sessions = sessionsByWallet.get(event.walletAddress) ?? new Set<string>();
    sessions.add(event.sessionId);
    sessionsByWallet.set(event.walletAddress, sessions);

    const endpointEvents = eventsByEndpoint.get(event.endpointCategory) ?? [];
    endpointEvents.push(event);
    eventsByEndpoint.set(event.endpointCategory, endpointEvents);
  }

  const sourceRows = buildSourceMediumRows(data, sessionsByWallet);
  const endpointRows = buildEndpointRows(eventsByEndpoint, totalEvents);
  const useCaseCards = buildUseCaseCards(data, sessionsByWallet, walletByAddress);
  const bestChannel = topBy(sourceRows, (row) => row.qualityScore);
  const highestFrequencyChannel = topBy(sourceRows, (row) => row.endpointFrequency);
  const topEndpoint = topBy(endpointRows, (row) => row.paidFrequency);
  const bestFit = topBy(useCaseCards, (card) => card.x402Fit + card.agentFit);

  return {
    insightCards: [
      {
        label: "Best adoption channel",
        value: highestFrequencyChannel?.source ?? "—",
        note: highestFrequencyChannel
          ? "high repeat + high endpoint frequency"
          : "No channel traffic in this offline snapshot",
        tone: "primary",
      },
      {
        label: "Highest quality medium",
        value: bestChannel?.source ?? "—",
        note: bestChannel
          ? `${Math.round(bestChannel.repeatRate * 100)}% repeat quality proxy`
          : "No quality signal yet",
        tone: "teal",
      },
      {
        label: "Top agent-like flow",
        value: topEndpoint?.endpoint ?? "—",
        note: topEndpoint
          ? `${round(topEndpoint.callsPerWallet, 1)} calls / wallet`
          : "No endpoint flow yet",
        tone: "primary",
      },
      {
        label: "Best x402 fit",
        value: bestFit?.useCase ?? "—",
        note: bestFit
          ? `${Math.round(bestFit.x402Fit * 100)}% fit · ${bestFit.productPriority}`
          : "No use case fit yet",
        tone: "warn",
      },
    ],
    sourceMediumQuality: { rows: sourceRows },
    endpointFrequency: { rows: endpointRows, flow: AGENT_FLOW },
    useCaseFit: { cards: useCaseCards },
    recommendations: buildRecommendations(sourceRows, endpointRows, useCaseCards),
    proxyNote:
      "Offline demo model. Source / medium labels and x402 / Agent fit are directional product-growth proxies derived from wallet, session, endpoint, and repeat behavior.",
  };
}

function buildSourceMediumRows(
  data: MacroMetricsDemoData,
  sessionsByWallet: Map<string, Set<string>>,
): SourceMediumQualityRow[] {
  const totalWallets = data.wallets.length;
  const rows = new Map<
    string,
    {
      wallets: Set<string>;
      repeated: Set<string>;
      eventCount: number;
      segments: Map<string, number>;
    }
  >();

  for (const wallet of data.wallets) {
    const source = sourceMediumFor(wallet);
    const row = rows.get(source) ?? {
      wallets: new Set<string>(),
      repeated: new Set<string>(),
      eventCount: 0,
      segments: new Map<string, number>(),
    };
    row.wallets.add(wallet.address);
    if ((sessionsByWallet.get(wallet.address)?.size ?? 0) >= 2) row.repeated.add(wallet.address);
    row.segments.set(
      useCaseBySegment[wallet.segment],
      (row.segments.get(useCaseBySegment[wallet.segment]) ?? 0) + 1,
    );
    rows.set(source, row);
  }

  for (const event of data.events) {
    const wallet = data.wallets.find((entry) => entry.address === event.walletAddress);
    if (!wallet) continue;
    const row = rows.get(sourceMediumFor(wallet));
    if (row) row.eventCount += event.txCount;
  }

  return [...rows.entries()]
    .map(([source, row]) => {
      const observedWallets = row.wallets.size;
      const repeatRate = ratio(row.repeated.size, observedWallets);
      const endpointFrequency = observedWallets === 0 ? 0 : row.eventCount / observedWallets;
      const observedVolumeShare = ratio(observedWallets, totalWallets);
      const proxy = sourceQualityProxy[source];
      const wallets = proxy?.wallets ?? observedWallets;
      const firstPaid = proxy ? Math.round(proxy.wallets * proxy.firstPaidRate) : observedWallets;
      const volumeShare = proxy ? ratio(proxy.wallets, maxSourceProxyWallets) : observedVolumeShare;
      const repeatQuality = proxy?.repeatQuality ?? repeatRate;
      const qualityScore = clamp(
        repeatQuality * 0.55 + Math.min(endpointFrequency / 50, 1) * 0.35 + volumeShare * 0.1,
      );
      const useCaseMix = [...row.segments.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([segment]) => segment)
        .slice(0, 2)
        .join(" + ");
      return {
        source,
        wallets,
        firstPaid,
        repeatRate: round(repeatRate),
        endpointFrequency: round(endpointFrequency, 1),
        qualityScore: round(qualityScore),
        volumeShare: round(volumeShare),
        repeatQuality: round(repeatQuality),
        useCaseMix,
      };
    })
    .sort(
      (left, right) =>
        right.qualityScore - left.qualityScore || right.endpointFrequency - left.endpointFrequency,
    );
}

function buildEndpointRows(
  eventsByEndpoint: Map<MacroEndpointCategory, MacroMetricsDemoData["events"]>,
  totalEvents: number,
): EndpointFrequencyRow[] {
  return [...eventsByEndpoint.entries()]
    .map(([endpoint, events]) => {
      const wallets = new Set(events.map((event) => event.walletAddress));
      const sessions = new Set(events.map((event) => event.sessionId));
      const txCount = events.reduce((acc, event) => acc + event.txCount, 0);
      return {
        endpoint,
        label: endpoint.replace(/_/g, " "),
        wallets: wallets.size,
        callsPerWallet: round(wallets.size === 0 ? 0 : txCount / wallets.size, 1),
        repeatSessions: sessions.size,
        paidFrequency: txCount,
        share: round(ratio(events.length, totalEvents)),
      };
    })
    .sort((left, right) => right.paidFrequency - left.paidFrequency);
}

function buildUseCaseCards(
  data: MacroMetricsDemoData,
  sessionsByWallet: Map<string, Set<string>>,
  walletByAddress: Map<string, MacroWallet>,
): UseCaseFitCard[] {
  const byUseCase = new Map<
    string,
    {
      wallets: Set<string>;
      sources: Map<string, number>;
      events: MacroMetricsDemoData["events"];
      repeated: number;
    }
  >();

  for (const wallet of data.wallets) {
    const useCase = useCaseBySegment[wallet.segment];
    const row = byUseCase.get(useCase) ?? {
      wallets: new Set<string>(),
      sources: new Map<string, number>(),
      events: [],
      repeated: 0,
    };
    row.wallets.add(wallet.address);
    row.sources.set(sourceMediumFor(wallet), (row.sources.get(sourceMediumFor(wallet)) ?? 0) + 1);
    if ((sessionsByWallet.get(wallet.address)?.size ?? 0) >= 2) row.repeated += 1;
    byUseCase.set(useCase, row);
  }

  for (const event of data.events) {
    const wallet = walletByAddress.get(event.walletAddress);
    if (!wallet) continue;
    byUseCase.get(useCaseBySegment[wallet.segment])?.events.push(event);
  }

  return [...byUseCase.entries()]
    .map(([useCase, row]) => {
      const wallets = row.wallets.size;
      const frequency =
        wallets === 0 ? 0 : row.events.reduce((acc, event) => acc + event.txCount, 0) / wallets;
      const repeatRate = ratio(row.repeated, wallets);
      const endpointSet = new Set(row.events.map((event) => event.endpointCategory));
      const hasAgentFlow = AGENT_FLOW.every((endpoint) => endpointSet.has(endpoint));
      const agentFit = clamp(
        (hasAgentFlow ? 0.3 : 0.05) + repeatRate * 0.45 + Math.min(frequency / 60, 1) * 0.25,
      );
      const x402Fit = clamp(
        repeatRate * 0.5 +
          Math.min(frequency / 55, 1) * 0.35 +
          (endpointSet.has("token_detail") ? 0.15 : 0),
      );
      const sourceMix = [...row.sources.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([source]) => source)
        .slice(0, 2)
        .join(" + ");
      return {
        useCase,
        sourceMix,
        endpointFlow: hasAgentFlow
          ? "pool_search → token_price → token_detail"
          : ([...endpointSet][0]?.replace(/_/g, " ") ?? "—"),
        frequency: round(frequency, 1),
        agentFit: round(agentFit),
        x402Fit: round(x402Fit),
        confidence: round(clamp(repeatRate * 0.65 + Math.min(wallets / 4, 1) * 0.35)),
        productPriority: x402Fit >= 0.75 ? "P0" : x402Fit >= 0.55 ? "P1" : "P2",
      } satisfies UseCaseFitCard;
    })
    .sort((left, right) => right.x402Fit + right.agentFit - (left.x402Fit + left.agentFit));
}

function buildRecommendations(
  sourceRows: SourceMediumQualityRow[],
  endpointRows: EndpointFrequencyRow[],
  useCaseCards: UseCaseFitCard[],
): ApiGrowthRecommendation[] {
  const topSource = sourceRows[0]?.source ?? "Agent SDK + Dexter";
  const topEndpoint = endpointRows[0]?.endpoint ?? "pool_search";
  const topUseCase = useCaseCards[0]?.useCase ?? "Trading bot / agent workflow";

  return [
    {
      title: `Double down on ${topSource}`,
      reason: "High repeat and high endpoint frequency indicate durable API adoption.",
      target: "GTM / marketing focus",
      metric: "Repeat quality + endpoint freq",
      priority: "P0",
    },
    {
      title: "Improve Sponge activation",
      reason: "High-volume channels should be fixed when repeat quality trails the best medium.",
      target: "Activation experiment",
      metric: "W2 repeat rate",
      priority: "P1",
    },
    {
      title: `Prioritize docs/examples for ${topEndpoint}`,
      reason: "The most frequent paid endpoint should become the clearest adoption path.",
      target: "Docs + examples",
      metric: "Calls / wallet",
      priority: "P1",
    },
    {
      title: `Package ${topUseCase} as x402-ready workflow`,
      reason:
        "Repeat paid workflows with agent-like sequences are the strongest x402 packaging candidates.",
      target: "x402 / Agents offering",
      metric: "Agent fit + x402 fit",
      priority: "P0",
    },
  ];
}
