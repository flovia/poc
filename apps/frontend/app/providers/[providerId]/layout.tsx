import { getServerDashboardMode } from "@/lib/data-mode";
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
    <ProviderClientLayout params={params} dataMode={dataMode}>
      {children}
    </ProviderClientLayout>
  );
}
