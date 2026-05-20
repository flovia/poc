import { TopBar } from "@/components/shell/TopBar";
import { DemoModeBanner } from "@/components/setup/DemoModeBanner";
import { EmptyStateCTA } from "@/components/setup/EmptyStateCTA";
import { SetupForm } from "@/components/setup/SetupForm";
import { SavedProviderList } from "@/components/setup/SavedProviderList";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function SetupPage() {
  const { dataMode } = await getTopBarPageContext();
  return (
    <>
      <TopBar crumbs={[{ label: "Setup" }]} dataMode={dataMode} />
      <div className="scroll">
        <div className="page-pad page-pad--setup">
          <div style={{ marginBottom: 36 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
                marginBottom: 10,
              }}
            >
              Onboarding · 1 minute
            </div>
            <h1
              className="display"
              style={{ fontSize: 30, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.015em" }}
            >
              Connect your <span style={{ color: "var(--teal)" }}>pay_to</span> address
            </h1>
            <p style={{ color: "var(--text-2)", fontSize: 15, margin: 0, maxWidth: 600 }}>
              Flovia reads x402 facilitator data to map every wallet calling your API — and what
              they call alongside it. No SDK, no auth.
            </p>
          </div>

          <EmptyStateCTA />

          <div id="setup-form-anchor">
            <SetupForm />
          </div>

          <DemoModeBanner />
          <SavedProviderList />
        </div>
      </div>
    </>
  );
}
