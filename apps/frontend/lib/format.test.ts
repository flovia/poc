import { describe, expect, test } from "bun:test";
import { formatUsd } from "./format";

describe("formatUsd", () => {
  test("formats whole-dollar display by default", () => {
    expect(formatUsd(1234.56)).toBe("$1,235");
  });

  test("can format a fixed number of fraction digits", () => {
    expect(formatUsd(1234.5, { fractionDigits: 2 })).toBe("$1,234.50");
  });

  test("falls back to zero for non-finite values", () => {
    expect(formatUsd(Number.NaN)).toBe("$0");
  });
});
