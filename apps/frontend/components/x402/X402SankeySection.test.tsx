import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { X402_CATEGORY_DEFINITIONS, buildX402MockDataset } from "@/lib/x402-analysis/mock-data";
import { buildX402AnalysisViewModel } from "@/lib/x402-analysis/transform";
import { X402SankeySection } from "./X402SankeySection";

describe("X402SankeySection", () => {
  test("renders both sankey chart headings for embedded use", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const viewModel = buildX402AnalysisViewModel({
      endpoint_master: dataset.endpoint_master,
      request_events: dataset.x402_request_events,
      sankey_flows_daily: dataset.sankey_flows_daily,
      category_definitions: X402_CATEGORY_DEFINITIONS,
    });

    const html = renderToStaticMarkup(
      <X402SankeySection
        viewModel={viewModel}
        eyebrow="x402 analysis"
        title="Embedded sankey views"
        description="Inline sankey charts for the co-usage page."
      />,
    );

    expect(html).toContain("Embedded sankey views");
    expect(html).toContain("Source route → payment rail → API workflow/paid endpoint");
    expect(html).toContain("Previous endpoint → target endpoint → next endpoint");
  });
});
