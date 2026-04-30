import { TopBar } from "@/components/shell/TopBar";
import { DemoModeBanner } from "@/components/setup/DemoModeBanner";
import { EmptyStateCTA } from "@/components/setup/EmptyStateCTA";
import { SetupForm } from "@/components/setup/SetupForm";
import { SavedProviderList } from "@/components/setup/SavedProviderList";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function SetupPage() {
  const { dataMode, updatedAtUnixSec, renderedAtUnixSec } = await getTopBarPageContext();
  return (
    <>
      <TopBar
        crumbs={[{ label: "Setup" }]}
        dataMode={dataMode}
        updatedAtUnixSec={updatedAtUnixSec}
        renderedAtUnixSec={renderedAtUnixSec}
      />
      <div className="scroll">
        <div style={{ padding: "40px 56px 80px", maxWidth: 880, margin: "0 auto" }}>
          <div style={{ marginBottom: 36 }}>
            <div
              style={{
                fontSize: 11,
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
              style={{ fontSize: 32, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.015em" }}
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
