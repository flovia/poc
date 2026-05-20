import { AppShell } from "@/components/shell/AppShell";
import { MobileMenuButton } from "@/components/shell/MobileMenuButton";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { ProvidersPicker } from "@/components/providers/ProvidersPicker";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ProvidersIndexPage() {
  const dataMode = await getServerDashboardMode();
  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute={undefined} dataMode={dataMode}>
          <div className="scroll" style={{ background: "var(--bg-shell)" }}>
            <div className="page-pad page-pad--wide">
              <header className="providers-page-header">
                <MobileMenuButton />
                <div className="providers-page-header__body">
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    Workspace
                  </div>
                  <h1
                    className="display"
                    style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
                  >
                    API providers
                  </h1>
                  <p
                    style={{
                      maxWidth: 820,
                      color: "var(--text-2)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      margin: "8px 0 0",
                    }}
                  >
                    Pick an API provider to view its customers, growth, and GEO.
                  </p>
                </div>
              </header>
              <ProvidersPicker />
            </div>
          </div>
      </AppShell>
    </>
  );
}
