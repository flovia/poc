import { aggregateProviderRouteId } from "@/lib/providers";

type ProviderRouteSource = {
  providerId: string;
  serviceId?: string;
};

export function providerRouteId(provider: ProviderRouteSource): string {
  return provider.serviceId ? aggregateProviderRouteId(provider.serviceId) : provider.providerId;
}

export function walletProfileHref(providerId: string, address: string): string {
  return `/${providerId}/wallet/${encodeURIComponent(address)}`;
}
