import type {
  MacroEndpointCategory,
  MacroMetricsDemoData,
  MacroRecommendation,
  MacroServiceId,
  MacroWorkflowEvent,
} from "./demo";

export type MacroOverview = {
  paidActiveWallets: number;
  totalSpendAtomic: string;
  paidUsageTxCount: number;
  trend7d: TrendPoint[];
  trend30d: TrendPoint[];
  trend7dSpendAtomic: string;
  trend30dSpendAtomic: string;
};

export type TrendPoint = {
  day: string;
  spendAtomic: string;
  txCount: number;
  walletCount: number;
};

export type SpendConcentration = {
  topWalletShare: number;
  topThreeWalletShare: number;
  walletCountForHalfSpend: number;
  rankedWallets: Array<{
    walletAddress: string;
    label: string;
    spendAtomic: string;
    share: number;
  }>;
};

export type RepeatSummary = {
  repeatWalletRate: number;
  repeatedWallets: number;
  totalWallets: number;
  averageSessionsPerRepeatedWallet: number;
  bySegment: Array<{
    segment: string;
    repeatedWallets: number;
    totalWallets: number;
    repeatRate: number;
  }>;
};

export type CoUsageProvider = {
  serviceId: MacroServiceId;
  serviceName: string;
  sharedWallets: number;
  sharedSpendAtomic: string;
  sharedTxCount: number;
  confidence: number;
  suggestedOwner: string;
  reason: string;
};

export type EndpointUsage = {
  category: MacroEndpointCategory;
  label: string;
  txCount: number;
  spendAtomic: string;
  walletCount: number;
  share: number;
};

export type EndpointFlow = {
  from: MacroEndpointCategory;
  to: MacroEndpointCategory;
  fromStep: 0 | 1;
  toStep: 1 | 2;
  occurrences: number;
  share: number;
};

export type SourceRanking = {
  source: string;
  wallets: number;
  repeatRate: number;
  spendAtomic: string;
};

export type MacroMetricsViewModel = {
  generatedAt: number;
  overview: MacroOverview;
  spendConcentration: SpendConcentration;
  repeatSummary: RepeatSummary;
  coUsageProviders: CoUsageProvider[];
  endpointUsage: EndpointUsage[];
  endpointFlows: EndpointFlow[];
  sourceRankings: SourceRanking[];
  recommendations: MacroRecommendation[];
  executiveTakeaways: string[];
  proxyNote: string;
};

const DAY = 86_400;

function addAtomic(left: string, right: string): string {
  return (BigInt(left) + BigInt(right)).toString();
}

function ratio(part: bigint, total: bigint): number {
  return total === 0n ? 0 : Number((part * 10_000n) / total) / 10_000;
}

