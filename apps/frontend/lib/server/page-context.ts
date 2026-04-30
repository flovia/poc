// Server Component から TopBar に渡す共通 context (dashboard mode + freshness) の取得 helper。
// BFF 障害時に page 全体が落ちないよう, summary 取得は best-effort で undefined フォールバックする。

import { getServerDashboardMode, type DashboardMode } from "@/lib/data-mode";
import { getSummary, pickLatestObservationUnixSec } from "@/lib/data-source";

export type TopBarPageContext = {
  dataMode: DashboardMode;
  updatedAtUnixSec: number | undefined;
  renderedAtUnixSec: number;
};

export async function getTopBarPageContext(): Promise<TopBarPageContext> {
  const dataMode = await getServerDashboardMode();
  let updatedAtUnixSec: number | undefined;
  try {
    const summary = await getSummary();
    updatedAtUnixSec = pickLatestObservationUnixSec(summary);
  } catch {
    // BFF 不在時のフォールバック。TopBar 側は "Updated —" に倒す。
    updatedAtUnixSec = undefined;
  }
  return {
    dataMode,
    updatedAtUnixSec,
    renderedAtUnixSec: Math.floor(Date.now() / 1000),
  };
}
