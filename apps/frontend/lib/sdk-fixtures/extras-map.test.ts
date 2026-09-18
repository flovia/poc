import { describe, expect, test } from "bun:test";
import { getCustomers, getExtras, getExtrasMap } from "./index";

describe("customer list extras", () => {
  test("only sends the requested wallets and table fields", async () => {
    const customers = await getCustomers({ serviceId: "quicknode/rpc" });
    const addresses = customers.map((customer) => customer.address);
    const extras = await getExtrasMap(addresses);
    expect([...extras.keys()]).toEqual(addresses);
    for (const [address, row] of extras) {
      const detail = await getExtras(address);
      if (!detail) throw new Error(`Missing wallet extras for ${address}`);
      expect(Object.keys(row).sort()).toEqual(["agentType", "sparkline7d", "usedEndpointsTopK"]);
      expect(row.agentType).toBe(detail.agentType);
      expect(row.sparkline7d).toEqual(detail.sparkline7d);
      expect(row.usedEndpointsTopK).toEqual(detail.usedEndpointsTopK);
    }
    expect(new TextEncoder().encode(JSON.stringify([...extras])).length).toBeLessThan(70_000);
  });

  test("keeps Northwind table extras and ignores missing wallets", async () => {
    const customers = await getCustomers({ serviceId: "northwind-price" });
    const addresses = customers.map((customer) => customer.address);
    const extras = await getExtrasMap([...addresses, "unknown-wallet", addresses[0]!]);
    expect([...extras.keys()]).toEqual(addresses);
    expect([...extras.values()].every((row) => row.sparkline7d.length === 7)).toBe(true);
    expect((await getExtrasMap([])).size).toBe(0);
  });

  test("catalog and lists generate no stories; direct wallet access builds one shared story", () => {
    // Isolate module instrumentation from other fixture tests and start with cold caches.
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "-e",
        `
        import { mock } from "bun:test";
        const shape = await import("./lib/sdk-fixtures/demo-shape");
        const build = shape.buildDemoStory;
        let stories = 0;
        mock.module("./lib/sdk-fixtures/demo-shape", () => ({
          ...shape,
          buildDemoStory(input) { stories++; return build(input); },
        }));
        const fixtures = await import("./lib/sdk-fixtures/index");
        const { getFixtureProviders } = await import("./lib/sdk-fixtures/catalog");
        const { syntheticAddress } = await import("./lib/sdk-fixtures/wallets");
        getFixtureProviders();
        const cold = stories;
        // Resolve a stable deep link without first requesting the provider's list.
        const address = syntheticAddress("snapshot:quicknode/rpc:payer:0", "evm");
        const profile = await fixtures.getCustomerProfile(address);
        const extras = await fixtures.getExtras(address);
        const afterDetail = stories;
        const customers = await fixtures.getCustomers({ serviceId: "quicknode/rpc" });
        await fixtures.getExtrasMap(customers.map(customer => customer.address));
        console.log(JSON.stringify({
          cold, afterDetail, afterList: stories,
          address: profile?.customer.address === address,
          matched: extras?.timelineExtras.every(extra =>
            profile?.timeline.some(event => event.txHash === extra.txHash)),
        }));
      `,
      ],
      cwd: new URL("../../", import.meta.url).pathname,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString())).toEqual({
      cold: 0,
      afterDetail: 1,
      afterList: 1,
      address: true,
      matched: true,
    });
  });
});
