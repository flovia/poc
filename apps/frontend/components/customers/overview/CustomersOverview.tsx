import type { CustomerListItemDto } from "@/lib/api/types";
import {
  computeParetoCurve,
  computeProviderSpread,
  computeRecencyMatrix,
} from "@/lib/customers/overview";
import { ParetoChart } from "./ParetoChart";
import { ProviderSpreadChart } from "./ProviderSpreadChart";
import { RecencyMatrixChart } from "./RecencyMatrixChart";

type CustomersOverviewProps = {
  customers: CustomerListItemDto[];
};

export function CustomersOverview({ customers }: CustomersOverviewProps) {
  const pareto = computeParetoCurve(customers);
  const matrix = computeRecencyMatrix(customers);
  const spread = computeProviderSpread(customers);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
        marginBottom: 20,
      }}
    >
      <ParetoChart curve={pareto} />
      <RecencyMatrixChart matrix={matrix} />
      <ProviderSpreadChart spread={spread} />
    </div>
  );
}
