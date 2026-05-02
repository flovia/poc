"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { X402MetricMode } from "@/lib/x402-analysis/types";
import {
  filterSankeyRowsByFlowCount,
  formatSankeyMetricValue,
  getSankeyLabelLayout,
  getSankeyLabelPillHeights,
  getSankeyLabelPillWidth,
  getSankeyLinkLabelPosition,
  getSankeyTooltipPosition,
  getSankeyTooltipWidth,
  getSankeyVisibleLinkWidth,
} from "@/lib/x402-analysis/chart";
import {
  buildX402SankeyLayout,
  type X402SankeyChartModel,
  type X402SankeyLink,
  type X402SankeyNode,
} from "@/lib/x402-analysis/transform";

type X402SankeyChartProps = {
  chart: X402SankeyChartModel;
  metric: X402MetricMode;
  paidCountLabel?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
};

const WIDTH = 1220;
const HEIGHT = 560;
const MIN_VISIBLE_FLOW_COUNT_EXCLUSIVE = 2;
// Keep the hover card below the densest top flow pills in headerless sankey sections.
const TOOLTIP_MIN_TOP = 136;
const TOOLTIP_DEFAULT_SIZE = {
  width: 296,
  height: 220,
};
const { pillHeight: LINK_LABEL_HEIGHT, maskHeight: LINK_LABEL_MASK_HEIGHT } = getSankeyLabelPillHeights();
const LINK_LABEL_TEXT_OFFSET_Y = 1;

type HoverState = {
  key: string;
  cursorX: number;
  cursorY: number;
};

function nodeFill(layer: X402SankeyNode["layer"]): string {
  switch (layer) {
    case "left":
      return "rgba(47, 93, 154, 0.18)";
    case "mid":
      return "rgba(44, 122, 123, 0.18)";
    case "right":
      return "rgba(122, 92, 34, 0.16)";
  }
}

