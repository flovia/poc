import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { ProviderClientLayout } from "@/app/providers/[providerId]/ProviderClientLayout";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ProviderWalletAliasLayout({
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