function dayKey(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function serviceName(data: MacroMetricsDemoData, serviceId: MacroServiceId): string {
  return data.services.find((service) => service.id === serviceId)?.name ?? serviceId;
}

function walletLabel(data: MacroMetricsDemoData, walletAddress: string): string {
  return data.wallets.find((wallet) => wallet.address === walletAddress)?.label ?? walletAddress;
}

function eventsInWindow(data: MacroMetricsDemoData, days: number): MacroWorkflowEvent[] {
  const since = data.generatedAt - days * DAY;
  return data.events.filter(
    (event) => event.timestamp >= since && event.timestamp <= data.generatedAt,
  );
}

export function buildTrend(
  events: readonly MacroWorkflowEvent[],
  days: number,
  generatedAt: number,
): TrendPoint[] {
  const start = generatedAt - (days - 1) * DAY;
  const byDay = new Map<string, { spendAtomic: string; txCount: number; wallets: Set<string> }>();

  for (let i = 0; i < days; i += 1) {
    byDay.set(dayKey(start + i * DAY), { spendAtomic: "0", txCount: 0, wallets: new Set() });
  }

  for (const event of events) {
    const key = dayKey(event.timestamp);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.spendAtomic = addAtomic(bucket.spendAtomic, event.spendAtomic);
    bucket.txCount += event.txCount;
    bucket.wallets.add(event.walletAddress);
  }

  return [...byDay.entries()].map(([day, bucket]) => ({
    day,
    spendAtomic: bucket.spendAtomic,
    txCount: bucket.txCount,
    walletCount: bucket.wallets.size,
  }));
}

export function buildMacroMetrics(data: MacroMetricsDemoData): MacroMetricsViewModel {
  const totalSpend = data.events.reduce((acc, event) => addAtomic(acc, event.spendAtomic), "0");
  const totalSpendBig = BigInt(totalSpend);
  const paidWallets = new Set(data.events.map((event) => event.walletAddress));
  const trend7d = buildTrend(data.events, 7, data.generatedAt);
  const trend30d = buildTrend(data.events, 30, data.generatedAt);

  const spendByWallet = new Map<string, bigint>();
  const sessionsByWallet = new Map<string, Set<string>>();
  for (const event of data.events) {
    spendByWallet.set(
      event.walletAddress,
      (spendByWallet.get(event.walletAddress) ?? 0n) + BigInt(event.spendAtomic),
    );
    const sessions = sessionsByWallet.get(event.walletAddress) ?? new Set<string>();
    sessions.add(event.sessionId);
    sessionsByWallet.set(event.walletAddress, sessions);
  }

  const rankedWallets = [...spendByWallet.entries()]
    .map(([walletAddress, spend]) => ({
      walletAddress,
      label: walletLabel(data, walletAddress),
      spendAtomic: spend.toString(),
      share: ratio(spend, totalSpendBig),
    }))
    .sort((left, right) => (BigInt(right.spendAtomic) > BigInt(left.spendAtomic) ? 1 : -1));

  let cumulative = 0n;
  let walletCountForHalfSpend = 0;
  for (const wallet of rankedWallets) {
    if (walletCountForHalfSpend > 0) break;
    cumulative += BigInt(wallet.spendAtomic);
    if (cumulative * 2n >= totalSpendBig) {
      walletCountForHalfSpend = rankedWallets.indexOf(wallet) + 1;
    }
  }

  const repeatedWalletSet = new Set(
    [...sessionsByWallet.entries()]
      .filter(([, sessions]) => sessions.size >= 2)
      .map(([wallet]) => wallet),
  );

  const bySegment = data.wallets.reduce<RepeatSummary["bySegment"]>((rows, wallet) => {
    const existing = rows.find((row) => row.segment === wallet.segment);
    const row = existing ?? {
      segment: wallet.segment,
      repeatedWallets: 0,
      totalWallets: 0,
      repeatRate: 0,
    };
    row.totalWallets += 1;
    if (repeatedWalletSet.has(wallet.address)) row.repeatedWallets += 1;
    row.repeatRate = row.totalWallets === 0 ? 0 : row.repeatedWallets / row.totalWallets;
    if (!existing) rows.push(row);
    return rows;
  }, []);

  const primaryWallets = new Set(
    data.events
      .filter((event) => event.serviceId === data.primaryProviderId)
      .map((event) => event.walletAddress),
  );
  const candidates = data.services
    .filter((service) => service.id !== data.primaryProviderId)
    .map((service): CoUsageProvider => {
      const sharedEvents = data.events.filter(
        (event) => event.serviceId === service.id && primaryWallets.has(event.walletAddress),
      );
      const sharedWallets = new Set(sharedEvents.map((event) => event.walletAddress));
      const sharedSpendAtomic = sharedEvents.reduce(
        (acc, event) => addAtomic(acc, event.spendAtomic),
        "0",
      );
      const sharedTxCount = sharedEvents.reduce((acc, event) => acc + event.txCount, 0);
      const confidence = primaryWallets.size === 0 ? 0 : sharedWallets.size / primaryWallets.size;
      return {
        serviceId: service.id,
        serviceName: service.name,
        sharedWallets: sharedWallets.size,
        sharedSpendAtomic,
        sharedTxCount,
        confidence,
        suggestedOwner:
          service.id === "vectormind" || service.id === "routezero"
            ? "Partnership lead"
            : "Growth PM",
        reason: `Shared by ${sharedWallets.size} Northwind wallets after price lookup workflows`,
      };
    })
    .sort((left, right) => {
      if (BigInt(right.sharedSpendAtomic) !== BigInt(left.sharedSpendAtomic)) {
        return BigInt(right.sharedSpendAtomic) > BigInt(left.sharedSpendAtomic) ? 1 : -1;
      }
      return right.sharedTxCount - left.sharedTxCount;
    });

  const endpointUsage = buildEndpointUsage(data);
  const endpointFlows = buildEndpointFlows(data);
  const sourceRankings = buildSourceRankings(data, repeatedWalletSet);
  const repeatedWallets = repeatedWalletSet.size;
  const averageSessionsPerRepeatedWallet =
    repeatedWallets === 0
      ? 0
      : [...repeatedWalletSet].reduce(
          (acc, wallet) => acc + (sessionsByWallet.get(wallet)?.size ?? 0),
          0,
        ) / repeatedWallets;

  return {
    generatedAt: data.generatedAt,
    overview: {
      paidActiveWallets: paidWallets.size,
      totalSpendAtomic: totalSpend,
      paidUsageTxCount: data.events.reduce((acc, event) => acc + event.txCount, 0),
      trend7d,
      trend30d,
      trend7dSpendAtomic: trend7d.reduce((acc, point) => addAtomic(acc, point.spendAtomic), "0"),
      trend30dSpendAtomic: trend30d.reduce((acc, point) => addAtomic(acc, point.spendAtomic), "0"),
    },
    spendConcentration: {
      topWalletShare: rankedWallets[0]?.share ?? 0,
      topThreeWalletShare: rankedWallets.slice(0, 3).reduce((acc, wallet) => acc + wallet.share, 0),
      walletCountForHalfSpend,
      rankedWallets,
    },
    repeatSummary: {
      repeatWalletRate: paidWallets.size === 0 ? 0 : repeatedWallets / paidWallets.size,
      repeatedWallets,
      totalWallets: paidWallets.size,
      averageSessionsPerRepeatedWallet,
      bySegment,
    },
    coUsageProviders: candidates,
    endpointUsage,
    endpointFlows,
    sourceRankings,
    recommendations: data.recommendations,
    executiveTakeaways: buildExecutiveTakeaways(
      data,
      candidates,
      repeatedWallets,
      paidWallets.size,
    ),
    proxyNote:
      "Demo data. P1/P2 lift, heatmap, reprice, and forest-plot style signals are directional proxies, not causal production measurements.",
  };
}

function buildEndpointUsage(data: MacroMetricsDemoData): EndpointUsage[] {
  const totalTx = data.events.reduce((acc, event) => acc + event.txCount, 0);
  const rows = new Map<
    MacroEndpointCategory,
    { txCount: number; spendAtomic: string; wallets: Set<string>; label: string }
  >();
  for (const event of data.events) {
    const row = rows.get(event.endpointCategory) ?? {
      txCount: 0,
      spendAtomic: "0",
      wallets: new Set<string>(),
      label: event.endpointLabel,
    };
    row.txCount += event.txCount;
    row.spendAtomic = addAtomic(row.spendAtomic, event.spendAtomic);
    row.wallets.add(event.walletAddress);
    rows.set(event.endpointCategory, row);
  }
  return [...rows.entries()]
    .map(([category, row]) => ({
      category,
      label: row.label,
      txCount: row.txCount,
      spendAtomic: row.spendAtomic,
      walletCount: row.wallets.size,
      share: totalTx === 0 ? 0 : row.txCount / totalTx,
    }))
    .sort((left, right) => right.txCount - left.txCount);
}

function buildEndpointFlows(data: MacroMetricsDemoData): EndpointFlow[] {
  const sessions = new Map<string, MacroWorkflowEvent[]>();
  for (const event of data.events) {
    const events = sessions.get(event.sessionId) ?? [];
    events.push(event);
    sessions.set(event.sessionId, events);
  }

  const flows = new Map<string, EndpointFlow>();
  let totalTransitions = 0;
  for (const events of sessions.values()) {
    const sorted = [...events].sort(
      (a, b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId),
    );
    for (let index = 1; index < sorted.length && index <= 2; index += 1) {
      const from = sorted[index - 1].endpointCategory;
      const to = sorted[index].endpointCategory;
      const fromStep = (index - 1) as 0 | 1;
      const toStep = index as 1 | 2;
      const key = `${fromStep}:${from}->${toStep}:${to}`;
      const row = flows.get(key) ?? { from, to, fromStep, toStep, occurrences: 0, share: 0 };
      row.occurrences += 1;
      flows.set(key, row);
      totalTransitions += 1;
    }
  }

  return [...flows.values()]
    .map((flow) => ({
      ...flow,
      share: totalTransitions === 0 ? 0 : flow.occurrences / totalTransitions,
    }))
    .sort((left, right) => right.occurrences - left.occurrences);
}

function buildSourceRankings(
  data: MacroMetricsDemoData,
  repeatedWalletSet: Set<string>,
): SourceRanking[] {
  const rows = new Map<
    string,
    { wallets: Set<string>; repeated: Set<string>; spendAtomic: string }
  >();
  for (const wallet of data.wallets) {
    const row = rows.get(wallet.source) ?? {
      wallets: new Set<string>(),
      repeated: new Set<string>(),
      spendAtomic: "0",
    };
    row.wallets.add(wallet.address);
    if (repeatedWalletSet.has(wallet.address)) row.repeated.add(wallet.address);
    rows.set(wallet.source, row);
  }
  for (const event of data.events) {
    const wallet = data.wallets.find((entry) => entry.address === event.walletAddress);
    if (!wallet) continue;
    const row = rows.get(wallet.source);
    if (!row) continue;
    row.spendAtomic = addAtomic(row.spendAtomic, event.spendAtomic);
  }
  return [...rows.entries()]
    .map(([source, row]) => ({
      source,
      wallets: row.wallets.size,
      repeatRate: row.wallets.size === 0 ? 0 : row.repeated.size / row.wallets.size,
      spendAtomic: row.spendAtomic,
    }))
    .sort((left, right) => (BigInt(right.spendAtomic) > BigInt(left.spendAtomic) ? 1 : -1));
}

function buildExecutiveTakeaways(
  data: MacroMetricsDemoData,
  candidates: CoUsageProvider[],
  repeatedWallets: number,
  totalWallets: number,
): string[] {
  const topCandidate = candidates[0];
  const repeatPct = totalWallets === 0 ? 0 : Math.round((repeatedWallets / totalWallets) * 100);
  return [
    `${repeatPct}% of paid wallets return to the same workflow, indicating agent-style usage rather than one-off lookup traffic.`,
    topCandidate
      ? `${topCandidate.serviceName} is the highest-impact adjacent service by shared spend and should receive owner follow-up.`
      : "No adjacent service candidate is dominant in this snapshot.",
    `${serviceName(data, data.primaryProviderId)} acts as the first step for trading and research workflows, making endpoint flow a better upsell signal than raw transactions alone.`,
  ];
}
