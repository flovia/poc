// Provider serviceIds whose rows are sourced from the BFF base on-chain
// analytics store rather than the Pay.sh atlas. They share the same
// "generated" source flag as atlas providers because they all flow through
// the BFF catalog, but UI affordances (e.g. the Pay.sh badge) should treat
// them as a separate origin.

const PRESERVED_BASE_PROVIDER_SERVICE_IDS: ReadonlySet<string> = new Set([
  "pro-api.coingecko.com",
  "coingecko",
  "api.nansen.ai",
  "nansen",
]);

export function isPreservedBaseProvider(serviceId: string | undefined): boolean {
  if (!serviceId) return false;
  return PRESERVED_BASE_PROVIDER_SERVICE_IDS.has(serviceId);
}
