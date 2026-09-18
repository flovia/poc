import { describe, expect, test } from "bun:test";
import { computeProviderSpread } from "@/lib/customers/overview";
import {
  companionChain,
  demoCallCount,
  demoSpendUsd,
  personaForRank,
  sparklineFromPattern,
} from "./demo-shape";

describe("demo persona shaping", () => {
  test("spreads a QuickNode-sized cohort across 1 / 2 / 3+ providers", () => {
    const n = 92;
    const customers = Array.from({ length: n }, (_, rank) => ({
      providerCount: personaForRank(rank, n).providerCount,
      spendAtomic: "1",
      lastSeenAt: 0,
      observationCount: 1,
      address: `0x${rank}`,
      label: null,
      activityGrowth: 0,
      upsellOpportunity: "low" as const,
      provenance: "demo_label" as const,
      provenanceByField: {},
      reasons: [],
    }));
    const spread = computeProviderSpread(customers);
    const one = spread.buckets.find((bucket) => bucket.label === "1 provider")?.count ?? 0;
    const two = spread.buckets.find((bucket) => bucket.label === "2 providers")?.count ?? 0;
    const three = spread.buckets.find((bucket) => bucket.label === "3+ providers")?.count ?? 0;
    expect(two).toBeGreaterThan(10);
    expect(three).toBeGreaterThan(5);
    expect(one).toBeGreaterThan(two);
    expect(one + two + three).toBe(92);
  });

  test("keeps a small Nansen-sized cohort mixed instead of all-loyal", () => {
    const n = 7;
    const counts = Array.from({ length: n }, (_, rank) => personaForRank(rank, n).providerCount);
    expect(counts.some((count) => count >= 3)).toBe(true);
    expect(counts.filter((count) => count === 2).length).toBeGreaterThan(0);
    expect(counts.filter((count) => count === 1).length).toBeGreaterThan(0);
  });

  test("gives whales more spend and a rising sparkline", () => {
    const whale = personaForRank(0, 92);
    const tail = personaForRank(90, 92);
    expect(whale.kind).toBe("power");
    expect(whale.upsellOpportunity).toBe("high");
    expect(demoSpendUsd(0, 92, whale)).toBeGreaterThan(2000);
    expect(demoSpendUsd(90, 92, tail)).toBeLessThan(50);
    expect(demoCallCount(0, 92, whale)).toBeGreaterThan(demoCallCount(90, 92, tail));
    const spark = sparklineFromPattern("rise", 1_777_366_800, 100, 20);
    expect(spark).toHaveLength(7);
    expect(spark[6]!.observationCount).toBeGreaterThan(spark[0]!.observationCount);
  });

  test("pairs Solana power users with Base for multi-chain stories", () => {
    expect(companionChain("solana")).toBe("base");
    expect(companionChain("base")).toBe("solana");
  });
});