function nodeStroke(layer: X402SankeyNode["layer"]): string {
  switch (layer) {
    case "left":
      return "rgba(47, 93, 154, 0.48)";
    case "mid":
      return "rgba(44, 122, 123, 0.45)";
    case "right":
      return "rgba(122, 92, 34, 0.42)";
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number): string {
  return `${Math.round(value).toLocaleString()} ms`;
}

export function X402SankeyChart({
  chart,
  metric,
  paidCountLabel = "Paid count",
  showHeader = true,
  headerActions,
}: X402SankeyChartProps) {
  const layout = useMemo(
    () => buildX402SankeyLayout(chart.flows, metric, WIDTH, HEIGHT, chart.layer_order),
    [chart.flows, chart.layer_order, metric],
  );
  const visibleLinks = useMemo(
    () =>
      filterSankeyRowsByFlowCount(layout.links, {
        minFlowCountExclusive: MIN_VISIBLE_FLOW_COUNT_EXCLUSIVE,
      }),
    [layout.links],
  );
  const linkLabelWidth = useMemo(
    () =>
      getSankeyLabelPillWidth(
        visibleLinks
          .filter((link) => link.segment === "left_mid" || link.segment === "mid_right")
          .map((link) => formatSankeyMetricValue(metric, link.value)),
      ),
    [metric, visibleLinks],
  );
  const leftLabelLayout = useMemo(
    () =>
      new Map(
        getSankeyLabelLayout(
          visibleLinks.filter((link) => link.segment === "left_mid"),
          {
            minGap: 30,
            minY: 84,
            maxY: HEIGHT - 32,
            pullFactor: 0.18,
          },
        ).map((item) => [item.id, item]),
      ),
    [visibleLinks],
  );
  const rightLabelLayout = useMemo(
    () =>
      new Map(
        getSankeyLabelLayout(
          visibleLinks.filter((link) => link.segment === "mid_right"),
          {
            minGap: 30,
            minY: 84,
            maxY: HEIGHT - 32,
            pullFactor: 0.18,
          },
        ).map((item) => [item.id, item]),
      ),
    [visibleLinks],
  );
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [tooltipSize, setTooltipSize] = useState(TOOLTIP_DEFAULT_SIZE);
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const hoveredKey = hovered?.key ?? null;
  const hoveredLink = hoveredKey ? visibleLinks.find((link) => link.id === hoveredKey) ?? null : null;
  const hoveredNodeIds = hoveredLink
    ? new Set([
        `left:${hoveredLink.left_label}`,
        `mid:${hoveredLink.middle_label}`,
        `right:${hoveredLink.right_label}`,
      ])
    : null;
  const hoverDetails = hoveredLink
    ? {
        title: `${hoveredLink.left_label} → ${hoveredLink.middle_label} → ${hoveredLink.right_label}`,
        left: hoveredLink.left_detail ?? hoveredLink.left_label,
        middle: hoveredLink.middle_detail ?? hoveredLink.middle_label,
        right: hoveredLink.right_detail ?? hoveredLink.right_label,
      }
    : null;
  const layerCenters = {
    left: layout.nodes.find((node) => node.layer === "left"),
    mid: layout.nodes.find((node) => node.layer === "mid"),
    right: layout.nodes.find((node) => node.layer === "right"),
  };
  const tooltipWidth =
    hoverDetails && chartBodyRef.current
      ? getSankeyTooltipWidth({
          containerWidth: chartBodyRef.current.clientWidth,
          values: [hoverDetails.title, hoverDetails.left, hoverDetails.middle, hoverDetails.right],
        })
      : TOOLTIP_DEFAULT_SIZE.width;
  const tooltipPosition =
    hovered && chartBodyRef.current
      ? getSankeyTooltipPosition({
          cursorX: hovered.cursorX,
          cursorY: hovered.cursorY,
          containerWidth: chartBodyRef.current.clientWidth,
          containerHeight: chartBodyRef.current.clientHeight,
          tooltipWidth,
          tooltipHeight: tooltipSize.height,
          minTop: TOOLTIP_MIN_TOP,
        })
      : null;

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const nextSize = {
      width: tooltipRef.current.offsetWidth,
      height: tooltipRef.current.offsetHeight,
    };
    setTooltipSize((current) =>
      current.width === nextSize.width && current.height === nextSize.height ? current : nextSize,
    );
  }, [hoveredKey, metric]);

  function updateHover(baseKey: string, event: React.MouseEvent<SVGElement>) {
    if (!chartBodyRef.current) return;
    const bounds = chartBodyRef.current.getBoundingClientRect();
    setHovered({
      key: baseKey,
      cursorX: event.clientX - bounds.left,
      cursorY: event.clientY - bounds.top,
    });
  }

  const detailRows = hoverDetails
    ? [
        { label: chart.layer_labels.left, value: hoverDetails.left },
        { label: chart.layer_labels.mid, value: hoverDetails.middle },
        { label: chart.layer_labels.right, value: hoverDetails.right },
      ]
    : [];
  const metricRows = hoveredLink
    ? [
        { label: "Selected", value: formatSankeyMetricValue(metric, hoveredLink.value), emphasize: true },
        { label: "Success rate", value: formatPercent(hoveredLink.success_rate) },
        { label: "P95 latency", value: formatLatency(hoveredLink.p95_latency_ms) },
        { label: paidCountLabel, value: hoveredLink.paid_count.toLocaleString(), emphasize: true },
        { label: "Settled", value: formatSankeyMetricValue("settled_usdc", hoveredLink.settled_usdc) },
        { label: "Error rate", value: formatPercent(hoveredLink.error_rate) },
      ]
    : [];

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,248,252,0.96) 100%)",
      }}
    >
      {showHeader ? (
        <div
          style={{
            padding: "16px 18px 12px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-mute)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {chart.eyebrow}
            </div>
            <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>
              {chart.title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                maxWidth: 320,
                textAlign: "right",
              }}
            >
              {chart.description}
            </div>
            {headerActions}
          </div>
        </div>
      ) : null}

      <div
        ref={chartBodyRef}
        style={{ padding: "14px 18px 18px", position: "relative", isolation: "isolate" }}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" style={{ display: "block" }}>
          <defs>
            <linearGradient id="x402-link-gradient-left" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(47, 93, 154, 0.18)" />
              <stop offset="100%" stopColor="rgba(47, 93, 154, 0.42)" />
            </linearGradient>
            <linearGradient id="x402-link-gradient-right" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(44, 122, 123, 0.16)" />
              <stop offset="100%" stopColor="rgba(44, 122, 123, 0.42)" />
            </linearGradient>
          </defs>

          {([
            { key: "left", label: chart.layer_labels.left, node: layerCenters.left },
            { key: "mid", label: chart.layer_labels.mid, node: layerCenters.mid },
            { key: "right", label: chart.layer_labels.right, node: layerCenters.right },
          ] as const).map((column) =>
            column.node ? (
              <text
                key={column.key}
                x={column.node.x + column.node.width / 2}
                y={40}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize="12"
                fontWeight="600"
                fill="var(--text-3)"
              >
                {column.label}
              </text>
            ) : null,
          )}

	          {visibleLinks.map((link) => {
	            const baseKey = link.id.replace(/::right$/, "");
	            const isHovered = hoveredKey === baseKey;
	            const isDimmed = !!hoveredKey && !isHovered;
	            const visibleLinkWidth = getSankeyVisibleLinkWidth(link.value * layout.scale);
	            return (
	              <path
	                key={link.id}
	                d={link.path}
	                fill="none"
	                stroke={link.segment === "left_mid" ? "url(#x402-link-gradient-left)" : "url(#x402-link-gradient-right)"}
	                strokeWidth={visibleLinkWidth}
	                strokeOpacity={isHovered ? 0.95 : isDimmed ? 0.12 : 0.55}
	                strokeLinecap="round"
	                strokeLinejoin="round"
                style={{
                  transition: "stroke-opacity 160ms ease, stroke-width 160ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(event) => updateHover(baseKey, event)}
                onMouseMove={(event) => updateHover(baseKey, event)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const isDimmed = !!hoveredKey && !hoveredNodeIds?.has(node.id);
            const nodeHeight = Math.max(28, node.height);
            const nodeFontSize = node.label.length > 16 ? 10.5 : 11.5;
            return (
              <g key={node.id} onMouseEnter={() => setHovered(null)}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={nodeHeight}
                  rx="8"
                  fill="rgba(255,255,255,0.98)"
                />
                <g style={{ opacity: isDimmed ? 0.45 : 1, transition: "opacity 160ms ease" }}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={nodeHeight}
                    rx="8"
                    fill={nodeFill(node.layer)}
                    stroke={nodeStroke(node.layer)}
                    strokeWidth="1"
                  />
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + nodeHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="var(--mono)"
                    fontSize={nodeFontSize}
                    fontWeight="600"
                    fill="var(--text-1)"
                  >
                    {node.label}
                  </text>
                </g>
              </g>
            );
          })}

          {visibleLinks
            .filter((link) => link.segment === "left_mid" || link.segment === "mid_right")
            .map((link) => {
              const baseKey = link.id.replace(/::right$/, "");
              const label = formatSankeyMetricValue(metric, link.value);
              const isHovered = hoveredKey === baseKey;
              const isDimmed = !!hoveredKey && !isHovered;
              const point =
                (link.segment === "left_mid" ? leftLabelLayout.get(link.id) : rightLabelLayout.get(link.id)) ??
                getSankeyLinkLabelPosition(link);
              const renderX = Math.round(point.x * 2) / 2;
              const renderY = Math.round(point.y * 2) / 2;
              return (
                <g
                  key={`${link.id}::label`}
                  transform={`translate(${renderX}, ${renderY})`}
                  opacity={isDimmed ? 0.32 : 1}
                  style={{ transition: "opacity 160ms ease", cursor: "pointer" }}
                  onMouseEnter={(event) => updateHover(baseKey, event)}
                  onMouseMove={(event) => updateHover(baseKey, event)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect
                    x={-(linkLabelWidth + 8) / 2}
                    y={-LINK_LABEL_MASK_HEIGHT / 2}
                    width={linkLabelWidth + 8}
                    height={LINK_LABEL_MASK_HEIGHT}
                    rx="999"
                    fill="rgba(255,255,255,0.98)"
                  />
                  <rect
                    x={-linkLabelWidth / 2}
                    y={-10}
                    width={linkLabelWidth}
                    height={LINK_LABEL_HEIGHT}
                    rx="999"
                    fill="rgb(255,255,255)"
                  />
                  <text
                    x="0"
                    y={LINK_LABEL_TEXT_OFFSET_Y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="var(--mono)"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--text-1)"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
        </svg>

        {hoveredLink && tooltipPosition ? (
          <div
            ref={tooltipRef}
            className="card"
            style={{
              position: "absolute",
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              zIndex: 2,
              width: tooltipWidth,
              padding: 12,
              pointerEvents: "none",
              borderColor: "rgba(47, 93, 154, 0.18)",
              background: "rgb(255, 255, 255)",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--mesh-blue)",
                marginBottom: 6,
              }}
            >
              Hover details
              </div>
            <div
              className="display"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-1)",
                lineHeight: 1.3,
                overflowWrap: "anywhere",
              }}
            >
              {hoverDetails?.title}
            </div>
            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 10,
                fontSize: 11.5,
              }}
            >
              {detailRows.map((row) => (
                <div key={row.label}>
                  <div style={{ color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {row.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--text-1)",
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 10,
                fontSize: 11.5,
              }}
            >
              {metricRows.map((row) => (
                <div key={row.label}>
                  <div style={{ color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {row.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--text-1)",
                      fontWeight: row.emphasize ? 700 : 500,
                      lineHeight: 1.35,
                    }}
                  >
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
