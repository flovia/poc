import { describe, expect, test } from "bun:test";
import type { CustomerListItemDto } from "@/lib/api/types";
import {
  computeParetoCurve,
  computeProviderSpread,
  computeRecencyMatrix,
  type RecencyMatrix,
} from "./overview";

const baseProvenance = {
  provenance: "onchain_fact" as const,
  provenanceByField: {} as Record<string, "onchain_fact">,
  reasons: [] as never[],
};

const make = (
  overrides: Partial<CustomerListItemDto> & { address: string },
): CustomerListItemDto => ({
  label: null,
  observationCount: 0,
  spendAtomic: "0",
  providerCount: 0,
  lastSeenAt: 0,
  activityGrowth: 0,
  upsellOpportunity: "low",
  ...baseProvenance,
  ...overrides,
});

describe("computeParetoCurve", () => {
  test("returns empty curve when there are no customers", () => {
    expect(computeParetoCurve([])).toEqual({
      points: [],
      totalSpendAtomic: "0",
      totalWallets: 0,
      walletShareForHalfSpend: null,
    });
  });

  test("orders wallets by spend descending and reports cumulative shares", () => {
    const customers = [
      make({ address: "0x1", spendAtomic: "10" }),
      make({ address: "0x2", spendAtomic: "70" }),
      make({ address: "0x3", spendAtomic: "20" }),
    ];

    const curve = computeParetoCurve(customers);

    expect(curve.totalWallets).toBe(3);
    expect(curve.totalSpendAtomic).toBe("100");
    expect(curve.points).toHaveLength(3);
    expect(curve.points[0]).toMatchObject({ walletShare: 1 / 3, spendShare: 0.7 });
    expect(curve.points[1]).toMatchObject({ walletShare: 2 / 3, spendShare: 0.9 });
    expect(curve.points[2]).toMatchObject({ walletShare: 1, spendShare: 1 });
  });

  test("walletShareForHalfSpend reports the smallest wallet share covering 50% of spend", () => {
    const customers = [
      make({ address: "0x1", spendAtomic: "70" }),
      make({ address: "0x2", spendAtomic: "30" }),
    ];

    const curve = computeParetoCurve(customers);

    expect(curve.walletShareForHalfSpend).toBe(0.5);
  });

  test("handles BigInt-scale totals safely", () => {
    const big = "100000000000000000000";
    const customers = [
      make({ address: "0x1", spendAtomic: big }),
      make({ address: "0x2", spendAtomic: big }),
    ];

    const curve = computeParetoCurve(customers);

    expect(curve.totalSpendAtomic).toBe("200000000000000000000");
    expect(curve.points.map((p) => p.spendShare)).toEqual([0.5, 1]);
  });

  test("returns null walletShareForHalfSpend when total spend is zero", () => {
    const customers = [
      make({ address: "0x1", spendAtomic: "0" }),
      make({ address: "0x2", spendAtomic: "0" }),
    ];

    const curve = computeParetoCurve(customers);

    expect(curve.totalSpendAtomic).toBe("0");
    expect(curve.walletShareForHalfSpend).toBeNull();
  });
});

