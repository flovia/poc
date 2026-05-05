import { normalizePaymentRecipientAddress } from "contracts";
import { TopBar } from "@/components/shell/TopBar";
import { CoUsageProvidersView } from "@/components/customers/CoUsageProvidersView";
import { SummaryChip } from "@/components/customers/SummaryChip";
import { aggregateCoUsageProviders } from "@/lib/customers/co-usage-providers";
import { resolveKnownProviderName } from "@/lib/customers/known-providers";
import { getProviders, getWalletUsageGraph } from "@/lib/data-source";
import { findProviderByRouteId } from "@/lib/providers";
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
  const ownProvider = findProviderByRouteId(providers, providerId);
  const ownPayTo = ownProvider?.payTo;
  const ownPayTos = ownProvider
    ? providers
        .filter((p) => {
          if (ownProvider.serviceId && p.serviceId === ownProvider.serviceId) return true;
          if (ownProvider.serviceName && p.serviceName === ownProvider.serviceName) return true;
          return p.providerId === ownProvider.providerId;
        })
        .map((p) => p.payTo)
    : [];

  const metadataByPayTo = new Map(
    providers
      .filter(
        (p) =>
          p.title ||
          p.description ||
          p.useCase ||
          p.category ||
          p.serviceUrl ||
          p.protocol ||
          p.chain ||
          p.assetSymbol ||
          p.priceRangeUsd,
      )
      .map((p) => [
        normalizePaymentRecipientAddress(p.payTo),
        {
          title: p.title,
          description: p.description,
          useCase: p.useCase,
          category: p.category,
          serviceUrl: p.serviceUrl,
          protocol: p.protocol,
          chain: p.chain,
          assetSymbol: p.assetSymbol,
          priceRangeUsd: p.priceRangeUsd,
        },
      ]),
  );

  const rows = graph
    ? aggregateCoUsageProviders(graph, {
        ownPayTo,
        ownPayTos,
        resolveProviderName: resolveKnownProviderName,
        resolveMetadata: (payToWallet) =>
          metadataByPayTo.get(normalizePaymentRecipientAddress(payToWallet)) ?? null,
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
        onboarding={{
          id: "co-usage-providers",
          title: "Find your ecosystem signals",
          description:
            "See which x402 providers your customers use alongside your API, and spot partnership or bundling opportunities.",
          metrics: [
            { label: "Co-used providers", description: "External services that appear with your API usage.", icon: "external" },
            { label: "Shared wallets", description: "Customers who overlap across providers.", icon: "customers" },
            { label: "Co-usage frequency", description: "Which relationships show the strongest usage signal.", icon: "activity" },
            { label: "Opportunity level", description: "Where the next partnership conversation may start.", icon: "spark" },
          ],
        }}
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
            <CoUsageProvidersView rows={rows} providerId={providerId} />
          )}
        </div>
      </div>
    </>
  );
}
