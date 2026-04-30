"use client";

import { useMemo, useState } from "react";
import { CustomersTable } from "./CustomersTable";
import { Toolbar } from "./Toolbar";
import type { CustomerListItemDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras } from "@/lib/sdk-fixtures/types";
import {
  DEFAULT_CUSTOMER_FILTER,
  filterAndSortCustomers,
  type CustomerFilterState,
} from "@/lib/customers/filter";

type CustomersBrowserProps = {
  customers: CustomerListItemDto[];
  providerId: string;
  dataMode: DashboardMode;
  extrasMap: Map<string, SdkExtras>;
};

export function CustomersBrowser({
  customers,
  providerId,
  dataMode,
  extrasMap,
}: CustomersBrowserProps) {
  const [state, setState] = useState<CustomerFilterState>(DEFAULT_CUSTOMER_FILTER);
  const filtered = useMemo(() => filterAndSortCustomers(customers, state), [customers, state]);

  return (
    <>
      <Toolbar
        total={customers.length}
        filteredCount={filtered.length}
        state={state}
        onChange={setState}
      />
      <CustomersTable
        customers={filtered}
        providerId={providerId}
        dataMode={dataMode}
        extrasMap={extrasMap}
      />
    </>
  );
}
