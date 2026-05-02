import type {
  MacroEndpointCategory,
  MacroMetricsDemoData,
  MacroServiceId,
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

export type ApiGrowthEndpointFlow = {
  from: MacroEndpointCategory;
  to: MacroEndpointCategory;
  fromStep: 0 | 1;
  toStep: 1 | 2;
  occurrences: number;
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

export type ApiGrowthRepeatWalletRate = {
  rate: number;
  repeatedWallets: number;
  totalWallets: number;
  note: string;
};

export type ApiGrowthServiceCandidate = {
  serviceId: MacroServiceId;
  serviceName: string;
  sharedWallets: number;
  sharedSpendAtomic: string;
  confidence: number;
  owner: string;
  reason: string;
};

export type ApiGrowthRepeatCohort = {
  cohort: string;
  paidWallets: number;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
};

export type ApiGrowthIntelligence = {
  insightCards: ApiGrowthInsightCard[];
  sourceMediumQuality: {
    rows: SourceMediumQualityRow[];
  };
  endpointFrequency: {
    rows: EndpointFrequencyRow[];
    flow: MacroEndpointCategory[];
    flows: ApiGrowthEndpointFlow[];
  };
  useCaseFit: {
    cards: UseCaseFitCard[];
  };
  repeatWalletRate: ApiGrowthRepeatWalletRate;
  repeatCohorts: ApiGrowthRepeatCohort[];
  otherServiceCandidates: ApiGrowthServiceCandidate[];
  recommendations: ApiGrowthRecommendation[];
  proxyNote: string;
};

const AGENT_FLOW: MacroEndpointCategory[] = ["pool_search", "token_price", "token_detail"];

const API_GROWTH_ENDPOINT_FLOWS: ApiGrowthEndpointFlow[] = [
  { from: "pool_search", to: "token_price", fromStep: 0, toStep: 1, occurrences: 520 },
  { from: "token_price", to: "token_detail", fromStep: 1, toStep: 2, occurrences: 430 },
  { from: "trending_pools", to: "pool_search", fromStep: 0, toStep: 1, occurrences: 180 },
  { from: "pool_search", to: "token_detail", fromStep: 1, toStep: 2, occurrences: 150 },
  { from: "simple_price", to: "token_price", fromStep: 0, toStep: 1, occurrences: 210 },
  { from: "token_price", to: "pool_search", fromStep: 1, toStep: 2, occurrences: 125 },
  { from: "token_detail", to: "simple_price", fromStep: 0, toStep: 1, occurrences: 95 },
  { from: "simple_price", to: "token_detail", fromStep: 1, toStep: 2, occurrences: 72 },
];

const useCaseBySegment: Record<MacroWallet["segment"], string> = {
  trading_bot: "Trading bot / agent workflow",
  research_agent: "Research agent",
  execution_wallet: "Execution workflow",
  one_off: "One-off lookup",
};

type ApiGrowthChannelProfile = {
  source: string;
  wallets: number;
  firstPaid: number;
  retainedW2: number;
  repeatSessions: number;
  endpointCalls: Partial<Record<MacroEndpointCategory, number>>;
  useCases: Partial<Record<UseCaseFitCard["useCase"], number>>;
};

const API_GROWTH_CHANNEL_PROFILES: ApiGrowthChannelProfile[] = [
  {
    source: "Direct",
    wallets: 100,
    firstPaid: 34,
    retainedW2: 18,
    repeatSessions: 82,
    endpointCalls: { simple_price: 920, token_price: 360, pool_search: 210, token_detail: 120 },
    useCases: {
      "One-off lookup": 58,
      "Research agent": 18,
      "Trading bot / agent workflow": 14,
      "Execution workflow": 10,
    },
  },
  {
    source: "Sponge",
    wallets: 80,
    firstPaid: 44,
    retainedW2: 27,
    repeatSessions: 148,
    endpointCalls: {
      pool_search: 720,
      token_price: 660,
      simple_price: 280,
      token_detail: 300,
      trending_pools: 180,
    },
    useCases: {
      "Trading bot / agent workflow": 34,
      "Research agent": 20,
      "One-off lookup": 16,
      "Execution workflow": 10,
    },
  },
  {
    source: "Dexter",
    wallets: 60,
    firstPaid: 43,
    retainedW2: 35,
    repeatSessions: 220,
    endpointCalls: {
      pool_search: 640,
      token_price: 760,
      token_detail: 520,
      trending_pools: 240,
      simple_price: 180,
    },
    useCases: {
      "Trading bot / agent workflow": 28,
      "Execution workflow": 18,
      "Research agent": 10,
      "One-off lookup": 4,
    },
  },
  {
    source: "Partner App",
    wallets: 55,
    firstPaid: 34,
    retainedW2: 26,
    repeatSessions: 132,
    endpointCalls: {
      token_detail: 420,
      token_price: 340,
      pool_search: 260,
      simple_price: 210,
      trending_pools: 120,
    },
    useCases: {
      "Execution workflow": 22,
      "Research agent": 16,
      "Trading bot / agent workflow": 12,
      "One-off lookup": 5,
    },
  },
  {
    source: "AgentKit MCP",
    wallets: 45,
    firstPaid: 35,
    retainedW2: 32,
    repeatSessions: 246,
    endpointCalls: {
      pool_search: 860,
      token_price: 920,
      token_detail: 740,
      trending_pools: 340,
      simple_price: 120,
    },
    useCases: {
      "Trading bot / agent workflow": 27,
      "Research agent": 9,
      "Execution workflow": 7,
      "One-off lookup": 2,
    },
  },
  {
    source: "Docs",
    wallets: 35,
    firstPaid: 16,
    retainedW2: 9,
    repeatSessions: 44,
    endpointCalls: {
      simple_price: 260,
      token_price: 140,
      pool_search: 90,
      token_detail: 70,
      trending_pools: 40,
    },
    useCases: {
      "One-off lookup": 18,
      "Research agent": 9,
      "Trading bot / agent workflow": 5,
      "Execution workflow": 3,
    },
  },
];

const sourceProfileByName = new Map(
  API_GROWTH_CHANNEL_PROFILES.map((profile) => [profile.source, profile]),
);
const maxSourceProfileWallets = Math.max(
  ...API_GROWTH_CHANNEL_PROFILES.map((profile) => profile.wallets),
);

function sourceMediumFor(wallet: MacroWallet): string {
  if (wallet.intermediary === "Circle Wallets") return "AgentKit MCP";
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
  const endpointRows = buildEndpointRows(data, eventsByEndpoint, totalEvents);
  const useCaseCards = buildUseCaseCards(data, sessionsByWallet, walletByAddress);
  const repeatWalletRate = buildRepeatWalletRate(data, sessionsByWallet);
  const repeatCohorts = buildRepeatCohorts(data, sessionsByWallet);
  const otherServiceCandidates = buildOtherServiceCandidates(data);
  const highestFrequencyChannel = topBy(sourceRows, (row) => row.endpointFrequency);
  const bestChannel = topBy(
    sourceRows.filter((row) => row.source !== highestFrequencyChannel?.source),
    (row) => row.qualityScore,
  );
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
        label: "Repeat wallet rate",
        value:
          repeatWalletRate.totalWallets === 0 ? "—" : `${Math.round(repeatWalletRate.rate * 100)}%`,
        note: repeatWalletRate.note,
        tone: "teal",
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
    endpointFrequency: { rows: endpointRows, flow: AGENT_FLOW, flows: API_GROWTH_ENDPOINT_FLOWS },
    useCaseFit: { cards: useCaseCards },
    repeatWalletRate,
    repeatCohorts,
    otherServiceCandidates,
    recommendations: buildRecommendations(sourceRows, endpointRows, useCaseCards),
    proxyNote:
      "Offline demo model. Source / medium labels and x402 / Agent fit are directional product-growth proxies derived from wallet, session, endpoint, and repeat behavior.",
  };
}

function buildRepeatCohorts(
  data: MacroMetricsDemoData,
  sessionsByWallet: Map<string, Set<string>>,
): ApiGrowthRepeatCohort[] {
  if (data.wallets.length > 0) {
    return API_GROWTH_CHANNEL_PROFILES.map((profile) => {
      const week1 = Math.min(
        profile.firstPaid,
        profile.retainedW2 + Math.round((profile.firstPaid - profile.retainedW2) * 0.55),
      );
      const week3 = Math.max(0, Math.round(profile.retainedW2 * 0.82));
      return {
        cohort: profile.source,
        paidWallets: profile.firstPaid,
        week0: 1,
        week1: round(ratio(week1, profile.firstPaid)),
        week2: round(ratio(profile.retainedW2, profile.firstPaid)),
        week3: round(ratio(week3, profile.firstPaid)),
      };
    }).sort((left, right) => right.week2 - left.week2 || right.paidWallets - left.paidWallets);
  }

  const sourceRows = buildSourceMediumRows(data, sessionsByWallet);
  return sourceRows.map((row) => ({
    cohort: row.source,
    paidWallets: row.firstPaid,
    week0: row.firstPaid === 0 ? 0 : 1,
    week1: row.repeatQuality,
    week2: row.repeatQuality,
    week3: round(row.repeatQuality * 0.82),
  }));
}

function addAtomic(left: string, right: string): string {
  return (BigInt(left) + BigInt(right)).toString();
}

function serviceName(data: MacroMetricsDemoData, serviceId: MacroServiceId): string {
  const apiProviderName: Partial<Record<MacroServiceId, string>> = {
    vectormind: "Exa API",
    routezero: "The Graph",
    signalport: "CoinMarketCap API",
    vaultlayer: "Alchemy API",
  };
  return apiProviderName[serviceId] ?? data.services.find((service) => service.id === serviceId)?.name ?? serviceId;
}

function ownerForService(serviceId: MacroServiceId): string {
  if (serviceId === "vectormind" || serviceId === "routezero") return "Growth PM";
  if (serviceId === "ledgerlake" || serviceId === "vaultlayer") return "Product lead";
  return "Developer relations";
}

function buildRepeatWalletRate(
  data: MacroMetricsDemoData,
  sessionsByWallet: Map<string, Set<string>>,
): ApiGrowthRepeatWalletRate {
  if (data.wallets.length > 0) {
    const firstPaid = API_GROWTH_CHANNEL_PROFILES.reduce(
      (acc, profile) => acc + profile.firstPaid,
      0,
    );
    const retained = API_GROWTH_CHANNEL_PROFILES.reduce(
      (acc, profile) => acc + profile.retainedW2,
      0,
    );
    return {
      rate: round(ratio(retained, firstPaid)),
      repeatedWallets: retained,
      totalWallets: firstPaid,
      note: `${retained} / ${firstPaid} paid wallets used the API again within 2 weeks`,
    };
  }

  const repeatedWallets = [...sessionsByWallet.values()].filter(
    (sessions) => sessions.size >= 2,
  ).length;
  const totalWallets = sessionsByWallet.size;
  return {
    rate: round(ratio(repeatedWallets, totalWallets)),
    repeatedWallets,
    totalWallets,
    note: `${repeatedWallets} / ${totalWallets} paid wallets used the API in multiple sessions`,
  };
}

function buildOtherServiceCandidates(data: MacroMetricsDemoData): ApiGrowthServiceCandidate[] {
  if (data.wallets.length > 0) {
    return [
      {
        serviceId: "vectormind",
        serviceName: serviceName(data, "vectormind"),
        sharedWallets: 42,
        sharedSpendAtomic: "184000000",
        confidence: 0.74,
        owner: ownerForService("vectormind"),
        reason: "Agent-like research wallets also need web/context retrieval before price calls",
      },
      {
        serviceId: "routezero",
        serviceName: serviceName(data, "routezero"),
        sharedWallets: 38,
        sharedSpendAtomic: "156000000",
        confidence: 0.67,
        owner: ownerForService("routezero"),
        reason: "Workflow wallets often move from token discovery into on-chain graph lookups",
      },
      {
        serviceId: "signalport",
        serviceName: serviceName(data, "signalport"),
        sharedWallets: 35,
        sharedSpendAtomic: "141000000",
        confidence: 0.62,
        owner: ownerForService("signalport"),
        reason: "Market-monitoring wallets pair price endpoints with broader market cap context",
      },
      {
        serviceId: "vaultlayer",
        serviceName: serviceName(data, "vaultlayer"),
        sharedWallets: 31,
        sharedSpendAtomic: "119000000",
        confidence: 0.55,
        owner: ownerForService("vaultlayer"),
        reason: "Power users need infrastructure APIs around repeated token and pool workflows",
      },
    ];
  }

  if (data.events.length === 0) return [];

  const primaryWallets = new Set(
    data.events
      .filter((event) => event.serviceId === data.primaryProviderId)
      .map((event) => event.walletAddress),
  );

  return data.services
    .filter((service) => service.id !== data.primaryProviderId)
    .map((service): ApiGrowthServiceCandidate => {
      const sharedEvents = data.events.filter(
        (event) => event.serviceId === service.id && primaryWallets.has(event.walletAddress),
      );
      const sharedWallets = new Set(sharedEvents.map((event) => event.walletAddress));
      const sharedSpendAtomic = sharedEvents.reduce(
        (acc, event) => addAtomic(acc, event.spendAtomic),
        "0",
      );
      const confidence = primaryWallets.size === 0 ? 0 : sharedWallets.size / primaryWallets.size;
      return {
        serviceId: service.id,
        serviceName: serviceName(data, service.id),
        sharedWallets: sharedWallets.size,
        sharedSpendAtomic,
        confidence: round(confidence),
        owner: ownerForService(service.id),
        reason: `Shared by ${sharedWallets.size} wallets after primary API workflows`,
      };
    })
    .filter((candidate) => candidate.sharedWallets > 0)
    .sort((left, right) => {
      if (BigInt(right.sharedSpendAtomic) !== BigInt(left.sharedSpendAtomic)) {
        return BigInt(right.sharedSpendAtomic) > BigInt(left.sharedSpendAtomic) ? 1 : -1;
      }
      return right.confidence - left.confidence;
    });
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
      const observedVolumeShare = ratio(observedWallets, totalWallets);
      const profile = sourceProfileByName.get(source);
      const wallets = profile?.wallets ?? observedWallets;
      const firstPaid = profile?.firstPaid ?? observedWallets;
      const repeatRate = profile
        ? ratio(profile.retainedW2, profile.firstPaid)
        : ratio(row.repeated.size, observedWallets);
      const totalEndpointCalls = profile
        ? Object.values(profile.endpointCalls).reduce((acc, calls) => acc + (calls ?? 0), 0)
        : row.eventCount;
      const endpointFrequency = wallets === 0 ? 0 : totalEndpointCalls / wallets;
      const volumeShare = profile
        ? ratio(profile.wallets, maxSourceProfileWallets)
        : observedVolumeShare;
      const repeatQuality = repeatRate;
      const qualityScore = clamp(
        repeatQuality * 0.55 + Math.min(endpointFrequency / 50, 1) * 0.35 + volumeShare * 0.1,
      );
      const useCaseMix = (
        profile
          ? (Object.entries(profile.useCases) as Array<[string, number]>)
          : [...row.segments.entries()]
      )
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
  data: MacroMetricsDemoData,
  eventsByEndpoint: Map<MacroEndpointCategory, MacroMetricsDemoData["events"]>,
  totalEvents: number,
): EndpointFrequencyRow[] {
  if (data.wallets.length > 0) {
    const endpointRows = new Map<
      MacroEndpointCategory,
      { wallets: number; calls: number; repeatSessions: number }
    >();
    for (const profile of API_GROWTH_CHANNEL_PROFILES) {
      for (const [endpoint, calls = 0] of Object.entries(profile.endpointCalls) as Array<
        [MacroEndpointCategory, number]
      >) {
        const existing = endpointRows.get(endpoint) ?? { wallets: 0, calls: 0, repeatSessions: 0 };
        const endpointShare =
          calls /
          Math.max(
            1,
            Object.values(profile.endpointCalls).reduce((acc, value) => acc + (value ?? 0), 0),
          );
        existing.wallets += Math.max(
          1,
          Math.round(profile.firstPaid * Math.min(0.95, 0.42 + endpointShare)),
        );
        existing.calls += calls;
        existing.repeatSessions += Math.round(
          profile.repeatSessions * Math.min(0.9, 0.35 + endpointShare),
        );
        endpointRows.set(endpoint, existing);
      }
    }
    const totalProfileCalls = [...endpointRows.values()].reduce((acc, row) => acc + row.calls, 0);
    return [...endpointRows.entries()]
      .map(([endpoint, row]) => ({
        endpoint,
        label: endpoint.replace(/_/g, " "),
        wallets: row.wallets,
        callsPerWallet: round(row.wallets === 0 ? 0 : row.calls / row.wallets, 1),
        repeatSessions: row.repeatSessions,
        paidFrequency: row.calls,
        share: round(ratio(row.calls, totalProfileCalls)),
      }))
      .sort((left, right) => right.paidFrequency - left.paidFrequency);
  }

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
  if (data.wallets.length > 0) {
    return buildProfileUseCaseCards();
  }

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

function buildProfileUseCaseCards(): UseCaseFitCard[] {
  const byUseCase = new Map<
    UseCaseFitCard["useCase"],
    {
      wallets: number;
      sources: Map<string, number>;
      calls: number;
      repeatSessions: number;
      endpointCalls: Map<MacroEndpointCategory, number>;
    }
  >();

  for (const profile of API_GROWTH_CHANNEL_PROFILES) {
    const profileCalls = Object.values(profile.endpointCalls).reduce(
      (acc, calls) => acc + (calls ?? 0),
      0,
    );
    for (const [useCase, wallets = 0] of Object.entries(profile.useCases) as Array<
      [UseCaseFitCard["useCase"], number]
    >) {
      const row = byUseCase.get(useCase) ?? {
        wallets: 0,
        sources: new Map<string, number>(),
        calls: 0,
        repeatSessions: 0,
        endpointCalls: new Map<MacroEndpointCategory, number>(),
      };
      const useCaseShare = ratio(wallets, profile.wallets);
      row.wallets += wallets;
      row.calls += Math.round(profileCalls * useCaseShare);
      row.repeatSessions += Math.round(profile.repeatSessions * useCaseShare);
      row.sources.set(profile.source, (row.sources.get(profile.source) ?? 0) + wallets);
      for (const [endpoint, calls = 0] of Object.entries(profile.endpointCalls) as Array<
        [MacroEndpointCategory, number]
      >) {
        row.endpointCalls.set(
          endpoint,
          (row.endpointCalls.get(endpoint) ?? 0) + Math.round(calls * useCaseShare),
        );
      }
      byUseCase.set(useCase, row);
    }
  }

  return [...byUseCase.entries()]
    .map(([useCase, row]) => {
      const frequency = row.wallets === 0 ? 0 : row.calls / row.wallets;
      const repeatRate = ratio(row.repeatSessions, Math.max(1, row.wallets * 6));
      const endpointSet = new Set(
        [...row.endpointCalls.entries()]
          .filter(([, calls]) => calls > 0)
          .map(([endpoint]) => endpoint),
      );
      const hasAgentFlow = AGENT_FLOW.every((endpoint) => endpointSet.has(endpoint));
      const agentFit = clamp(
        (hasAgentFlow ? 0.28 : 0.04) + repeatRate * 0.42 + Math.min(frequency / 42, 1) * 0.3,
      );
      const x402Fit = clamp(
        repeatRate * 0.45 +
          Math.min(frequency / 40, 1) * 0.35 +
          (endpointSet.has("token_detail") ? 0.2 : 0),
      );
      const sourceMix = [...row.sources.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([source]) => source)
        .slice(0, 2)
        .join(" + ");
      const topFlow = [...row.endpointCalls.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([endpoint]) => endpoint)
        .join(" → ");
      return {
        useCase,
        sourceMix,
        endpointFlow: hasAgentFlow ? "pool_search → token_price → token_detail" : topFlow,
        frequency: round(frequency, 1),
        agentFit: round(agentFit),
        x402Fit: round(x402Fit),
        confidence: round(clamp(repeatRate * 0.58 + Math.min(row.wallets / 80, 1) * 0.42)),
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
  const topSource = sourceRows[0]?.source ?? "AgentKit MCP + Dexter";
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
