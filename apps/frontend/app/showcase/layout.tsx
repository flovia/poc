import { AppShell } from "@/components/shell/AppShell";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();

  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute="showcase" dataMode={dataMode}>{children}</AppShell>
    </>
  );
}
