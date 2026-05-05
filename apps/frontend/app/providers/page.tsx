import { Sidebar } from "@/components/shell/Sidebar";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { ProvidersPicker } from "@/components/providers/ProvidersPicker";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ProvidersIndexPage() {
  const dataMode = await getServerDashboardMode();
  return (
    <>
      <SdkPreviewNoticeBar />
      <div className="app">
        <Sidebar activeProviderId={undefined} activeRoute={undefined} dataMode={dataMode} />
        <main className="main">
          <div className="scroll" style={{ background: "var(--bg-shell)" }}>
            <div style={{ padding: "32px 40px 80px", maxWidth: 1200, margin: "0 auto" }}>
              <header style={{ marginBottom: 24 }}>
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
                  Pick an API provider to view its customers, growth, and GEO spec.
                </p>
              </header>
              <ProvidersPicker />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
