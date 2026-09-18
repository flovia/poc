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
    <ProviderClientLayout params={params} dataMode={dataMode}>
      {children}
    </ProviderClientLayout>
  );
}
