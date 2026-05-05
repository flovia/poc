import { Sidebar } from "@/components/shell/Sidebar";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/server/dashboard-mode";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();
  return (
    <>
      <SdkPreviewNoticeBar />
      <div className="app">
        <Sidebar activeProviderId={undefined} activeRoute="setup" dataMode={dataMode} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
