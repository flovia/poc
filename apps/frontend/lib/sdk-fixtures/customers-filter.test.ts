import { describe, expect, test } from "bun:test";
import { getCustomers } from "./index";

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

  test("fills providers that have no snapshot rows with the QuickNode demo cohort", async () => {
    const vectormind = await getCustomers({ serviceId: "vectormind" });
    const lumen = await getCustomers({ serviceId: "lumen-vec" });
    const unknown = await getCustomers({ serviceId: "brand-new-demo-api" });
    expect(vectormind.length).toBe(92);
    expect(lumen.length).toBe(92);
    expect(unknown.length).toBe(92);
    expect(vectormind.some((customer) => customer.providerCount >= 2)).toBe(true);
  });
});
