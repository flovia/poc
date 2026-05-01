import { TopBar } from "@/components/shell/TopBar";
import { CoUsageProvidersView } from "@/components/customers/CoUsageProvidersView";
import { SummaryChip } from "@/components/customers/SummaryChip";
import { aggregateCoUsageProviders } from "@/lib/customers/co-usage-providers";
import { resolveKnownProviderName } from "@/lib/customers/known-providers";
import { getProviders, getWalletUsageGraph } from "@/lib/data-source";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function CoUsageProvidersPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const [providers, pageCtx, graph] = await Promise.all([
    getProviders(),
    getTopBarPageContext(),
    getWalletUsageGraph(),
  ]);
  const ownPayTo = providers.find((p) => p.providerId === providerId)?.payTo;

  const rows = graph
    ? aggregateCoUsageProviders(graph, {
        ownPayTo,
        resolveProviderName: resolveKnownProviderName,
      })
    : [];

  const totalProviders = rows.length;
  const totalSharedWallets = rows.reduce((sum, r) => sum + r.sharedWallets, 0);
  const highOpportunity = rows.filter((r) => r.opportunity === "high").length;

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[
          { label: "Customers", href: `/providers/${providerId}/customers` },
          { label: "Co-Usage Providers" },
        ]}
        dataMode={pageCtx.dataMode}
      />
      <div className="scroll">
        <div style={{ padding: "32px 40px 80px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-mute)",
                  marginBottom: 6,
                }}
              >
                My Customers · Cross-provider co-usage
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                Co-Usage Providers
              </h1>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <SummaryChip
                label="Providers"
                value={totalProviders}
                hint="external x402 services"
              />
              <SummaryChip
                label="Shared wallets"
                value={totalSharedWallets}
                hint="overlapping payer wallets"
              />
              <SummaryChip
                label="High opportunity"
                value={highOpportunity}
                accent="blue"
                hint="confidence ≥ 0.70"
              />
            </div>
          </div>

          <p style={{ marginTop: 0, marginBottom: 20, color: "var(--text-2)", maxWidth: 720 }}>
            External x402 API providers your customers also pay. Higher shared-wallet reach and
            denser tx volume both signal stronger synergy — surface candidates worth a partnership
            or bundling conversation. Click any provider to open detailed usage.
          </p>

          {rows.length === 0 ? (
            <div
              style={{
                marginTop: 24,
                padding: 24,
                border: "1px dashed var(--line)",
                borderRadius: 6,
                color: "var(--text-3)",
                fontSize: 14,
              }}
            >
              No external provider co-usage has been observed for this provider yet.
            </div>
          ) : (
            <CoUsageProvidersView rows={rows} />
          )}
        </div>
      </div>
    </>
  );
}
