import { describe, expect, test } from "bun:test";
import { STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID } from "@/lib/providers/static-capabilities";
import { QUICKNODE_CUSTOMER_STATS } from "./quicknode-customer-stats";
import {
  QUICKNODE_FIXTURE_SUMMARY,
  QUICKNODE_SERVICE_ID,
  getQuicknodeCustomerProfile,
  getQuicknodeCustomers,
  getQuicknodeExtras,
  isQuicknodeCustomerFilter,
} from "./quicknode-customers";
import { isSyntheticEvmAddress, isSyntheticSolanaAddress } from "./wallets";

describe("QuickNode fixture customers", () => {
  test("matches the analytics snapshot size and volume", () => {
    const customers = getQuicknodeCustomers();
    expect(customers).toHaveLength(92);
    expect(customers).toHaveLength(QUICKNODE_CUSTOMER_STATS.length);
    expect(QUICKNODE_FIXTURE_SUMMARY.observationCount).toBe(463);
    expect(QUICKNODE_FIXTURE_SUMMARY.totalVolumeAtomic).toBe("2722000000");
  });

  test("uses synthetic addresses and snapshot chains", () => {
    const customers = getQuicknodeCustomers();
    const chains = new Set(customers.flatMap((customer) => customer.chains ?? []));
    expect(chains.has("solana")).toBe(true);
    expect(chains.has("base")).toBe(true);
    for (const customer of customers) {
      const ok =
        isSyntheticEvmAddress(customer.address) || isSyntheticSolanaAddress(customer.address);
      expect(ok).toBe(true);
      expect(customer.address.toLowerCase()).not.toBe(
        (
          STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(QUICKNODE_SERVICE_ID)?.payTo ?? ""
        ).toLowerCase(),
      );
      const extras = getQuicknodeExtras(customer.address);
      expect(extras?.sparkline7d).toHaveLength(7);
      expect(extras?.usedEndpointsTopK[0]?.startsWith("/")).toBe(true);
      expect(getQuicknodeCustomerProfile(customer.address)?.customer.address).toBe(
        customer.address,
      );
    }
  });

  test("matches QuickNode catalog filters only", () => {
    expect(isQuicknodeCustomerFilter({ serviceId: "quicknode/rpc" })).toBe(true);
    expect(isQuicknodeCustomerFilter({ serviceId: "pro-api.coingecko.com" })).toBe(false);
    const payTo = STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(QUICKNODE_SERVICE_ID)?.payTo;
    expect(isQuicknodeCustomerFilter({ payTo })).toBe(true);
  });
});
