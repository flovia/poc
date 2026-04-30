// Phase 7 C5: 起動時 assert. import すれば副作用で実行される.
// fixture が壊れた変更で混入したら即座に throw して気づけるようにする.

import { PROTAGONIST_EXTRAS, PROTAGONIST_PROFILE } from "./protagonist";
import { T0 } from "./shared";

function assertEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `[sdk-fixtures assert] ${label}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

function assertTrue(cond: boolean, label: string): void {
  if (!cond) throw new Error(`[sdk-fixtures assert] ${label} failed`);
}

// T0 が 2026-04-28T09:00:00Z である.
assertEq(new Date(T0 * 1000).toISOString(), "2026-04-28T09:00:00.000Z", "T0 ISO");

// 主役 EXTRAS の数値整合 (docs/vision/09_protagonist_wallet.md 由来).
assertEq(PROTAGONIST_EXTRAS.totalSpendUsd, 3840, "totalSpendUsd");
assertEq(PROTAGONIST_EXTRAS.growth7d, 1.84, "growth7d");
assertEq(PROTAGONIST_EXTRAS.freeTierProgress, 0.92, "freeTierProgress");
assertEq(PROTAGONIST_EXTRAS.upsell?.planName, "Pro Trading 250M", "upsell.planName");
assertEq(PROTAGONIST_EXTRAS.upsell?.projectedMrrUsd, 890, "upsell.projectedMrrUsd");

// timeline / timelineExtras の長さと cycleId 分布.
assertEq(PROTAGONIST_PROFILE.timeline.length, 12, "timeline.length");
assertEq(PROTAGONIST_EXTRAS.timelineExtras.length, 12, "timelineExtras.length");

const cycleCounts = [0, 0, 0];
for (const ex of PROTAGONIST_EXTRAS.timelineExtras) {
  if (ex.cycleId >= 1 && ex.cycleId <= 3) cycleCounts[ex.cycleId - 1] += 1;
}
assertEq(cycleCounts.join(","), "4,4,4", "cycle distribution 4-4-4");

// timelineExtras と timeline の txHash 1:1 対応.
const timelineHashes = new Set(
  PROTAGONIST_PROFILE.timeline.filter((t) => t.type === "payment").map((t) => t.txHash),
);
for (const ex of PROTAGONIST_EXTRAS.timelineExtras) {
  assertTrue(
    timelineHashes.has(ex.txHash),
    `timelineExtras.txHash not in profile.timeline: ${ex.txHash}`,
  );
}

// sparkline7d は 7 点.
assertEq(PROTAGONIST_EXTRAS.sparkline7d.length, 7, "sparkline7d.length");
