import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EntryPointInsight, UpsellCard } from "./Insights";

const metrics = {
  spendAtomic: "10005000",
  activityGrowth: 0,
  freeTierProgress: 0.3,
  entryPointRatio: 1,
  upsellOpportunity: "high" as const,
};

describe("wallet insight copy", () => {
  test("describes live attribution as payTo/provider coverage, not exact workflow position", () => {
    const html = renderToStaticMarkup(
      <EntryPointInsight metrics={metrics} dataMode="onChainOnly" sdkExtras={null} />,
    );

    expect(html).toContain("Attribution coverage");
    expect(html).toContain("known payTo/provider candidate");
    expect(html).toContain("Exact workflow position and endpoint attribution require SDK instrumentation");
  });

  test("describes live upsell heuristic as payment activity", () => {
    const html = renderToStaticMarkup(
      <UpsellCard address="0x1111111111111111111111111111111111111111" metrics={metrics} dataMode="onChainOnly" sdkExtras={null} />,
    );

    expect(html).toContain("Activity signal");
    expect(html).toContain("High payment activity");
    expect(html).toContain("not a commercial plan limit");
  });
});
