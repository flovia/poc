import { describe, expect, test } from "bun:test";
import { normalizeCollectorTransferAmount } from "../../src/collectors/types.js";

describe("collector transfer contracts", () => {
  test("normalizes bigint transfer amounts into decimal strings", () => {
    expect(normalizeCollectorTransferAmount(123n)).toBe("123");
  });

  test("keeps string transfer amounts intact", () => {
    expect(normalizeCollectorTransferAmount("1000000")).toBe("1000000");
  });
});
