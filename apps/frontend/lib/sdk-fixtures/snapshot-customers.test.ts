import { describe, expect, test } from "bun:test";
import { STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID } from "@/lib/providers/static-capabilities";
import {
  getSnapshotCustomerProfile,
  getSnapshotCustomers,
  getSnapshotExtras,
  getSnapshotSummaries,
  resolveSnapshotServiceId,
} from "./snapshot-customers";
import { isSyntheticEvmAddress, isSyntheticSolanaAddress } from "./wallets";

describe("snapshot fixture customers", () => {
  test("covers every analytics service, not just QuickNode", () => {
    const summaries = getSnapshotSummaries();
    expect(summaries.size).toBe(55);
    expect(summaries.get("quicknode/rpc")?.customerCount).toBe(92);
    expect(summaries.get("pro-api.coingecko.com")?.customerCount).toBe(43);
    expect(summaries.get("api.nansen.ai")?.customerCount).toBe(7);
    expect(summaries.get("agentmail/email")?.customerCount).toBe(34);
  });

  test("builds synthetic QuickNode payers from the snapshot", () => {
    const customers = getSnapshotCustomers({ serviceId: "quicknode/rpc" });
    expect(customers).toHaveLength(92);
    const payTo = STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get("quicknode/rpc")?.payTo ?? "";
    for (const customer of customers ?? []) {
      const ok =
        isSyntheticEvmAddress(customer.address) || isSyntheticSolanaAddress(customer.address);
      expect(ok).toBe(true);
      expect(customer.address.toLowerCase()).not.toBe(payTo.toLowerCase());
      const extras = getSnapshotExtras(customer.address);
      expect(extras?.sparkline7d).toHaveLength(7);
      expect(extras?.usedEndpointsTopK[0]?.startsWith("/")).toBe(true);
      expect(getSnapshotCustomerProfile(customer.address)?.customer.address).toBe(customer.address);
    }
  });

  test("resolves catalog filters by serviceId, brand, and synthetic payTo", () => {
    expect(resolveSnapshotServiceId({ serviceId: "quicknode/rpc" })).toBe("quicknode/rpc");
    expect(resolveSnapshotServiceId({ serviceId: "quicknode" })).toBe("quicknode/rpc");
    expect(resolveSnapshotServiceId({ serviceId: "northwind-price" })).toBeNull();
    const payTo = STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get("api.nansen.ai")?.payTo;
    expect(resolveSnapshotServiceId({ payTo })).toBe("api.nansen.ai");
  });
});
