import { Sidebar } from "@/components/shell/Sidebar";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();
  return (
    <div className="app">
      <Sidebar activeProviderId={undefined} activeRoute="setup" dataMode={dataMode} />
      <main className="main">{children}</main>
    </div>
  );
}
