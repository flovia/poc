import type {
  CustomerInsightDto,
  CustomerProviderUsageDto,
  CustomerTimelineEventDto,
} from "@/lib/api/types";
import type { Sdk7dVolumePoint, SdkTimelineExtra } from "./types";

export type DemoSparkPattern = "rise" | "fall" | "spike" | "recover" | "steady";
export type DemoUpsell = "low" | "medium" | "high";

export type DemoPersona = {
  kind: "power" | "explorer" | "loyal" | "fading";
  providerCount: number;
  upsellOpportunity: DemoUpsell;
  activityGrowth: number;
  tags: string[];
  sparkPattern: DemoSparkPattern;
  multiChain: boolean;
  lastSeenOffsetDays: number;
};

const WEIGHTS: Record<DemoSparkPattern, readonly number[]> = {
  rise: [1, 2, 3, 4, 5, 7, 9],
  fall: [9, 7, 5, 4, 3, 2, 1],
  spike: [2, 2, 3, 10, 3, 2, 3],
  recover: [6, 4, 2, 1, 3, 6, 8],
  steady: [4, 5, 4, 5, 4, 5, 5],
};

export function companionChain(chain: string): string {
  if (chain === "solana") return "base";
  if (chain === "base" || chain === "base-sepolia") return "solana";
  if (chain === "polygon" || chain === "polygon-amoy") return "base";
  if (chain === "x-layer") return "solana";
  return "base";
}

export function personaForRank(rank: number, n: number): DemoPersona {
  if (n <= 0) {
    return {
      kind: "loyal",
      providerCount: 1,
      upsellOpportunity: "low",
      activityGrowth: 0,
      tags: [],
      sparkPattern: "steady",
      multiChain: false,
      lastSeenOffsetDays: 8,
    };
  }

  const t = n === 1 ? 0 : rank / (n - 1);

  if (rank === 0 || t <= 0.12) {
    return {
      kind: "power",
      providerCount: 3 + (rank % 3),
      upsellOpportunity: "high",
      activityGrowth: 0.62 + (rank % 5) * 0.18,
      tags: ["power user", "multi-homed"],
      sparkPattern: rank % 2 === 0 ? "rise" : "spike",
      multiChain: true,
      lastSeenOffsetDays: rank % 3,
    };
  }

  if (rank === 1 || t <= 0.34) {
    return {
      kind: "explorer",
      providerCount: 2,
      upsellOpportunity: "medium",
      activityGrowth: 0.16 + (rank % 4) * 0.07,
      tags: ["co-usage"],
      sparkPattern: rank % 3 === 0 ? "recover" : "rise",
      multiChain: false,
      lastSeenOffsetDays: 3 + (rank % 6),
    };
  }

  if (t >= 0.82) {
    return {
      kind: "fading",
      providerCount: rank % 4 === 0 ? 2 : 1,
      upsellOpportunity: "low",
      activityGrowth: -0.14 - (rank % 4) * 0.07,
      tags: rank % 2 === 0 ? ["at-risk"] : ["dormant"],
      sparkPattern: "fall",
      multiChain: false,
      lastSeenOffsetDays: 22 + (rank % 14),
    };
  }

  return {
    kind: "loyal",
    providerCount: 1,
    upsellOpportunity: rank % 6 === 0 ? "medium" : "low",
    activityGrowth: ((rank % 7) - 3) * 0.05,
    tags: [],
    sparkPattern: "steady",
    multiChain: false,
    lastSeenOffsetDays: 7 + (rank % 10),
  };
}

export function demoSpendUsd(rank: number, n: number, persona: DemoPersona): number {
  const x = n <= 1 ? 1 : (n - rank) / n;
  const boost = persona.kind === "power" ? 1.35 : persona.kind === "explorer" ? 1.05 : 0.82;
  return Math.round((2.4 + 6400 * boost * x ** 2.85) * 100) / 100;
}

export function demoCallCount(rank: number, n: number, persona: DemoPersona): number {
  const x = n <= 1 ? 1 : (n - rank) / n;
  const boost = persona.kind === "power" ? 1.4 : persona.kind === "fading" ? 0.55 : 1;
  return Math.max(1, Math.round(3 + 140 * boost * x ** 2.1));
}

