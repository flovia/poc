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
  const resolvedProviderId = activeProvider.providerId;
  const filter = activeProvider?.serviceId
    ? { serviceId: activeProvider.serviceId }
    : { payTo: activeProvider.payTo };
  const [customers, extrasMap, pageCtx, summary] = await Promise.all([
    getCustomers(filter),
    getSdkExtrasMap(),
    getTopBarPageContext(),
    getSummary(filter),
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
            "View the payer wallets consuming your API, how much they spend, when they were last active, and who warrants follow up. Click on any wallet to access its expanded view.",
          metrics: [
            { label: "Payer wallets", description: "See how many unique wallets are calling your API.", icon: "customers" },
            { label: "Account segments", description: "Prioritize key, emerging, at-risk, and dormant accounts by recency and spend.", icon: "spark" },
            { label: "Usage and spend", description: "Find the wallets driving the most API activity and revenue.", icon: "activity" },
            {
              label: "Wallet profiles",
              description: "Open a wallet to review spend history, endpoint usage, AI context, and cross-provider activity.",
              icon: "spark",
            },
            {
              label: "Provider spread",
              description: "See whether payers are exclusive to your API or active across other providers.",
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
