import { TopBar } from "@/components/shell/TopBar";
import { CustomersBrowser } from "@/components/customers/CustomersBrowser";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomersOverview } from "@/components/customers/overview/CustomersOverview";
import { SnapshotIndicator } from "@/components/customers/SnapshotIndicator";
import { getCustomers, getProviders, getSdkExtrasMap, getSummary } from "@/lib/data-source";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const providers = await getProviders();
  const activeProvider = providers.find((provider) => provider.providerId === providerId);
  const payTo = activeProvider?.payTo;
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
        providerId={providerId}
        crumbs={[{ label: "Customers" }]}
        dataMode={pageCtx.dataMode}
        onboarding={{
          id: "my-customers",
          title: "Understand your customers",
          description:
            "See who is adopting your API, where usage is growing, and which accounts are worth your attention.",
          metrics: [
            { label: "Customer count", description: "The scale of your active customer base.", icon: "customers" },
            { label: "Request volume", description: "Which customers drive the most API usage.", icon: "activity" },
            { label: "Growth trend", description: "Where adoption is gaining or losing momentum.", icon: "growth" },
            { label: "Retention", description: "How consistently customers keep coming back.", icon: "repeat" },
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
            <CustomersHeader providerId={providerId} />
            <SnapshotIndicator generatedAt={summary.generatedAt} />
          </div>

          <CustomersOverview
            customers={customers}
            totalSpendAtomic={totalSpendAtomic}
            providerName={activeProvider?.name ?? providerId}
          />

          <CustomersBrowser
            customers={customers}
            providerId={providerId}
            dataMode={pageCtx.dataMode}
            extrasMap={extrasMap}
          />
        </div>
      </div>
    </>
  );
}
