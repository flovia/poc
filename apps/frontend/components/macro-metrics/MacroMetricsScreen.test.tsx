import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MACRO_METRICS_DEMO_DATA } from "@/lib/macro-metrics/demo";
import { buildMacroMetrics } from "@/lib/macro-metrics/metrics";
import { MacroMetricsScreen } from "./MacroMetricsScreen";

describe("MacroMetricsScreen", () => {
  test("keeps the original endpoint sankey and places the route-quality sankey at the end", () => {
    const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

    const html = renderToStaticMarkup(
      <MacroMetricsScreen metrics={metrics} providerId="northwind-price" />,
    );

    expect(html).toContain("Endpoint category flow");
    expect(html).toContain("Initial Query → Intermediary → Downstream API");
    expect(html.indexOf("Recommended plays")).toBeLessThan(
      html.indexOf("Initial Query → Intermediary → Downstream API"),
    );
  });
});
