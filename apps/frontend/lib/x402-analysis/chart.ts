import type { X402MetricMode } from "./types";
import type { X402SankeyLink } from "./transform";

const DEFAULT_TOOLTIP_OFFSET = 16;
const DEFAULT_TOOLTIP_PADDING = 8;
const DEFAULT_TOOLTIP_MIN_WIDTH = 320;
const DEFAULT_TOOLTIP_MAX_WIDTH = 420;
const DEFAULT_TOOLTIP_CHAR_WIDTH = 7.1;
const DEFAULT_TOOLTIP_CONTENT_PADDING = 78;
const DEFAULT_LINK_MIN_WIDTH = 5;
const DEFAULT_LINK_VISIBLE_RATIO = 0.5;
const DEFAULT_LABEL_PILL_MIN_WIDTH = 112;
const DEFAULT_LABEL_PILL_MAX_WIDTH = 140;
const DEFAULT_LABEL_PILL_STEP = 12;
const DEFAULT_LABEL_PILL_CHAR_WIDTH = 6.8;
const DEFAULT_LABEL_PILL_PADDING = 18;
const DEFAULT_LABEL_VISUAL_PULL = 0.18;
const DEFAULT_LABEL_OFFSET = 18;
const DEFAULT_LABEL_MIN_GAP = 28;

