import { AppShell } from "@/components/shell/AppShell";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();

  return (
    <AppShell activeProviderId={undefined} activeRoute="showcase" dataMode={dataMode}>
      {children}
    </AppShell>
  );
}
