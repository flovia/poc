import { describe, expect, test } from "bun:test";
import { compactUpsellSummary, formatUpsellExplanationModelName } from "./UpsellExplanationPanel";

describe("compactUpsellSummary", () => {
  test("preserves short titles", () => {
    expect(compactUpsellSummary("Strong upsell signal")).toBe("Strong upsell signal");
  });

  test("trims long summaries to a short title", () => {
    expect(
      compactUpsellSummary(
        "This wallet remains active and shows multi-provider usage, making it a strong upsell candidate.",
      ),
    ).toBe("This wallet remains active and shows multi-provider usage");
  });
});

describe("formatUpsellExplanationModelName", () => {
  test("formats modern Claude Sonnet model ids", () => {
    expect(
      formatUpsellExplanationModelName("global.anthropic.claude-sonnet-4-5-20250929-v1:0"),
    ).toBe("Claude Sonnet 4.5");
  });

  test("formats Claude 3.5 style model ids", () => {
    expect(formatUpsellExplanationModelName("anthropic.claude-3-5-sonnet-20241022-v2:0")).toBe(
      "Claude 3.5 Sonnet",
    );
  });

  test("falls back to the raw model id suffix when the pattern is unknown", () => {
    expect(formatUpsellExplanationModelName("provider.custom-model-v1")).toBe("Custom Model V1");
  });
});
