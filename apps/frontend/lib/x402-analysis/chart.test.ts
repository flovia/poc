import { describe, expect, test } from "bun:test";
import {
  filterSankeyRowsByFlowCount,
  getSankeyLabelPillHeights,
  getSankeyLabelPillWidth,
  getSankeyLabelRenderPosition,
  formatSankeyMetricValue,
  getSankeyLabelLayout,
  getSankeyTooltipPosition,
  getSankeyTooltipWidth,
  getSankeyVisibleLinkWidth,
} from "./chart";

describe("formatSankeyMetricValue", () => {
  test("formats flow count labels with units", () => {
    expect(formatSankeyMetricValue("flow_count", 3078)).toBe("3,078 flows");
  });

  test("formats USDC labels as currency", () => {
    expect(formatSankeyMetricValue("settled_usdc", 532.4)).toBe("$532.40");
  });
});

describe("filterSankeyRowsByFlowCount", () => {
  test("keeps only rows above the minimum flow-count threshold", () => {
    expect(
      filterSankeyRowsByFlowCount(
        [
          { id: "low-1", flow_count: 1 },
          { id: "low-2", flow_count: 2 },
          { id: "keep", flow_count: 3 },
          { id: "keep-big", flow_count: 7 },
        ],
        { minFlowCountExclusive: 2 },
      ).map((row) => row.id),
    ).toEqual(["keep", "keep-big"]);
  });
});

describe("getSankeyTooltipPosition", () => {
  test("keeps the tooltip vertically centered on the pointer when there is space", () => {
    expect(
      getSankeyTooltipPosition({
        cursorX: 400,
        cursorY: 180,
        containerWidth: 1220,
        containerHeight: 560,
        tooltipWidth: 248,
        tooltipHeight: 196,
      }),
    ).toEqual({
      left: 416,
      top: 82,
    });
  });

  test("clamps the tooltip inside the chart bounds", () => {
    expect(
      getSankeyTooltipPosition({
        cursorX: 1180,
        cursorY: 520,
        containerWidth: 1220,
        containerHeight: 560,
        tooltipWidth: 248,
        tooltipHeight: 196,
      }),
    ).toEqual({
      left: 964,
      top: 356,
    });
  });

  test("respects a reserved top band when the pointer is near the chart heading", () => {
    expect(
      getSankeyTooltipPosition({
        cursorX: 360,
        cursorY: 32,
        containerWidth: 1220,
        containerHeight: 560,
        tooltipWidth: 248,
        tooltipHeight: 196,
        minTop: 112,
      }),
    ).toEqual({
      left: 376,
      top: 112,
    });
  });
});

describe("getSankeyTooltipWidth", () => {
  test("keeps a comfortable minimum width for short tooltip content", () => {
    expect(
      getSankeyTooltipWidth({
        containerWidth: 1220,
        values: ["Extract", "PayRouter A", "Analyze"],
      }),
    ).toBe(296);
  });

  test("grows for longer tooltip content but stays inside the chart", () => {
    const width = getSankeyTooltipWidth({
      containerWidth: 1220,
      values: [
        "/v1/extract/pdf",
        "/v1/analyze/summarize-with-longer-operation-name",
        "/v1/transact/booking/confirmation",
      ],
    });

    expect(width).toBeGreaterThan(340);
    expect(width).toBeLessThanOrEqual(392);
  });

  test("clamps to the available container width on narrow viewports", () => {
    expect(
      getSankeyTooltipWidth({
        containerWidth: 360,
        values: ["/v1/analyze/summarize-with-longer-operation-name"],
      }),
    ).toBe(344);
  });
});

describe("getSankeyVisibleLinkWidth", () => {
  test("keeps thin links readable with a minimum visible width", () => {
    expect(getSankeyVisibleLinkWidth(6)).toBe(5);
  });

  test("makes larger values visibly thicker", () => {
    expect(getSankeyVisibleLinkWidth(24)).toBe(12);
    expect(getSankeyVisibleLinkWidth(40)).toBeGreaterThan(getSankeyVisibleLinkWidth(20));
  });
});

