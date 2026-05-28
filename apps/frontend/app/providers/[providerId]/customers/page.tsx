import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { CustomersBrowser } from "@/components/customers/CustomersBrowser";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomersOverview } from "@/components/customers/overview/CustomersOverview";
import { SnapshotIndicator } from "@/components/customers/SnapshotIndicator";
import { getCustomers, getProviders, getSdkExtrasMap, getSummary } from "@/lib/data-source";
import { buildNoCustomerFactsNotice } from "@/lib/customers/empty-state";
import { providerRouteId } from "@/lib/provider-routes";
import { findProviderByRouteId } from "@/lib/providers";
import { getProviderBalanceContext } from "@/lib/provider-enrichment";
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
  const routeProviderId = providerRouteId(activeProvider);
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
  const noCustomerFactsNotice = buildNoCustomerFactsNotice(activeProvider, customers.length);
  const balanceContext = getProviderBalanceContext(activeProvider);

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
        <div className="customers-page-pad">
          <div className="customers-page-head">
            <CustomersHeader providerId={resolvedProviderId} balanceContext={balanceContext} />
            <SnapshotIndicator generatedAt={summary.generatedAt} />
          </div>

          {noCustomerFactsNotice ? (
            <article
              className="card"
              style={{ padding: 24, marginBottom: 20, borderColor: "rgba(245, 158, 11, 0.35)" }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
                {noCustomerFactsNotice.title}
              </div>
              <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 820 }}>
                {noCustomerFactsNotice.body}
              </p>
              <div
                className="mono"
                style={{ marginTop: 14, display: "grid", gap: 4, color: "var(--text-3)", fontSize: 12 }}
              >
                {noCustomerFactsNotice.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </div>
            </article>
          ) : (
            <CustomersOverview
              customers={customers}
              totalSpendAtomic={totalSpendAtomic}
              providerName={activeProvider?.name ?? providerId}
            />
          )}

          <CustomersBrowser
            customers={customers}
            providerId={routeProviderId}
            dataMode={pageCtx.dataMode}
            extrasMap={extrasMap}
          />
        </div>
      </div>
    </>
  );
}
