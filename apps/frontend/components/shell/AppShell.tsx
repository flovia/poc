"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MobileNavProvider } from "@/components/shell/MobileNavContext";
import { Sidebar, type ActiveRoute } from "@/components/shell/Sidebar";
import type { DashboardMode } from "@/lib/data-mode";

type AppShellProps = {
  children: ReactNode;
  activeProviderId: string | undefined;
  activeRoute: ActiveRoute;
  dataMode: DashboardMode;
};

export function AppShell({ children, activeProviderId, activeRoute, dataMode }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nav = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );

  const renderSidebar = () => (
    <Sidebar activeProviderId={activeProviderId} activeRoute={activeRoute} dataMode={dataMode} />
  );

  return (
    <MobileNavProvider value={nav}>
      <div className="app">
        {renderSidebar()}
        <div className={`mobile-nav ${isOpen ? "mobile-nav--open" : ""}`} aria-hidden={!isOpen}>
          <button
            type="button"
            className="mobile-nav__backdrop"
            aria-label="Close navigation"
            onClick={nav.close}
          />
          <div
            className="mobile-nav__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            onClickCapture={(event) => {
              if ((event.target as HTMLElement).closest("a")) nav.close();
            }}
          >
            {renderSidebar()}
          </div>
        </div>
        <main className="main">{children}</main>
      </div>
    </MobileNavProvider>
  );
}
