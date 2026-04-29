import { Sidebar } from "@/components/shell/Sidebar";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar activeProviderId={undefined} activeRoute="setup" />
      <main className="main">{children}</main>
    </div>
  );
}
