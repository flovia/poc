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
  const payTo = providers.find((provider) => provider.providerId === providerId)?.payTo;
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

          <CustomersOverview customers={customers} totalSpendAtomic={totalSpendAtomic} />

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
