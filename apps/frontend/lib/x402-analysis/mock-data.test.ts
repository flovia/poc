import { describe, expect, test } from "bun:test";
import { X402_CATEGORY_DEFINITIONS, X402_FLOW_BLUEPRINTS, buildX402MockDataset } from "./mock-data";
import { buildX402AnalysisViewModel, buildX402SankeyLayout } from "./transform";

describe("buildX402MockDataset", () => {
  test("builds seven daily sankey rows per representative flow", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    expect(dataset.sankey_flows_daily).toHaveLength(7 * X402_FLOW_BLUEPRINTS.length);
    expect(dataset.x402_request_events.length).toBeGreaterThan(dataset.sankey_flows_daily.length);
    expect(dataset.endpoint_master.length).toBeGreaterThanOrEqual(10);
    expect(dataset.sankey_flows_daily[0]?.date).toBe("2026-04-25");
  });

  test("emits before-target, target, and after-target request stages", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const workflowEvents = dataset.x402_request_events.filter(
      (event) => event.workflow_id === dataset.x402_request_events[0]?.workflow_id,
    );

    expect(workflowEvents.some((event) => event.workflow_stage === "before_target")).toBe(true);
    expect(workflowEvents.some((event) => event.workflow_stage === "target")).toBe(true);
    expect(workflowEvents.some((event) => event.workflow_stage === "after_target")).toBe(true);
  });

  test("includes the representative intermediary flows requested by the dashboard", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const flowKeys = new Set(
      dataset.sankey_flows_daily.map(
        (row) => `${row.from_category} → ${row.api_intermediary} → ${row.to_category}`,
      ),
    );

    expect(flowKeys).toContain("Extract → PayRouter A → Analyze");
    expect(flowKeys).toContain("Extract → PayRouter B → Search");
    expect(flowKeys).toContain("Search → PayRouter A → Analyze");
    expect(flowKeys).toContain("Search → DataBridge X → Transact");
    expect(flowKeys).toContain("Analyze → PayRouter A → Transact");
    expect(flowKeys).toContain("Analyze → AgentAPI Hub → Search");
    expect(flowKeys).toContain("Transact → Commerce Facilitator → Analyze");
    expect(flowKeys).toContain("Extract → DataBridge X → Transact");
    expect(flowKeys).toContain("Search → Commerce Facilitator → Transact");
    expect(flowKeys).toContain("Analyze → DataBridge X → Extract");
  });
});