describe("computeRecencyMatrix", () => {
  const NOW_SEC = 1_700_000_000;

  test("buckets customers by recent/stale × high/low spend using medians", () => {
    const recent = NOW_SEC - 60 * 60;
    const old = NOW_SEC - 30 * 24 * 60 * 60;
    const customers = [
      make({ address: "0x1", spendAtomic: "100", lastSeenAt: recent }),
      make({ address: "0x2", spendAtomic: "10", lastSeenAt: recent }),
      make({ address: "0x3", spendAtomic: "200", lastSeenAt: old }),
      make({ address: "0x4", spendAtomic: "5", lastSeenAt: old }),
    ];

    const matrix: RecencyMatrix = computeRecencyMatrix(customers);

    expect(matrix.cells.recentHigh).toBe(1);
    expect(matrix.cells.recentLow).toBe(1);
    expect(matrix.cells.staleHigh).toBe(1);
    expect(matrix.cells.staleLow).toBe(1);
    expect(matrix.totalWallets).toBe(4);
  });

  test("returns empty matrix for no customers", () => {
    const matrix = computeRecencyMatrix([]);
    expect(matrix.totalWallets).toBe(0);
    expect(matrix.cells.recentHigh).toBe(0);
    expect(matrix.cells.recentLow).toBe(0);
    expect(matrix.cells.staleHigh).toBe(0);
    expect(matrix.cells.staleLow).toBe(0);
  });

  test("treats wallets at the median as recent/high (inclusive upper bucket)", () => {
    const customers = [
      make({ address: "0x1", spendAtomic: "10", lastSeenAt: 100 }),
      make({ address: "0x2", spendAtomic: "10", lastSeenAt: 100 }),
    ];
    const matrix = computeRecencyMatrix(customers);
    expect(
      matrix.cells.recentHigh + matrix.cells.recentLow + matrix.cells.staleHigh + matrix.cells.staleLow,
    ).toBe(2);
  });

  // 偶数件で中央 2 値の和が奇数 (= 平均が小数) になる場合、bigint 切り捨てによって
  // 境界判定が壊れていないことを保証する。spend [1, 2] の median は 1.5 相当なので
  // spend=1 は low, spend=2 は high にならなければならない。
  test("handles even-count median with non-integer mean correctly", () => {
    const customers = [
      make({ address: "0x1", spendAtomic: "1", lastSeenAt: 100 }),
      make({ address: "0x2", spendAtomic: "2", lastSeenAt: 100 }),
    ];
    const matrix = computeRecencyMatrix(customers);
    expect(matrix.cells.recentHigh).toBe(1);
    expect(matrix.cells.recentLow).toBe(1);
    expect(matrix.cells.staleHigh).toBe(0);
    expect(matrix.cells.staleLow).toBe(0);
  });
});

describe("computeProviderSpread", () => {
  test("buckets customers into 1, 2, 3+ provider counts", () => {
    const customers = [
      make({ address: "0x1", providerCount: 1 }),
      make({ address: "0x2", providerCount: 1 }),
      make({ address: "0x3", providerCount: 2 }),
      make({ address: "0x4", providerCount: 5 }),
      make({ address: "0x5", providerCount: 9 }),
    ];

    const spread = computeProviderSpread(customers);

    expect(spread.totalWallets).toBe(5);
    expect(spread.buckets).toEqual([
      { label: "1 provider", count: 2, share: 0.4 },
      { label: "2 providers", count: 1, share: 0.2 },
      { label: "3+ providers", count: 2, share: 0.4 },
    ]);
  });

  test("handles zero customers", () => {
    const spread = computeProviderSpread([]);
    expect(spread.totalWallets).toBe(0);
    expect(spread.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
  });

  test("surfaces a 'No providers' bucket when providerCount is zero", () => {
    const customers = [
      make({ address: "0x1", providerCount: 0 }),
      make({ address: "0x2", providerCount: 1 }),
      make({ address: "0x3", providerCount: 1 }),
    ];
    const spread = computeProviderSpread(customers);
    expect(spread.totalWallets).toBe(3);
    const labels = spread.buckets.map((b) => b.label);
    expect(labels).toContain("No providers");
    const noBucket = spread.buckets.find((b) => b.label === "No providers");
    expect(noBucket).toEqual({ label: "No providers", count: 1, share: 1 / 3 });
    const oneBucket = spread.buckets.find((b) => b.label === "1 provider");
    expect(oneBucket).toEqual({ label: "1 provider", count: 2, share: 2 / 3 });
  });

  test("omits the 'No providers' bucket when no zero-provider wallets exist", () => {
    const customers = [
      make({ address: "0x1", providerCount: 1 }),
      make({ address: "0x2", providerCount: 2 }),
    ];
    const spread = computeProviderSpread(customers);
    expect(spread.buckets.map((b) => b.label)).toEqual([
      "1 provider",
      "2 providers",
      "3+ providers",
    ]);
  });
});
