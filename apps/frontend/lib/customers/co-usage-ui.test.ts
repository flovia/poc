import { describe, expect, test } from "bun:test";
import { opportunityChipClass, opportunityLabel } from "./co-usage-ui";

describe("co-usage opportunity display helpers", () => {
  test.each([
    ["high", "chip blue", "High"],
    ["medium", "chip teal", "Medium"],
    ["low", "chip mute", "Low"],
  ] as const)("maps %s opportunity display", (level, className, label) => {
    expect(opportunityChipClass(level)).toBe(className);
    expect(opportunityLabel(level)).toBe(label);
  });
});
