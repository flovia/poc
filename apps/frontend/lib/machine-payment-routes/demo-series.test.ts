import { describe, expect, test } from "bun:test";
import { buildDemoSeries, niceCeil } from "./demo-series";

describe("buildDemoSeries", () => {
  test("returns expected shape", () => {
    expect(buildDemoSeries("test-provider", "requests", 7)).toMatchSnapshot();
  });
});

describe("niceCeil", () => {
  test("returns minimum for zero", () => {
    expect(niceCeil(0)).toBe(1);
  });

  test("rounds up to next 2k boundary", () => {
    expect(niceCeil(1500)).toBe(2000);
  });

  test("rounds up to next decade", () => {
    expect(niceCeil(9999)).toBe(10000);
  });
});
