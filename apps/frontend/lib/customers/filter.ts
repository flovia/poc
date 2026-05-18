import type { CustomerListItemDto } from "@/lib/api/types";
import { getCustomerChainAttribution, type CustomerChainFilter } from "./chain";

export type CustomerSortKey = "spend" | "observations" | "providers" | "lastSeen";

export type CustomerFilterState = {
  query: string;
  sort: CustomerSortKey;
  chain: CustomerChainFilter;
};

export const DEFAULT_CUSTOMER_FILTER: CustomerFilterState = {
  query: "",
  sort: "spend",
  chain: "all",
};

const compareBigIntDesc = (a: string, b: string): number => {
  const ba = BigInt(a);
  const bb = BigInt(b);
  if (ba === bb) return 0;
  return ba > bb ? -1 : 1;
};

const sortComparators: Record<
  CustomerSortKey,
  (a: CustomerListItemDto, b: CustomerListItemDto) => number
> = {
  spend: (a, b) => compareBigIntDesc(a.spendAtomic, b.spendAtomic),
  observations: (a, b) => b.observationCount - a.observationCount,
  providers: (a, b) => b.providerCount - a.providerCount,
  lastSeen: (a, b) => b.lastSeenAt - a.lastSeenAt,
};

const compareSolanaFirst = (a: CustomerListItemDto, b: CustomerListItemDto): number => {
  const aHasSolana = getCustomerChainAttribution(a).chains.includes("solana");
  const bHasSolana = getCustomerChainAttribution(b).chains.includes("solana");
  if (aHasSolana === bHasSolana) return 0;
  return aHasSolana ? -1 : 1;
};

export function filterAndSortCustomers(
  customers: readonly CustomerListItemDto[],
  state: CustomerFilterState,
): CustomerListItemDto[] {
  const trimmedQuery = state.query.trim().toLowerCase();
  const filtered = customers.filter((c) => {
    if (trimmedQuery.length > 0 && !c.address.toLowerCase().includes(trimmedQuery)) return false;
    if (state.chain !== "all" && !getCustomerChainAttribution(c).chains.includes(state.chain)) {
      return false;
    }
    return true;
  });
  return [...filtered].sort(
    (a, b) => compareSolanaFirst(a, b) || sortComparators[state.sort](a, b),
  );
}
