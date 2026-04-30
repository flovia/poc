import { TopBar } from "@/components/shell/TopBar";
import { CustomersHeader } from "@/components/customers/CustomersHeader";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { SummaryChip } from "@/components/customers/SummaryChip";
import { Toolbar } from "@/components/customers/Toolbar";
import { getCustomers, getSdkExtrasMap } from "@/lib/data-source";
import { formatAtomic } from "@/lib/format";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const [customers, extrasMap, pageCtx] = await Promise.all([
    getCustomers(),
    getSdkExtrasMap(),
    getTopBarPageContext(),
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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

          <Toolbar total={total} />

          <CustomersTable
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
