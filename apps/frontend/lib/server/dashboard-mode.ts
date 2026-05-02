import {
  type DashboardMode,
  getServerDashboardMode as getDefaultServerDashboardMode,
} from "../data-mode";
import { resolveServerDataSource } from "../data-source-env";

export async function getServerDashboardMode(): Promise<DashboardMode> {
  if (resolveServerDataSource() === "fixture") return "sdkConnected";
  return getDefaultServerDashboardMode();
}