export function sparklineFromPattern(
  pattern: DemoSparkPattern,
  lastSeenUnix: number,
  spendUsd: number,
  observationCount: number,
): Sdk7dVolumePoint[] {
  const weights = WEIGHTS[pattern];
  const weightSum = weights.reduce((acc, n) => acc + n, 0);
  const dayUtc = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(0, 10);
  return weights.map((weight, i) => {
    const observationCountPoint = Math.max(0, Math.round((observationCount * weight) / weightSum));
    return {
      day: dayUtc(lastSeenUnix - (6 - i) * 86400),
      observationCount: observationCountPoint,
      amountUsd: Math.round(((spendUsd * weight) / weightSum) * 100) / 100,
    };
  });
}

export function demoEndpoints(serviceId: string, persona: DemoPersona): string[] {
  const tail = serviceId.split("/").filter(Boolean).pop() ?? "api";
  const primary = `/${tail}`;
  if (persona.kind === "power") return [primary, `${primary}/stream`, `${primary}/history`];
  if (persona.kind === "explorer") return [primary, `${primary}/search`];
  return [primary];
}

export type DemoProviderPeer = {
  providerId: string;
  name: string;
  payToWallet: string;
};

export type DemoStory = {
  providers: CustomerProviderUsageDto[];
  timeline: CustomerTimelineEventDto[];
  timelineExtras: SdkTimelineExtra[];
  insights: CustomerInsightDto[];
};

const usdToAtomic = (usd: number): string => Math.round(Math.max(0.01, usd) * 1_000_000).toString();

export function demoEventCount(persona: DemoPersona, rank: number): number {
  if (persona.kind === "power") return 28 + (rank % 8);
  if (persona.kind === "explorer") return 16 + (rank % 5);
  if (persona.kind === "fading") return 6 + (rank % 3);
  return 11 + (rank % 4);
}

export function selectDemoPeers(
  homeServiceId: string,
  catalog: readonly DemoProviderPeer[],
  count: number,
  rank: number,
): DemoProviderPeer[] {
  const others = catalog.filter((peer) => peer.providerId !== homeServiceId);
  if (others.length === 0 || count <= 0) return [];
  const start = rank % others.length;
  return Array.from(
    { length: Math.min(count, others.length) },
    (_, i) => others[(start + i) % others.length]!,
  );
}

