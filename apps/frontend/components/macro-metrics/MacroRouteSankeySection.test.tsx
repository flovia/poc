import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MACRO_METRICS_DEMO_DATA } from "@/lib/macro-metrics/demo";
import { buildMacroMetrics } from "@/lib/macro-metrics/metrics";
import { MacroRouteSankeySection } from "./MacroRouteSankeySection";

describe("MacroRouteSankeySection", () => {
  test("renders the route quality sankey copy and metric toggles", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

    const html = renderToStaticMarkup(
      <MacroRouteSankeySection chart={metrics.routeSankey} periodLabel="Last 30 days demo" />,
    );

    expect(html).toContain("Initial Query → Intermediary → Downstream API");
    expect(html).toContain("API workflow paths");
    expect(html).toContain("Request count");
    expect(html).toContain("Settled USDC");
  });
});
