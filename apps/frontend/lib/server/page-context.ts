// Server Component から TopBar に渡す共通 context (現状は dashboard mode のみ) の
// 取得 helper。今後 period filter / freshness 等を再導入する際の集約点として残す。
// 詳細は docs/future-work.md "Period filter" / "Data freshness indicator"。

import type { DashboardMode } from "@/lib/data-mode";
import { getServerDashboardMode } from "@/lib/server/dashboard-mode";

export type TopBarPageContext = {
  dataMode: DashboardMode;
};

export async function getTopBarPageContext(): Promise<TopBarPageContext> {
  const dataMode = await getServerDashboardMode();
  return { dataMode };
}
