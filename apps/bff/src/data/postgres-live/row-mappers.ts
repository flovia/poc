import type { CustomerRow, CustomerTransferEvent, ProviderRow } from "./types";

const isBaseCuratedProvider = (serviceId: string) =>
  ["pro-api.coingecko.com", "coingecko", "api.nansen.ai", "nansen"].includes(
    serviceId.toLowerCase(),
  );
const catalogSourceFor = (
  serviceId: string,
  payShProviderFqn: string | undefined,
): ProviderRow["catalogSource"] => {
  if (isBaseCuratedProvider(serviceId)) return "base_curated";
  if (payShProviderFqn) return "pay_sh_curated";
  return "raw_x402";
};
const text = (value: unknown, fallback: string) => String(value ?? fallback);
const optionalText = (value: unknown): string | undefined => {
  const raw = String(value ?? "").trim();
  return raw ? raw : undefined;
};
const count = (value: unknown) => Number(value ?? 0);
const amount = (value: unknown) => String(value ?? "0");
const normalizePaymentAddressForNetwork = (value: unknown, network: string) => {
  const raw = String(value ?? "");
  return network.toLowerCase() === "base" ? raw.toLowerCase() : raw;
};
const optionalProtocol = (value: unknown): "x402" | "MPP" | undefined => {
  if (value === "x402" || value === "MPP") return value;
  return undefined;
};
const optionalPriceRange = (
  min: unknown,
  max: unknown,
): { min: number; max: number } | undefined => {
  const parsedMin = Number(min);
  const parsedMax = Number(max);
  if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) return undefined;
  return { min: parsedMin, max: parsedMax };
};
const optionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean"
    ? value
    : value === "true"
      ? true
      : value === "false"
        ? false
        : undefined;
