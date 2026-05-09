import { Sidebar } from "@/components/shell/Sidebar";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();

  return (
    <>
      <SdkPreviewNoticeBar />
      <div className="app">
        <Sidebar activeProviderId={undefined} activeRoute="showcase" dataMode={dataMode} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