export function formatSankeyMetricValue(metric: X402MetricMode, value: number): string {
  if (metric === "flow_count") {
    return `${Math.round(value).toLocaleString()} flows`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getSankeyLinkLabelPosition(
  link: Pick<X402SankeyLink, "fromX" | "fromY" | "toX" | "toY">,
) {
  return cubicBezierPoint(
    0.5,
    { x: link.fromX, y: link.fromY },
    { x: link.fromX + 120, y: link.fromY },
    { x: link.toX - 120, y: link.toY },
    { x: link.toX, y: link.toY },
  );
}

export function getSankeyLabelLayout(
  links: Array<Pick<X402SankeyLink, "id" | "fromX" | "fromY" | "toX" | "toY">>,
  options?: {
    offset?: number;
    minGap?: number;
    minY?: number;
    maxY?: number;
    pullFactor?: number;
  },
) {
  const offset = options?.offset ?? DEFAULT_LABEL_OFFSET;
  const minGap = options?.minGap ?? DEFAULT_LABEL_MIN_GAP;
  const minY = options?.minY ?? Number.NEGATIVE_INFINITY;
  const maxY = options?.maxY ?? Number.POSITIVE_INFINITY;
  const pullFactor = options?.pullFactor ?? 0;

  const placements = links.map((link) => {
    const anchor = getSankeyLinkLabelPosition(link);
    const derivative = cubicBezierDerivative(
      0.5,
      { x: link.fromX, y: link.fromY },
      { x: link.fromX + 120, y: link.fromY },
      { x: link.toX - 120, y: link.toY },
      { x: link.toX, y: link.toY },
    );
    const normal = normalizeVector({ x: -derivative.y, y: derivative.x });
    const preferredYDirection = link.toY >= link.fromY ? -1 : 1;
    const direction = normal.y === 0 || Math.sign(normal.y) === preferredYDirection ? 1 : -1;

    return {
      id: link.id,
      x: anchor.x + normal.x * offset * direction,
      y: anchor.y + normal.y * offset * direction,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
  });

  const spacedPlacements = resolveLabelSpacing(placements, {
    minGap,
    minY,
    maxY,
  });
  const pulledPlacements =
    pullFactor === 0
      ? spacedPlacements
      : spacedPlacements.map((placement) => ({
          ...placement,
          ...pullLabelPositionTowardsAnchor({
            labelX: placement.x,
            labelY: placement.y,
            anchorX: placement.anchorX,
            anchorY: placement.anchorY,
            pullFactor,
          }),
        }));
  const stabilizedPlacements =
    pullFactor === 0
      ? pulledPlacements
      : resolveLabelSpacing(pulledPlacements, {
          minGap,
          minY,
          maxY,
        });

  return stabilizedPlacements.map(
    (placement) => ({
      id: placement.id,
      x: placement.x,
      y: placement.y,
    }),
  );
}

export function getSankeyTooltipPosition(args: {
  cursorX: number;
  cursorY: number;
  containerWidth: number;
  containerHeight: number;
  tooltipWidth: number;
  tooltipHeight: number;
  offset?: number;
  padding?: number;
}) {
  const offset = args.offset ?? DEFAULT_TOOLTIP_OFFSET;
  const padding = args.padding ?? DEFAULT_TOOLTIP_PADDING;

  const preferredLeft = args.cursorX + offset;
  const preferredTop = args.cursorY + offset;
  const fallbackTop = args.cursorY - args.tooltipHeight - offset;

  return {
    left: clamp(preferredLeft, padding, args.containerWidth - args.tooltipWidth - padding),
    top: clamp(
      preferredTop + args.tooltipHeight <= args.containerHeight - padding
        ? preferredTop
        : fallbackTop,
      padding,
      args.containerHeight - args.tooltipHeight - padding,
    ),
  };
}

export function getSankeyTooltipWidth(args: {
  containerWidth: number;
  values: string[];
  minWidth?: number;
  maxWidth?: number;
}) {
  const minWidth = args.minWidth ?? DEFAULT_TOOLTIP_MIN_WIDTH;
  const maxWidth = args.maxWidth ?? DEFAULT_TOOLTIP_MAX_WIDTH;
  const availableWidth = Math.max(220, args.containerWidth - DEFAULT_TOOLTIP_PADDING * 2);
  const longestValueLength = args.values.reduce((longest, value) => {
    return Math.max(longest, value.trim().length);
  }, 0);
  const estimatedWidth = Math.ceil(longestValueLength * DEFAULT_TOOLTIP_CHAR_WIDTH + DEFAULT_TOOLTIP_CONTENT_PADDING);
  const upperBound = Math.min(maxWidth, availableWidth);
  const lowerBound = Math.min(minWidth, upperBound);

  return clamp(estimatedWidth, lowerBound, upperBound);
}

export function getSankeyVisibleLinkWidth(scaledBandHeight: number) {
  return Math.max(DEFAULT_LINK_MIN_WIDTH, scaledBandHeight * DEFAULT_LINK_VISIBLE_RATIO);
}

export function getSankeyLabelPillWidth(
  values: string[],
  options?: {
    minWidth?: number;
    maxWidth?: number;
    step?: number;
  },
) {
  const minWidth = options?.minWidth ?? DEFAULT_LABEL_PILL_MIN_WIDTH;
  const maxWidth = options?.maxWidth ?? DEFAULT_LABEL_PILL_MAX_WIDTH;
  const step = options?.step ?? DEFAULT_LABEL_PILL_STEP;
  const longestValueLength = values.reduce((longest, value) => {
    return Math.max(longest, value.trim().length);
  }, 0);
  const estimatedWidth =
    longestValueLength * DEFAULT_LABEL_PILL_CHAR_WIDTH + DEFAULT_LABEL_PILL_PADDING;
  const steppedWidth = Math.ceil(estimatedWidth / step) * step;

  return clamp(steppedWidth, minWidth, maxWidth);
}

export function getSankeyLabelRenderPosition(args: {
  labelX: number;
  labelY: number;
  link: Pick<X402SankeyLink, "fromX" | "fromY" | "toX" | "toY">;
  pullFactor?: number;
}) {
  const anchor = getSankeyLinkLabelPosition(args.link);
  const pullFactor = args.pullFactor ?? DEFAULT_LABEL_VISUAL_PULL;

  return pullLabelPositionTowardsAnchor({
    labelX: args.labelX,
    labelY: args.labelY,
    anchorX: anchor.x,
    anchorY: anchor.y,
    pullFactor,
  });
}

function resolveLabelSpacing<T extends { id: string; x: number; y: number }>(
  placements: T[],
  options: {
    minGap: number;
    minY: number;
    maxY: number;
  },
) {
  const sorted = placements.map((placement) => ({ ...placement })).sort((left, right) => left.y - right.y);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current) continue;
    if (current.y - previous.y < options.minGap) {
      current.y = previous.y + options.minGap;
    }
  }

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current) continue;
    current.y = clamp(current.y, options.minY, options.maxY);
    if (next && next.y - current.y < options.minGap) {
      current.y = next.y - options.minGap;
    }
    current.y = clamp(current.y, options.minY, options.maxY);
  }

  return placements.map(
    (placement) => sorted.find((candidate) => candidate.id === placement.id) ?? placement,
  );
}

function pullLabelPositionTowardsAnchor(args: {
  labelX: number;
  labelY: number;
  anchorX: number;
  anchorY: number;
  pullFactor: number;
}) {
  return {
    x: args.labelX + (args.anchorX - args.labelX) * args.pullFactor,
    y: args.labelY + (args.anchorY - args.labelY) * args.pullFactor,
  };
}

function cubicBezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

function cubicBezierDerivative(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  const mt = 1 - t;

  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

function normalizeVector(vector: { x: number; y: number }) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return { x: 0, y: -1 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
