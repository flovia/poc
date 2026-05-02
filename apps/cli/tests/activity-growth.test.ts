import { describe, expect, test } from "bun:test";
import { computeActivityGrowth } from "../scripts/analytics/read-models";

describe("computeActivityGrowth", () => {
  test("returns 0 when no timestamps are available", () => {
    expect(computeActivityGrowth([])).toBe(0);
  });

  test("returns 0 when only a single observation exists (window cannot be split)", () => {
    expect(computeActivityGrowth(["2026-01-10T00:00:00.000Z"])).toBe(0);
  });

  test("returns 0 when all timestamps are identical", () => {
    expect(
      computeActivityGrowth([
        "2026-01-10T00:00:00.000Z",
        "2026-01-10T00:00:00.000Z",
        "2026-01-10T00:00:00.000Z",
      ]),
    ).toBe(0);
  });

  test("returns positive growth when recent half has more transactions than earlier half", () => {
    // span: Jan 1 → Jan 28, midpoint ≈ Jan 14.5.
    // earlier half: Jan 1, Jan 5 (count 2). recent half: Jan 25-28 (count 4).
    const ts = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-05T00:00:00.000Z",
      "2026-01-25T00:00:00.000Z",
      "2026-01-26T00:00:00.000Z",
      "2026-01-27T00:00:00.000Z",
      "2026-01-28T00:00:00.000Z",
    ];
    expect(computeActivityGrowth(ts)).toBeCloseTo(1, 5);
  });

  test("returns negative growth when activity slowed down in the recent half", () => {
    // span: Jan 1 → Jan 29, midpoint ≈ Jan 15.
    // earlier half: Jan 1-4 (count 4). recent half: Jan 29 (count 1). growth = -0.75.
    const ts = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
      "2026-01-29T00:00:00.000Z",
    ];
    expect(computeActivityGrowth(ts)).toBeCloseTo(-0.75, 5);
  });

  test("returns 0 when recent and earlier halves have equal counts", () => {
    // span: Jan 1 → Jan 29, midpoint = Jan 15.
    // earlier half: Jan 1, Jan 5 (count 2). recent half: Jan 25, Jan 29 (count 2).
    const ts = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-05T00:00:00.000Z",
      "2026-01-25T00:00:00.000Z",
      "2026-01-29T00:00:00.000Z",
    ];
    expect(computeActivityGrowth(ts)).toBe(0);
  });

  test("approaches but never reaches -1 when the recent half has only the latest observation", () => {
    // 7 earlier ticks (Jan 1-4 with duplicates) and a single recent anchor at Jan 30.
    // earlier = 7, recent = 1 → raw ratio = -6/7 ≈ -0.857.
    const ts = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
      "2026-01-30T00:00:00.000Z",
    ];
    const growth = computeActivityGrowth(ts);
    expect(growth).toBeCloseTo(-0.86, 2);
    expect(growth).toBeGreaterThan(-1);
  });

  test("clamps extreme growth to a sane upper bound", () => {
    const ts = ["2026-01-01T00:00:00.000Z"].concat(
      Array.from({ length: 100 }, (_, index) => {
        const day = String(15 + (index % 14)).padStart(2, "0");
        return `2026-01-${day}T00:00:00.000Z`;
      }),
    );
    const growth = computeActivityGrowth(ts);
    expect(growth).toBe(5);
  });

  test("ignores invalid timestamp strings without throwing", () => {
    // After filtering invalid: Jan 10 + Jan 20. span midpoint Jan 15.
    // earlier half: Jan 10. recent half: Jan 20. growth = 0.
    expect(
      computeActivityGrowth(["not-a-date", "2026-01-10T00:00:00.000Z", "2026-01-20T00:00:00.000Z"]),
    ).toBe(0);
  });

  test("rounds the returned growth to 2 decimals", () => {
    // earlier 3 vs recent 2 → ratio = -1/3 → rounded to -0.33.
    const ts = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
      "2026-01-25T00:00:00.000Z",
      "2026-01-26T00:00:00.000Z",
    ];
    const growth = computeActivityGrowth(ts);
    expect(Math.round(growth * 100) / 100).toBe(growth);
    expect(growth).toBe(-0.33);
  });
});
