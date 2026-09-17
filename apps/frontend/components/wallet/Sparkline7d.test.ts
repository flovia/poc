import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Sparkline7d } from "./Sparkline7d";
import type { Sdk7dVolumePoint } from "@/lib/sdk-fixtures/types";

const points: Sdk7dVolumePoint[] = [
  { day: "2026-04-22", observationCount: 1, amountUsd: 1 },
  { day: "2026-04-23", observationCount: 2, amountUsd: 2 },
  { day: "2026-04-24", observationCount: 3, amountUsd: 3 },
  { day: "2026-04-25", observationCount: 4, amountUsd: 4 },
  { day: "2026-04-26", observationCount: 5, amountUsd: 5 },
  { day: "2026-04-27", observationCount: 6, amountUsd: 6 },
  { day: "2026-04-28", observationCount: 8, amountUsd: 8 },
];

describe("Sparkline7d", () => {
  test("keeps the last point and end cap inside the viewBox", () => {
    const html = renderToStaticMarkup(Sparkline7d({ points, width: 90, height: 28 }));
    expect(html).toContain('overflow="hidden"');
    expect(html).toContain('viewBox="0 0 90 28"');
    const cx = Number(html.match(/<circle[^>]*\scx="([^"]+)"/)?.[1]);
    const r = Number(html.match(/<circle[^>]*\sr="([^"]+)"/)?.[1]);
    expect(cx + r).toBeLessThanOrEqual(90);
    expect(cx - r).toBeGreaterThanOrEqual(0);
  });
});
