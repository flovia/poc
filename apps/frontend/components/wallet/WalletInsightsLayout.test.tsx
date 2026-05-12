import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletInsightsLayout } from "./WalletInsightsLayout";

describe("WalletInsightsLayout", () => {
  test("places workflow, recent activity, and opportunity on the upper row and upsell below", () => {
    const html = renderToStaticMarkup(
      <WalletInsightsLayout
        workflow={<div>workflow-card</div>}
        recentActivity={<div>recent-card</div>}
        opportunity={<div>opportunity-card</div>}
        upsell={<div>upsell-card</div>}
      />,
    );

    expect(html).toContain('data-layout-row="insight-summary"');
    expect(html).toContain(
      "grid-template-columns:repeat(3, minmax(0, 1fr));gap:clamp(14px, calc((100% - 54rem) / 2), 56px);align-items:stretch",
    );
    expect(html).toContain('data-layout-row="upsell-focus"');
    expect(html).toContain("grid-template-columns:minmax(0, 1fr);gap:14px;align-items:stretch");
    expect(html.indexOf("workflow-card")).toBeLessThan(html.indexOf("recent-card"));
    expect(html.indexOf("recent-card")).toBeLessThan(html.indexOf("opportunity-card"));
    expect(html.indexOf("opportunity-card")).toBeLessThan(html.indexOf("upsell-card"));
  });
});
