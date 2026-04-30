import { describe, expect, test } from "bun:test";
import type { EvidenceLabel } from "@/lib/api/types";
import { selectReasonsForField, buildBadgeAriaLabel } from "./ProvenanceBadge";

const onchain: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "onchain transfer",
  description: "USDC transfer observed on Base.",
  sourceFields: ["spendAtomic", "observationCount"],
};

const upsellHypothesis: EvidenceLabel = {
  provenance: "derived_insight",
  label: "co-usage",
  description: "Frequent co-usage with peer providers.",
  sourceFields: ["upsellOpportunity"],
};

const generalReason: EvidenceLabel = {
  provenance: "demo_label",
  label: "demo dataset",
};

describe("selectReasonsForField", () => {
  test("returns reasons whose sourceFields include the field", () => {
    const result = selectReasonsForField(
      [onchain, upsellHypothesis, generalReason],
      "upsellOpportunity",
    );
    expect(result.map((r) => r.label)).toEqual(["co-usage", "demo dataset"]);
  });

  test("includes reasons without sourceFields (treated as global)", () => {
    const result = selectReasonsForField([generalReason], "activityGrowth");
    expect(result).toEqual([generalReason]);
  });

  test("excludes reasons whose sourceFields target a different field", () => {
    const result = selectReasonsForField([onchain], "upsellOpportunity");
    expect(result).toEqual([]);
  });

  test("returns empty when reasons is undefined", () => {
    expect(selectReasonsForField(undefined, "upsellOpportunity")).toEqual([]);
  });
});

describe("buildBadgeAriaLabel", () => {
  test("includes field name and full provenance label", () => {
    const aria = buildBadgeAriaLabel("Derived insight (hypothesis)", "upsellOpportunity", []);
    expect(aria).toBe("upsellOpportunity provenance: Derived insight (hypothesis)");
  });

  test("appends reason labels and descriptions", () => {
    const aria = buildBadgeAriaLabel("Derived insight (hypothesis)", "upsellOpportunity", [
      upsellHypothesis,
    ]);
    expect(aria).toContain("co-usage");
    expect(aria).toContain("Frequent co-usage with peer providers.");
  });

  test("falls back to generic label when field is undefined", () => {
    const aria = buildBadgeAriaLabel("Onchain fact", undefined, []);
    expect(aria).toBe("Provenance: Onchain fact");
  });
});
