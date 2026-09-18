import { describe, expect, test } from "bun:test";
import { getCustomerProfile, getCustomers, getExtras } from "./index";

describe("fixture getCustomers", () => {
  test("returns QuickNode snapshot payers for the QuickNode catalog", async () => {
    const customers = await getCustomers({ serviceId: "quicknode/rpc" });
    expect(customers).toHaveLength(92);
  });

  test("keeps the SDK demo wallets for Northwind", async () => {
    const customers = await getCustomers({ serviceId: "northwind-price" });
    expect(customers).toHaveLength(5);
  });

  test("returns snapshot payers for other catalog providers", async () => {
    const nansen = await getCustomers({ serviceId: "api.nansen.ai" });
    const coingecko = await getCustomers({ serviceId: "pro-api.coingecko.com" });
    const agentmail = await getCustomers({ serviceId: "agentmail/email" });
    expect(nansen.length).toBe(7);
    expect(coingecko.length).toBe(43);
    expect(agentmail.length).toBe(34);
  });

  test("fills providers without snapshots with a compact, varied demo cohort", async () => {
    const vectormind = await getCustomers({ serviceId: "vectormind" });
    const lumen = await getCustomers({ serviceId: "lumen-vec" });
    const unknown = await getCustomers({ serviceId: "brand-new-demo-api" });
    expect(vectormind.length).toBe(24);
    expect(lumen.length).toBe(24);
    expect(unknown.length).toBe(24);
    expect(vectormind.some((customer) => customer.providerCount >= 2)).toBe(true);
    expect(vectormind.some((customer) => customer.providerCount === 1)).toBe(true);
    expect(vectormind.some((customer) => customer.activityGrowth < 0)).toBe(true);
  });

  test("shared fallback shapes keep wallet details tied to the selected provider", async () => {
    for (const serviceId of ["vectormind", "lumen-vec", "brand-new-demo-api"]) {
      const customers = await getCustomers({ serviceId });
      const address = customers[0]!.address;
      const profile = await getCustomerProfile(address);
      const extras = await getExtras(address);
      expect(profile?.customer.address).toBe(address);
      expect(profile?.providers[0]?.providerId).toBe(serviceId);
      expect(extras?.usedEndpointsTopK[0]).toBe(`/${serviceId}`);
      expect(profile?.timeline.length).toBeGreaterThanOrEqual(28);
    }
  });
});
