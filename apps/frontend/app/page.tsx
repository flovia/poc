import { getServerDashboardMode } from "@/lib/server/dashboard-mode";
import { RootRedirectClient } from "./RootRedirectClient";

export default async function RootRedirect() {
  const initialDashboardMode = await getServerDashboardMode();
  return <RootRedirectClient initialDashboardMode={initialDashboardMode} />;
}
