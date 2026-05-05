// Server Component. Client (ProviderClientLayout) の外で SdkPreviewNoticeBar を
// 描画することで, ProviderClientLayout の hydration 待ち skeleton 中でも注記バーが
// 画面上端に出る。dataMode は server で cookie から確定させて client に props で渡す。

import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/server/dashboard-mode";
import { ProviderClientLayout } from "./ProviderClientLayout";

export default async function ProviderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ providerId: string }>;
}) {
  const dataMode = await getServerDashboardMode();
  return (
    <>
      <SdkPreviewNoticeBar />
      <ProviderClientLayout params={params} dataMode={dataMode}>
        {children}
      </ProviderClientLayout>
    </>
  );
}