describe("getSankeyLabelPillWidth", () => {
  test("uses a shared minimum width for short labels", () => {
    expect(getSankeyLabelPillWidth(["532 flows", "804 flows", "990 flows"])).toBe(112);
  });

  test("expands in fixed steps for longer labels", () => {
    expect(getSankeyLabelPillWidth(["123456789012345"])).toBe(120);
  });

  test("caps the width so a single outlier does not break consistency", () => {
    expect(getSankeyLabelPillWidth(["/this-is-an-extremely-long-label-that-should-not-keep-growing"])).toBe(140);
  });
});

describe("getSankeyLabelPillHeights", () => {
  test("keeps a shared fixed height for every flow pill", () => {
    expect(getSankeyLabelPillHeights()).toEqual({
      pillHeight: 20,
      maskHeight: 24,
    });
  });
});

describe("getSankeyLabelRenderPosition", () => {
  test("pulls the rendered pill slightly back toward the link centerline", () => {
    const position = getSankeyLabelRenderPosition({
      labelX: 364,
      labelY: 182,
      link: {
        fromX: 196,
        fromY: 200,
        toX: 532,
        toY: 200,
      },
    });

    expect(position.x).toBe(364);
    expect(position.y).toBeGreaterThan(182);
    expect(position.y).toBeLessThan(200);
  });
});

describe("getSankeyLabelLayout", () => {
  test("offsets a horizontal label away from the line", () => {
    const [label] = getSankeyLabelLayout([
      {
        id: "Extract|PayRouter A|Analyze",
        fromX: 196,
        fromY: 200,
        toX: 532,
        toY: 200,
      },
    ]);

    expect(label?.x).toBeGreaterThan(196);
    expect(label?.x).toBeLessThan(532);
    expect(label?.y).toBeLessThan(200);
  });

  test("adds vertical spacing when labels would nearly overlap", () => {
    const labels = getSankeyLabelLayout([
      {
        id: "Extract|PayRouter A|Analyze",
        fromX: 196,
        fromY: 210,
        toX: 532,
        toY: 212,
      },
      {
        id: "Search|PayRouter B|Analyze",
        fromX: 196,
        fromY: 214,
        toX: 532,
        toY: 216,
      },
    ]);

    expect(labels).toHaveLength(2);
    expect(Math.abs((labels[1]?.y ?? 0) - (labels[0]?.y ?? 0))).toBeGreaterThanOrEqual(28);
  });

  test("keeps labels separated even after pulling them back toward the link", () => {
    const baseLabels = getSankeyLabelLayout([
      {
        id: "one",
        fromX: 196,
        fromY: 210,
        toX: 532,
        toY: 212,
      },
      {
        id: "two",
        fromX: 196,
        fromY: 214,
        toX: 532,
        toY: 216,
      },
    ]);
    const labels = getSankeyLabelLayout(
      [
        {
          id: "one",
          fromX: 196,
          fromY: 210,
          toX: 532,
          toY: 212,
        },
        {
          id: "two",
          fromX: 196,
          fromY: 214,
          toX: 532,
          toY: 216,
        },
      ],
      {
        pullFactor: 0.18,
      },
    );

    expect(labels).toHaveLength(2);
    expect((labels[0]?.y ?? 0) - (baseLabels[0]?.y ?? 0)).toBeGreaterThan(0);
    expect(Math.abs((labels[1]?.y ?? 0) - (labels[0]?.y ?? 0))).toBeGreaterThanOrEqual(28);
  });

  test("distributes dense labels across the available height instead of pinning them to the top", () => {
    const labels = getSankeyLabelLayout(
      [
        { id: "one", fromX: 196, fromY: 200, toX: 532, toY: 200 },
        { id: "two", fromX: 196, fromY: 200, toX: 532, toY: 200 },
        { id: "three", fromX: 196, fromY: 200, toX: 532, toY: 200 },
        { id: "four", fromX: 196, fromY: 200, toX: 532, toY: 200 },
      ],
      {
        minGap: 34,
        minY: 84,
        maxY: 140,
      },
    );

    expect(labels).toHaveLength(4);
    expect(new Set(labels.map((label) => label.y)).size).toBe(4);
    expect(labels[0]?.y).toBe(84);
    expect(labels[3]?.y).toBe(140);
  });
});
