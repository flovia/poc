import { TopBar } from "@/components/shell/TopBar";
import { CustomersBrowser } from "@/components/customers/CustomersBrowser";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomersOverview } from "@/components/customers/overview/CustomersOverview";
import { ScopeChip } from "@/components/customers/ScopeChip";
import { SnapshotIndicator } from "@/components/customers/SnapshotIndicator";
import { SummaryChip } from "@/components/customers/SummaryChip";
import { getCustomers, getProviders, getSdkExtrasMap, getSummary } from "@/lib/data-source";
import { formatAtomic } from "@/lib/format";
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
  const total = customers.length;
  const highIntent = customers.filter((c) => c.upsellOpportunity === "high").length;

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
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <ScopeChip network="base" asset="USDC" />
              <SnapshotIndicator generatedAt={summary.generatedAt} />
              <SummaryChip label="Wallets" value={total} hint="payer wallets observed" />
              <SummaryChip
                label="Spend"
                value={formatAtomic(totalSpendAtomic)}
                hint="atomic units (USDC*)"
              />
              <SummaryChip
                label="High upsell"
                value={highIntent}
                accent="blue"
                hint="upsellOpportunity = high"
              />
            </div>
          </div>

          <CustomersOverview customers={customers} />

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
