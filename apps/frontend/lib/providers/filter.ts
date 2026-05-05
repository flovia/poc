import { normalizeChain, type CustomerChain } from "@/lib/customers/chain";
import { isPreservedBaseProvider } from "@/lib/providers/preserved";
import { STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID } from "@/lib/providers/static-capabilities";
import type { StoredProvider } from "@/lib/types";

export type ProviderSourceFilter = "all" | "pay-sh" | "demo" | "real";

export type ProviderProtocolFilter = "all" | "x402" | "MPP";

export type ProviderFilterState = {
  query: string;
  source: ProviderSourceFilter;
  protocol: ProviderProtocolFilter;
  chains: CustomerChain[];
};

export const DEFAULT_PROVIDER_FILTER: ProviderFilterState = {
  query: "",
  source: "all",
  protocol: "all",
  chains: [],
};

const HIDDEN_PROVIDER_CHAINS = new Set<CustomerChain>([
  "base-sepolia",
  "polygon-amoy",
  "eip155-other",
  "other",
]);

export type ProviderClassifierContext = {
  demoOpted: boolean;
  userIds: ReadonlySet<string>;
  /** Provider ids that match `isDemoProvider` for the current context. Pre-computed so the filter is pure. */
  demoIds: ReadonlySet<string>;
};

function isPaySh(p: StoredProvider): boolean {
  return p.catalogSource === "pay_sh_curated";
}

function isReal(p: StoredProvider, ctx: ProviderClassifierContext): boolean {
  // "real" = user-saved providers. demo seeds and generated catalog rows are excluded.
  if (p.source === "generated") return false;
  if (ctx.demoIds.has(p.providerId)) return false;
  return true;
}

export function chainsOfProvider(p: StoredProvider): CustomerChain[] {
  const capability = p.serviceId
    ? STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(p.serviceId)
    : undefined;
  const raw =
    p.networks && p.networks.length > 0
      ? p.networks
      : p.network
        ? [p.network]
        : (capability?.networks ?? []);
  if (raw.length === 0) return [];
  const seen = new Set<CustomerChain>();
  const named: CustomerChain[] = [];
  const trailing: CustomerChain[] = [];
  for (const r of raw) {
    const c = normalizeChain(r);
    if (seen.has(c)) continue;
    seen.add(c);
    if (c === "other" || c === "eip155-other") trailing.push(c);
    else named.push(c);
  }
  return [...named, ...trailing];
}

export function visibleProviderChains(chains: CustomerChain[]): CustomerChain[] {
  return chains.filter((chain) => !HIDDEN_PROVIDER_CHAINS.has(chain));
}

export function collectAvailableChains(providers: StoredProvider[]): CustomerChain[] {
  const seen = new Set<CustomerChain>();
  for (const p of providers) {
    for (const c of visibleProviderChains(chainsOfProvider(p))) seen.add(c);
  }
  return Array.from(seen);
}

export function protocolsOfProvider(p: StoredProvider): ("x402" | "MPP")[] {
  if (p.protocols && p.protocols.length > 0) return p.protocols;
  const capability = p.serviceId
    ? STATIC_PROVIDER_CAPABILITY_BY_SERVICE_ID.get(p.serviceId)
    : undefined;
  if (capability) return capability.protocols;
  return isPreservedBaseProvider(p.serviceId) ? ["x402"] : [];
}

function matchesQuery(p: StoredProvider, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.name.toLowerCase().includes(q)) return true;
  if (p.serviceId && p.serviceId.toLowerCase().includes(q)) return true;
  return false;
}

function matchesSource(
  p: StoredProvider,
  source: ProviderSourceFilter,
  ctx: ProviderClassifierContext,
): boolean {
  if (source === "all") return true;
  if (source === "pay-sh") return isPaySh(p);
  if (source === "demo") return ctx.demoIds.has(p.providerId);
  return isReal(p, ctx);
}

function matchesChains(p: StoredProvider, selected: CustomerChain[]): boolean {
  if (selected.length === 0) return true;
  const own = chainsOfProvider(p);
  if (own.length === 0) return false;
  const set = new Set(own);
  return selected.some((c) => set.has(c));
}

function matchesProtocol(p: StoredProvider, selected: ProviderProtocolFilter): boolean {
  if (selected === "all") return true;
  const protos = protocolsOfProvider(p);
  if (protos.length === 0) return false;
  return protos.includes(selected);
}

export function filterProviders(
  providers: StoredProvider[],
  state: ProviderFilterState,
  ctx: ProviderClassifierContext,
): StoredProvider[] {
  return providers.filter(
    (p) =>
      matchesQuery(p, state.query) &&
      matchesSource(p, state.source, ctx) &&
      matchesProtocol(p, state.protocol) &&
      matchesChains(p, state.chains),
  );
}
