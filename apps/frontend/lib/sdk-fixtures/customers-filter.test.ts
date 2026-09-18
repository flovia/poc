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

  test("does not reuse the SDK demo wallets for unrelated providers", async () => {
    const customers = await getCustomers({ serviceId: "api.nansen.ai" });
    expect(customers).toEqual([]);
  });
});
