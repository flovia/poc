import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { CustomersBrowser } from "@/components/customers/CustomersBrowser";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomersOverview } from "@/components/customers/overview/CustomersOverview";
import { SnapshotIndicator } from "@/components/customers/SnapshotIndicator";
import { getCustomers, getProviders, getSdkExtrasMap, getSummary } from "@/lib/data-source";
import { findProviderByRouteId } from "@/lib/providers";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const providers = await getProviders();
  const activeProvider = findProviderByRouteId(providers, providerId);
  if (!activeProvider?.payTo) notFound();
  const payTo = activeProvider.payTo;
  const resolvedProviderId = activeProvider.providerId;
  const [customers, extrasMap, pageCtx, summary] = await Promise.all([
    getCustomers(payTo),
    getSdkExtrasMap(),
    getTopBarPageContext(),
    getSummary(payTo),
  ]);

  const totalSpendAtomic = customers
    .reduce((acc, c) => acc + BigInt(c.spendAtomic), 0n)
    .toString();

  return (
    <>
      <TopBar
        providerId={resolvedProviderId}
        crumbs={[{ label: "Customers" }]}
        dataMode={pageCtx.dataMode}
        onboarding={{
          id: "my-customers-wallet-profile",
          title: "Understand your customers",
          description:
            "Click a wallet address to open a Flovia profile for that payer: spend history, AI agent context, endpoint usage, and cross-provider activity in one place.",
          metrics: [
            { label: "Customer count", description: "The scale of your active customer base.", icon: "customers" },
            {
              label: "Wallet profiles",
              description:
                "Click a wallet address to open an internal profile, not a block explorer: spend history, AI agent context, endpoint usage, and cross-provider activity.",
              icon: "spark",
            },
            { label: "Request volume", description: "Which wallets drive the most API usage.", icon: "activity" },
            {
              label: "Network signals",
              description: "How the same payer wallet appears across providers and use cases.",
              icon: "external",
            },
          ],
          visual: "walletProfile",
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
            <CustomersHeader providerId={resolvedProviderId} />
            <SnapshotIndicator generatedAt={summary.generatedAt} />
          </div>

          <CustomersOverview
            customers={customers}
            totalSpendAtomic={totalSpendAtomic}
            providerName={activeProvider?.name ?? providerId}
          />

          <CustomersBrowser
            customers={customers}
            providerId={resolvedProviderId}
            dataMode={pageCtx.dataMode}
            extrasMap={extrasMap}
          />
        </div>
      </div>
    </>
  );
}