const parseResources = (value: unknown): ProviderRow["resources"] => {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const resource = optionalText(row.resource ?? row.url);
    if (!resource) return [];
    return [
      {
        resource,
        ...(optionalText(row.network) ? { network: optionalText(row.network) } : {}),
        ...(optionalText(row.asset) ? { asset: optionalText(row.asset) } : {}),
        ...(optionalText(row.amountAtomic) ? { amountAtomic: optionalText(row.amountAtomic) } : {}),
        ...(optionalText(row.description) ? { description: optionalText(row.description) } : {}),
        ...(optionalText(row.method) ? { method: optionalText(row.method) } : {}),
        ...(row.inputSchema !== null && row.inputSchema !== undefined
          ? { inputSchema: row.inputSchema }
          : {}),
        ...(optionalText(row.lastUpdated) ? { lastUpdated: iso(row.lastUpdated, "") } : {}),
        ...(optionalNumber(row.x402Version) !== undefined
          ? { x402Version: optionalNumber(row.x402Version) }
          : {}),
        ...(optionalNumber(row.l30DaysTotalCalls) !== undefined
          ? { l30DaysTotalCalls: optionalNumber(row.l30DaysTotalCalls) }
          : {}),
        ...(optionalNumber(row.l30DaysUniquePayers) !== undefined
          ? { l30DaysUniquePayers: optionalNumber(row.l30DaysUniquePayers) }
          : {}),
        ...(optionalNumber(row.transactionCount) !== undefined
          ? { transactionCount: optionalNumber(row.transactionCount) }
          : {}),
        ...(optionalText(row.totalAmountAtomic)
          ? { totalAmountAtomic: optionalText(row.totalAmountAtomic) }
          : {}),
      },
    ];
  });
};
const parseOffers = (value: unknown): ProviderRow["offers"] => {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const protocol = optionalProtocol(row.protocol);
    const chain = optionalText(row.chain);
    const asset = optionalText(row.asset);
    const payToAddress = optionalText(row.payToAddress);
    if (!protocol || !chain || !asset || !payToAddress) return [];
    return [
      {
        protocol,
        chain,
        asset,
        payToAddress,
        ...(optionalNumber(row.probePriceUsd) !== undefined
          ? { probePriceUsd: optionalNumber(row.probePriceUsd) }
          : {}),
      },
    ];
  });
};
const parseTimelineEvents = (value: unknown): CustomerTransferEvent[] => {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const at = optionalText(row.at);
    const amountAtomic = optionalText(row.amountAtomic ?? row.amount_atomic);
    if (!at || !amountAtomic) return [];
    return [
      {
        at: iso(at, new Date(0).toISOString()),
        amountAtomic,
        ...(optionalText(row.transactionId ?? row.transaction_id)
          ? { transactionId: optionalText(row.transactionId ?? row.transaction_id) }
          : {}),
      },
    ];
  });
};
const iso = (value: unknown, fallback: string) => {
  if (value instanceof Date) return value.toISOString();
  const raw = String(value ?? "");
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};
export const mapProviderRow = (row: Record<string, unknown>): ProviderRow => {
  const network = text(row.network ?? row.chain, "base").toLowerCase();
  const asset = text(row.asset ?? row.asset_symbol, "USDC");
  const payTo = normalizePaymentAddressForNetwork(
    row.pay_to ?? row.payTo ?? row.pay_to_wallet,
    network,
  );
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  const payShProviderFqn = optionalText(row.pay_sh_provider_fqn ?? row.payShProviderFqn);
  return {
    network,
    asset,
    payTo,
    serviceId,
    serviceName,
    catalogSource: catalogSourceFor(serviceId, payShProviderFqn),
    resources: parseResources(row.resources),
    title: optionalText(row.title),
    description: optionalText(row.description),
    useCase: optionalText(row.use_case ?? row.useCase),
    category: optionalText(row.category),
    serviceUrl: optionalText(row.service_url ?? row.serviceUrl),
    hasMetering: optionalBoolean(row.has_metering ?? row.hasMetering),
    hasFreeTier: optionalBoolean(row.has_free_tier ?? row.hasFreeTier),
    providerSha: optionalText(row.provider_sha ?? row.providerSha),
    registryVersion: optionalText(row.registry_version ?? row.registryVersion),
    registryGeneratedAt: optionalText(row.registry_generated_at ?? row.registryGeneratedAt)
      ? iso(row.registry_generated_at ?? row.registryGeneratedAt, "")
      : undefined,
    registrySourceUrl: optionalText(row.registry_source_url ?? row.registrySourceUrl),
    offers: parseOffers(row.offers),
    protocol: optionalProtocol(row.protocol),
    chain: optionalText(row.offer_chain ?? row.chain),
    assetSymbol: optionalText(row.asset_symbol ?? row.assetSymbol),
    priceRangeUsd: optionalPriceRange(row.price_range_min_usd, row.price_range_max_usd),
    payShProviderFqn,
    endpointCount: optionalNumber(row.endpoint_count),
    transactionCount: count(row.transaction_count ?? row.tx_count),
    uniqueSenderCount: count(row.unique_sender_count ?? row.customer_count ?? row.payer_count),
    totalVolumeAtomic: amount(
      row.total_volume_atomic ?? row.total_amount_atomic ?? row.amount_atomic,
    ),
    firstSeenAt: iso(row.first_seen_at ?? row.first_transfer_at, new Date(0).toISOString()),
    lastSeenAt: iso(row.last_seen_at ?? row.latest_transfer_at, new Date(0).toISOString()),
  };
};

export const mapCustomerRow = (row: Record<string, unknown>): CustomerRow => {
  const network = text(row.network ?? row.chain, "base").toLowerCase();
  const asset = text(row.asset ?? row.asset_symbol, "USDC");
  const payTo = normalizePaymentAddressForNetwork(row.pay_to ?? row.payTo, network);
  const payer = normalizePaymentAddressForNetwork(
    row.payer ?? row.payer_address ?? row.from_address ?? row.customer_address,
    network,
  );
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  return {
    network,
    asset,
    payer,
    payTo,
    serviceId,
    serviceName,
    transactionCount: count(row.transaction_count ?? row.tx_count),
    totalVolumeAtomic: amount(
      row.total_volume_atomic ?? row.total_amount_atomic ?? row.amount_atomic,
    ),
    firstSeenAt: iso(row.first_seen_at ?? row.first_transfer_at, new Date(0).toISOString()),
    lastSeenAt: iso(row.last_seen_at ?? row.latest_transfer_at, new Date(0).toISOString()),
    timelineEvents: parseTimelineEvents(row.timeline_events ?? row.timelineEvents),
  };
};