export function buildDemoStory(input: {
  persona: DemoPersona;
  rank: number;
  home: DemoProviderPeer;
  catalog: readonly DemoProviderPeer[];
  lastSeenUnix: number;
  firstSeenUnix: number;
  spendUsd: number;
  endpoints: string[];
}): DemoStory {
  const { persona, rank, home, catalog, lastSeenUnix, firstSeenUnix, spendUsd, endpoints } = input;
  const peers = selectDemoPeers(
    home.providerId,
    catalog,
    Math.max(0, persona.providerCount - 1),
    rank,
  );
  const actors = [home, ...peers];
  const eventCount = demoEventCount(persona, rank);
  const spacingHours =
    persona.kind === "power"
      ? 1.1
      : persona.kind === "explorer"
        ? 4.5
        : persona.kind === "fading"
          ? 28
          : 9;

  const timeline: CustomerTimelineEventDto[] = [];
  const timelineExtras: SdkTimelineExtra[] = [];
  const spendByProvider = new Map<string, number>();
  const txByProvider = new Map<string, number>();

  for (let i = 0; i < eventCount; i++) {
    const age = i * spacingHours * 3600 + (rank % 5) * 120;
    const timestamp = lastSeenUnix - age;
    const cycleId = Math.floor(i / Math.max(2, actors.length));
    const slot = i % (actors.length + 1);
    const isUpsell = persona.kind === "power" && i === 1;
    const isGrowth = i > 0 && i % 8 === 7;
    const actor = actors[slot % actors.length] ?? home;
    const endpoint = endpoints[i % endpoints.length] ?? endpoints[0] ?? "/api";
    const amountUsd = Math.max(
      0.04,
      (spendUsd * (eventCount - i)) / ((eventCount * (eventCount + 1)) / 2),
    );
    const txHash = `demo-${home.providerId}-${rank}-${i}`;

    if (isUpsell) {
      timeline.push({
        date: new Date(timestamp * 1000).toISOString(),
        timestamp,
        type: "upsell_signal",
        title: "Ready for a volume plan",
        description:
          "Repeated paid loops across overlapping APIs. Bundle before a competitor does.",
        providerId: home.providerId,
      });
      continue;
    }

    if (isGrowth) {
      timeline.push({
        date: new Date(timestamp * 1000).toISOString(),
        timestamp,
        type: "growth",
        title: persona.activityGrowth >= 0 ? "Call volume stepped up" : "Call volume cooled off",
        description:
          persona.activityGrowth >= 0
            ? "Workflow cadence held while spend accelerated."
            : "Same endpoints, fewer retries. Risk of silent churn.",
        providerId: home.providerId,
      });
      continue;
    }

    const isHomePayment = actor.providerId === home.providerId;
    timeline.push({
      date: new Date(timestamp * 1000).toISOString(),
      timestamp,
      type: isHomePayment ? "payment" : "provider_usage",
      title: actor.name,
      description: `${actor.name} · ${endpoint}`,
      amountAtomic: usdToAtomic(amountUsd),
      providerId: actor.providerId,
      txHash,
    });
    timelineExtras.push({
      txHash,
      apiPath: endpoint,
      amountUsd: Math.round(amountUsd * 100) / 100,
      cycleId,
      isSelfProvider: isHomePayment,
    });
    spendByProvider.set(actor.providerId, (spendByProvider.get(actor.providerId) ?? 0) + amountUsd);
    txByProvider.set(actor.providerId, (txByProvider.get(actor.providerId) ?? 0) + 1);
  }

  timeline.sort((left, right) => right.timestamp - left.timestamp);

  const providers: CustomerProviderUsageDto[] = actors.map((actor, index) => ({
    providerId: actor.providerId,
    name: actor.name,
    payToWallet: actor.payToWallet,
    spendAtomic: usdToAtomic(spendByProvider.get(actor.providerId) ?? spendUsd / actors.length),
    transactionCount: txByProvider.get(actor.providerId) ?? 1,
    firstSeenAt: firstSeenUnix + index * 3600,
    lastSeenAt: lastSeenUnix - index * 1800,
    apiPaths: index === 0 ? endpoints : [`/${actor.providerId.split("/").pop() ?? "api"}`],
  }));

  return {
    providers,
    timeline,
    timelineExtras,
    insights: demoInsights(persona, peers),
  };
}

function demoInsights(
  persona: DemoPersona,
  peers: readonly DemoProviderPeer[],
): CustomerInsightDto[] {
  const peerNames = peers
    .map((peer) => peer.name)
    .slice(0, 2)
    .join(" and ");
  if (persona.kind === "power") {
    return [
      {
        severity: "opportunity",
        title: "Multi-home whale",
        description: peerNames
          ? `High spend here and on ${peerNames}. Strong packaging / volume-plan candidate.`
          : "High spend across several providers. Strong upsell and packaging candidate.",
      },
      {
        severity: "info",
        title: "Looping paid workflow",
        description:
          "Payments land in tight cycles, not one-off calls. Treat as a recurring machine customer.",
      },
      {
        severity: "opportunity",
        title: "7d volume still accelerating",
        description:
          "Cadence is stable while ticket size is up. Lock in a plan before they shop around.",
      },
    ];
  }
  if (persona.kind === "explorer") {
    return [
      {
        severity: "opportunity",
        title: "Co-usage overlap",
        description: peerNames
          ? `Also paying ${peerNames}. Partnership or bundle signal.`
          : "Pays this API and at least one peer. Partnership or bundling signal.",
      },
      {
        severity: "info",
        title: "Comparing endpoints",
        description:
          "Call mix is spreading across search-style paths. They are still evaluating fit.",
      },
    ];
  }
  if (persona.kind === "fading") {
    return [
      {
        severity: "warning",
        title: "Going quiet",
        description: "Used to be active; last seen is slipping. Re-engage before they churn.",
      },
      {
        severity: "info",
        title: "Same path, fewer retries",
        description:
          "They did not switch endpoints. Volume just dropped. A win-back note can still work.",
      },
    ];
  }
  return [
    {
      severity: "info",
      title: "Steady regular",
      description: "Mostly loyal to this provider with a predictable call pattern.",
    },
  ];
}
