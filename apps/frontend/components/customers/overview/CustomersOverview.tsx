import type { CustomerListItemDto } from "@/lib/api/types";
import {
  computeProviderSpread,
  computeRecencyMatrix,
} from "@/lib/customers/overview";
import { ProviderSpreadChart } from "./ProviderSpreadChart";
import { RecencyMatrixChart } from "./RecencyMatrixChart";
import { WalletsSpendCard } from "./WalletsSpendCard";

type CustomersOverviewProps = {
  customers: CustomerListItemDto[];
  totalSpendAtomic: string;
};

export function CustomersOverview({ customers, totalSpendAtomic }: CustomersOverviewProps) {
  const matrix = computeRecencyMatrix(customers);
  const spread = computeProviderSpread(customers);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
        gridTemplateRows: "auto auto",
        gridTemplateAreas: '"totals recency" "spread recency"',
        gap: 14,
        marginBottom: 20,
      }}
    >
      <div style={{ gridArea: "totals", display: "flex", minWidth: 0 }}>
        <WalletsSpendCard walletCount={customers.length} totalSpendAtomic={totalSpendAtomic} />
      </div>
      <div style={{ gridArea: "spread", display: "flex", minWidth: 0 }}>
        <ProviderSpreadChart spread={spread} />
      </div>
      <div style={{ gridArea: "recency", display: "flex", minWidth: 0 }}>
        <RecencyMatrixChart matrix={matrix} />
      </div>
    </div>
  );
}
