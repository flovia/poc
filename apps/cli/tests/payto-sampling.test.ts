import { describe, expect, test } from "bun:test";
import {
  buildPayToSamplingPlan,
  toActivityTier,
  type PayToCensusRow,
} from "../scripts/analytics/sampling";

const sink = (
  payTo: string,
  transactionCount: number,
  mappingPattern: PayToCensusRow["mappingPattern"] = "one_payto_one_endpoint",
): PayToCensusRow => ({
  network: "base",
  asset: "USDC",
  payTo,
  transactionCount,
  uniqueSenderCount: Math.max(1, transactionCount),
  totalVolumeAtomic: `${transactionCount * 100}`,
  mappingPattern,
  serviceId: `service-${payTo.slice(-2)}`,
});

describe("payTo sampling", () => {
  test("assigns activity tiers", () => {
    expect([0, 1, 2, 6, 21, 101, 1001].map(toActivityTier)).toEqual([
      "0",
      "1",
      "2-5",
      "6-20",
      "21-100",
      "101-1000",
      "1000+",
    ]);
  });

  test("includes mandatory coingecko payTos and records selection reasons", () => {
    const coingecko = "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784";
    const plan = buildPayToSamplingPlan({
      seed: "demo-seed",
      census: [sink(coingecko, 1500), sink("0x2222222222222222222222222222222222222222", 0)],
      mandatoryPayTos: [{ network: "base", asset: "USDC", payTo: coingecko }],
      budget: { total: 2 },
    });

    expect(plan.selected.find((row) => row.payTo === coingecko)).toMatchObject({
      activityTier: "1000+",
      selectionReasons: expect.arrayContaining(["mandatory"]),
    });
  });

  test("samples activity tiers, mapping patterns, and long-tail rows deterministically", () => {
    const census = [
      sink("0x0000000000000000000000000000000000000001", 0, "unresolved_payto"),
      sink("0x0000000000000000000000000000000000000002", 1, "one_payto_one_endpoint"),
      sink("0x0000000000000000000000000000000000000003", 4, "one_payto_many_endpoints"),
      sink("0x0000000000000000000000000000000000000004", 12, "many_paytos_one_service"),
      sink("0x0000000000000000000000000000000000000005", 55, "one_payto_one_endpoint"),
      sink("0x0000000000000000000000000000000000000006", 900, "one_payto_many_endpoints"),
    ];
    const input = {
      seed: "fixed-seed",
      census,
      budget: {
        total: 5,
        perActivityTier: { "0": 1, "6-20": 1 },
        perMappingPattern: { one_payto_many_endpoints: 1, unresolved_payto: 1 },
        longTail: 1,
      },
    } as const;

    const first = buildPayToSamplingPlan(input);
    const second = buildPayToSamplingPlan(input);

    expect(second.selected).toEqual(first.selected);
    expect(first.selected.some((row) => row.activityTier === "0")).toBe(true);
    expect(first.selected.some((row) => row.mappingPattern === "one_payto_many_endpoints")).toBe(
      true,
    );
    expect(first.selected.some((row) => row.selectionReasons.includes("long_tail"))).toBe(true);
    expect(first.selected.every((row) => row.supportingReasons.length > 0)).toBe(true);
  });
});