describe("buildX402AnalysisViewModel", () => {
  test("computes dashboard aggregates from the mock tables", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const viewModel = buildX402AnalysisViewModel({
      endpoint_master: dataset.endpoint_master,
      request_events: dataset.x402_request_events,
      sankey_flows_daily: dataset.sankey_flows_daily,
      category_definitions: X402_CATEGORY_DEFINITIONS,
    });

    expect(viewModel.period_label).toBe("2026-04-25 to 2026-05-01");
    expect(viewModel.request_events_sample).toHaveLength(16);
    expect(viewModel.intermediary_summary[0]?.settled_usdc).toBeGreaterThan(
      viewModel.intermediary_summary[1]?.settled_usdc ?? 0,
    );
    expect(viewModel.totals.flow_count).toBeGreaterThan(0);
    expect(viewModel.sankey_patterns).toHaveLength(2);
    expect(
      viewModel.category_definitions.map((item) => item.display_label ?? item.category),
    ).toEqual(["Market data", "Signal lookup", "AI inference", "DEX execution & alerts"]);
  });

  test("builds both sankey patterns requested by the dashboard", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const viewModel = buildX402AnalysisViewModel({
      endpoint_master: dataset.endpoint_master,
      request_events: dataset.x402_request_events,
      sankey_flows_daily: dataset.sankey_flows_daily,
      category_definitions: X402_CATEGORY_DEFINITIONS,
    });

    const intentPattern = viewModel.sankey_patterns.find(
      (pattern) => pattern.id === "intent_intermediary_target_category",
    );
    const endpointPattern = viewModel.sankey_patterns.find(
      (pattern) => pattern.id === "endpoint_sequence",
    );

    expect(
      intentPattern?.flows.some(
        (flow) =>
          flow.left_label === "Monitor hourly market loop" &&
          flow.middle_label === "PayRouter A" &&
          flow.right_label === "AI inference" &&
          flow.right_detail?.includes("VectorMind AI"),
      ),
    ).toBe(true);
    expect(
      endpointPattern?.flows.some(
        (flow) =>
          flow.left_label === "Price history" &&
          flow.middle_label === "Trade thesis" &&
          flow.right_label === "Quote & swap" &&
          flow.left_detail === "Northwind Price API · /v1/price/history?pair=ETH-USD&window=1h" &&
          flow.middle_detail === "VectorMind AI · /v1/responses" &&
          flow.right_detail === "RouteZero DEX · /quote-and-swap",
      ),
    ).toBe(true);
    expect(new Set(intentPattern?.flows.map((flow) => flow.left_label) ?? []).size).toBe(4);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.left_label) ?? []).size,
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.left_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.middle_label) ?? []).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.middle_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.right_label) ?? []).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.right_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
  });

  test("buildX402SankeyLayout prefixes node ids by layer and emits link segments", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const viewModel = buildX402AnalysisViewModel({
      endpoint_master: dataset.endpoint_master,
      request_events: dataset.x402_request_events,
      sankey_flows_daily: dataset.sankey_flows_daily,
      category_definitions: X402_CATEGORY_DEFINITIONS,
    });
    const layout = buildX402SankeyLayout(viewModel.sankey_patterns[0]?.flows ?? [], "flow_count");

    expect(layout.nodes.some((node) => node.id.startsWith("left:"))).toBe(true);
    expect(layout.nodes.some((node) => node.id.startsWith("mid:"))).toBe(true);
    expect(layout.nodes.some((node) => node.id.startsWith("right:"))).toBe(true);
    expect(layout.links.some((link) => link.id.endsWith("::right"))).toBe(true);
  });

  test("centers small flows vertically within each node", () => {
    const layout = buildX402SankeyLayout(
      [
        {
          left_label: "Heavy before",
          middle_label: "Heavy target",
          right_label: "Heavy after",
          flow_count: 100,
          paid_count: 100,
          settled_usdc: 100,
          success_rate: 1,
          p95_latency_ms: 100,
          error_rate: 0,
          network: "base",
        },
        {
          left_label: "Before",
          middle_label: "Target",
          right_label: "After",
          flow_count: 1,
          paid_count: 1,
          settled_usdc: 1,
          success_rate: 1,
          p95_latency_ms: 100,
          error_rate: 0,
          network: "base",
        },
      ],
      "flow_count",
    );

    const leftNode = layout.nodes.find((node) => node.id === "left:Before");
    const midNode = layout.nodes.find((node) => node.id === "mid:Target");
    const rightNode = layout.nodes.find((node) => node.id === "right:After");
    const leftMid = layout.links.find((link) => link.id === "Before|Target|After");
    const midRight = layout.links.find((link) => link.id === "Before|Target|After::right");

    expect(leftNode).toBeDefined();
    expect(midNode).toBeDefined();
    expect(rightNode).toBeDefined();
    expect(leftMid).toBeDefined();
    expect(midRight).toBeDefined();
    expect(leftMid?.fromY).toBeCloseTo((leftNode?.y ?? 0) + (leftNode?.height ?? 0) / 2, 4);
    expect(leftMid?.toY).toBeCloseTo((midNode?.y ?? 0) + (midNode?.height ?? 0) / 2, 4);
    expect(midRight?.fromY).toBeCloseTo((midNode?.y ?? 0) + (midNode?.height ?? 0) / 2, 4);
    expect(midRight?.toY).toBeCloseTo((rightNode?.y ?? 0) + (rightNode?.height ?? 0) / 2, 4);
  });

  test("keeps all sankey nodes inside the chart viewport", () => {
    const dataset = buildX402MockDataset(new Date("2026-05-01T12:00:00.000Z"));
    const width = 1220;
    const height = 560;
    const viewModel = buildX402AnalysisViewModel({
      endpoint_master: dataset.endpoint_master,
      request_events: dataset.x402_request_events,
      sankey_flows_daily: dataset.sankey_flows_daily,
      category_definitions: X402_CATEGORY_DEFINITIONS,
    });
    const layout = buildX402SankeyLayout(
      viewModel.sankey_patterns[1]?.flows ?? [],
      "flow_count",
      width,
      height,
    );

    expect(Math.min(...layout.nodes.map((node) => node.y))).toBeGreaterThanOrEqual(40);
    expect(
      Math.max(...layout.nodes.map((node) => node.y + Math.max(24, node.height))),
    ).toBeLessThanOrEqual(520);
    expect(Math.max(...layout.nodes.map((node) => node.x + node.width))).toBeLessThanOrEqual(width);
  });
});
