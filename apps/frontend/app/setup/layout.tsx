import { AppShell } from "@/components/shell/AppShell";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const dataMode = await getServerDashboardMode();
  return (
    <AppShell activeProviderId={undefined} activeRoute="setup" dataMode={dataMode}>
      {children}
    </AppShell>
  );
}
