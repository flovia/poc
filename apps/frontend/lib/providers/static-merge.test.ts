import { describe, expect, it } from "bun:test";
import { buildStaticProviderRouteId, mergeStaticProviders } from "./static-merge";
import { STATIC_PROVIDER_CAPABILITIES, type StaticProviderCapability } from "./static-capabilities";

type Item = { providerId: string; serviceId?: string; name?: string };

describe("mergeStaticProviders", () => {
  const factory = (capability: StaticProviderCapability, routeId: string): Item => ({
    providerId: routeId,
    serviceId: capability.serviceId,
    name: capability.name,
  });

  it("appends every static capability when the live list is empty", () => {
    const merged = mergeStaticProviders<Item>([], factory);
    expect(merged.length).toBe(STATIC_PROVIDER_CAPABILITIES.length);
    expect(merged.every((m) => m.providerId.startsWith("static-"))).toBe(true);
  });

  it("skips static capabilities whose serviceId is already present in the live list", () => {
    const sample = STATIC_PROVIDER_CAPABILITIES[0]!;
    const live: Item[] = [
      { providerId: "live-1", serviceId: sample.serviceId, name: "Live winner" },
    ];
    const merged = mergeStaticProviders<Item>(live, factory);
    const dupes = merged.filter((m) => m.serviceId === sample.serviceId);
    expect(dupes.length).toBe(1);
    expect(dupes[0]!.providerId).toBe("live-1");
  });

  it("preserves the relative order: live entries first, static additions after", () => {
    const live: Item[] = [{ providerId: "live-1", serviceId: "live-only/foo", name: "Live" }];
    const merged = mergeStaticProviders<Item>(live, factory);
    expect(merged[0]).toEqual(live[0]!);
    expect(merged.slice(1).every((m) => m.providerId.startsWith("static-"))).toBe(true);
  });

  it("ignores live entries without a serviceId when deduping", () => {
    const live: Item[] = [{ providerId: "live-no-svc" }];
    const merged = mergeStaticProviders<Item>(live, factory);
    // No serviceId means no dedup signal; every static entry is added.
    expect(merged.length).toBe(1 + STATIC_PROVIDER_CAPABILITIES.length);
  });
});

describe("buildStaticProviderRouteId", () => {
  it("derives a route id by slugifying the serviceId", () => {
    expect(buildStaticProviderRouteId("solana-foundation/alibaba/anytrans")).toBe(
      "static-solana-foundation-alibaba-anytrans",
    );
  });

  it("collapses non-alphanumerics and trims dashes", () => {
    expect(buildStaticProviderRouteId("Foo / Bar  Baz!")).toBe("static-foo-bar-baz");
  });
});
