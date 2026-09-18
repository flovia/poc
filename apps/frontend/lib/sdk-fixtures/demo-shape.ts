import type { Sdk7dVolumePoint } from "./types";

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
