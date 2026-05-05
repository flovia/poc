#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { parsePayskillsAtlas, type AtlasProvider } from "./lib/atlas-parser";

type AnalyticsProviderRow = {
  providerId: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  useCase?: string | null;
  category?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceUrl?: string | null;
  endpointCount?: number | null;
  hasMetering?: boolean | null;
  hasFreeTier?: boolean | null;
  providerSha?: string | null;
  registryVersion?: string | null;
  registryGeneratedAt?: string | null;
  registrySourceUrl?: string | null;
  priceRangeUsd?: { min: number; max: number } | null;
  offers?: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payTo?: string;
    payToAddress?: string;
    probePriceUsd?: number;
  }>;
  payTo: string;
  network: string;
  asset: string;
  resources?: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    description?: string;
    method?: string;
    inputSchema?: unknown;
    lastUpdated?: string;
    x402Version?: number;
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    transactionCount?: number;
    totalAmountAtomic?: string;
  }>;
};

type AnalyticsX402Service = {
  payTo?: string | null;
  resource?: string | null;
  network?: string | null;
  asset?: string | null;
  transactionCount?: number | null;
  totalAmountAtomic?: string | null;
};

type AnalyticsFile = {
  providers?: { providers?: AnalyticsProviderRow[] };
  intelligenceByAddress?: Record<string, { x402Services?: AnalyticsX402Service[] }>;
};

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_ATLAS_PATH = path.join(REPO_ROOT, "docs", "research", "pay-skills-payment-atlas.md");
const DEFAULT_ANALYTICS_PATH = path.join(
  REPO_ROOT,
  "apps",
  "bff",
  "fixtures",
  "generated",
  "analytics.json",
);
const DEFAULT_OUTPUT_PATH = path.join(REPO_ROOT, "reports", "analytics", "geo-source.json");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "..", "poc-data", "geo-source");

const parseArg = (name: string, fallback: string): string => {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1] as string;
  return fallback;
};

const hasFlag = (name: string): boolean => process.argv.slice(2).includes(`--${name}`);

const hostnameOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const apexLabelOf = (host: string): string | null => {
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  return labels[labels.length - 2] ?? null;
};

const matchesAtlas = (
  atlasProvider: AtlasProvider,
  serviceId: string,
  serviceUrl: string | null | undefined,
): boolean => {
  const sidLower = serviceId.toLowerCase();
  const atlasHost = hostnameOf(atlasProvider.serviceUrl);
  if (atlasHost && atlasHost === sidLower) return true;

  const serviceHost = hostnameOf(serviceUrl);
  if (serviceHost && atlasHost && serviceHost === atlasHost) return true;

  if (atlasProvider.serviceUrl.toLowerCase().includes(sidLower)) return true;

  if (!sidLower.includes(".")) return false;
  const apex = apexLabelOf(sidLower);
  if (!apex || apex.length < 3) return false;

  const fqnSegments = atlasProvider.fqn.toLowerCase().split("/").filter(Boolean);
  return fqnSegments.includes(apex);
};

const normalizeOfferNetwork = (chain: string, protocol: string): string => {
  const normalized = chain.toLowerCase();
  if ((normalized === "solana" || normalized === "solana mainnet") && protocol === "MPP") {
    return "solana mainnet (mpp)";
  }
  if (normalized === "solana") return "solana mainnet";
  return normalized;
};

const normalizeOfferAsset = (asset: string): string => {
  const lower = asset.toLowerCase();
  if (lower === "usdc") return "USDC";
  if (lower === "usdt") return "USDT";
  return asset;
};

const normalizePayTo = (payTo: string, network: string): string =>
  network.toLowerCase() === "base" ? payTo.toLowerCase() : payTo;

const observedEndpointSlots = (analytics: AnalyticsFile) => {
  const slots: Array<{ walletAddress: string } & AnalyticsX402Service> = [];
  for (const [walletAddress, entry] of Object.entries(analytics.intelligenceByAddress ?? {})) {
    for (const slot of entry.x402Services ?? []) {
      if (slot.resource) slots.push({ walletAddress, ...slot });
    }
  }
  return slots;
};

const aggregateObservedEndpoints = (
  slots: Array<{ walletAddress: string } & AnalyticsX402Service>,
  targetHost: string,
) => {
  const endpoints = new Map<
    string,
    {
      resource: string;
      networks: Set<string>;
      assets: Set<string>;
      transactionCount: number;
      totalAmountAtomic: bigint;
      sourceWallets: Set<string>;
    }
  >();

  for (const slot of slots) {
    if (!slot.resource || hostnameOf(slot.resource) !== targetHost) continue;
    const endpoint = endpoints.get(slot.resource) ?? {
      resource: slot.resource,
      networks: new Set<string>(),
      assets: new Set<string>(),
      transactionCount: 0,
      totalAmountAtomic: 0n,
      sourceWallets: new Set<string>(),
    };
    if (slot.network) endpoint.networks.add(slot.network);
    if (slot.asset) endpoint.assets.add(slot.asset);
    endpoint.transactionCount += slot.transactionCount ?? 0;
    try {
      endpoint.totalAmountAtomic += BigInt(slot.totalAmountAtomic ?? "0");
    } catch {
      // Ignore malformed historical totals; preserve other endpoint fields.
    }
    endpoint.sourceWallets.add(slot.walletAddress);
    endpoints.set(slot.resource, endpoint);
  }

  return Array.from(endpoints.values())
    .map((endpoint) => ({
      resource: endpoint.resource,
      networks: Array.from(endpoint.networks).sort(),
      assets: Array.from(endpoint.assets).sort(),
      transactionCount: endpoint.transactionCount,
      totalAmountAtomic: endpoint.totalAmountAtomic.toString(),
      sourceWalletCount: endpoint.sourceWallets.size,
    }))
    .sort(
      (a, b) => b.transactionCount - a.transactionCount || a.resource.localeCompare(b.resource),
    );
};

const resourcesFromProviderRow = (row: AnalyticsProviderRow) =>
  (row.resources ?? []).map((resource) => ({
    resource: resource.resource,
    description: resource.description,
    method: resource.method,
    inputSchema: resource.inputSchema,
    lastUpdated: resource.lastUpdated,
    x402Version: resource.x402Version,
    l30DaysTotalCalls: resource.l30DaysTotalCalls,
    l30DaysUniquePayers: resource.l30DaysUniquePayers,
    networks: resource.network ? [resource.network] : [],
    assets: resource.asset ? [resource.asset] : [],
    transactionCount: resource.transactionCount ?? resource.l30DaysTotalCalls ?? 0,
    totalAmountAtomic: resource.totalAmountAtomic ?? resource.amountAtomic ?? "0",
  }));

export const buildGeoSourcePayload = (input: {
  atlasMarkdown: string;
  analytics: AnalyticsFile;
  generatedAt: string;
  atlasPath: string;
  analyticsPath: string;
}) => {
  const atlas = parsePayskillsAtlas(input.atlasMarkdown);
  const analyticsProviderRows = input.analytics.providers?.providers ?? [];
  const endpointSlots = observedEndpointSlots(input.analytics);

  const geoProviders = analyticsProviderRows.map((row) => {
    const serviceId = String(row.serviceId ?? row.serviceName ?? row.name ?? "").trim();
    const matched = serviceId
      ? (atlas.providers.find((provider) => matchesAtlas(provider, serviceId, row.serviceUrl)) ??
        null)
      : null;
    const targetHost = (
      hostnameOf(matched?.serviceUrl ?? row.serviceUrl ?? null) ?? serviceId.toLowerCase()
    ).toLowerCase();
    const observedEndpoints = targetHost
      ? aggregateObservedEndpoints(endpointSlots, targetHost)
      : [];
    const rowOffers = (row.offers ?? []).map((offer) => ({
      protocol: offer.protocol,
      chain: offer.chain,
      asset: offer.asset,
      payTo: offer.payTo ?? offer.payToAddress ?? row.payTo,
      probePriceUsd: offer.probePriceUsd ?? 0,
    }));

    return {
      providerId: row.providerId,
      payTo: row.payTo,
      network: row.network,
      asset: row.asset,
      serviceId,
      serviceUrl: matched?.serviceUrl ?? row.serviceUrl ?? null,
      title: matched?.title ?? row.title ?? row.name ?? null,
      category: matched?.category ?? row.category ?? null,
      description: matched?.description ?? row.description ?? null,
      useCase: matched?.useCase ?? row.useCase ?? null,
      endpointCount: matched?.endpointCount ?? row.resources?.length ?? row.endpointCount ?? null,
      priceRangeUsd: matched?.priceRangeUsd ?? row.priceRangeUsd ?? null,
      hasMetering: row.hasMetering ?? null,
      hasFreeTier: row.hasFreeTier ?? null,
      providerSha: row.providerSha ?? null,
      registryVersion: row.registryVersion ?? null,
      registryGeneratedAt: row.registryGeneratedAt ?? null,
      registrySourceUrl: row.registrySourceUrl ?? null,
      offers: matched?.offers ?? rowOffers,
      observedEndpoints: observedEndpoints.length
        ? observedEndpoints
        : resourcesFromProviderRow(row),
      atlas: matched ? { matched: true, fqn: matched.fqn } : { matched: false, fqn: null },
      atlasMissing: matched === null,
    };
  });

  const geoSpecs = atlas.providers.map((provider) => {
    const matchedRows = geoProviders.filter((row) => row.atlas.fqn === provider.fqn);
    const pathMap = new Map<
      string,
      {
        resource: string;
        description?: string;
        method?: string;
        networks: Set<string>;
        assets: Set<string>;
        transactionCount: number;
        totalAmountAtomic: bigint;
      }
    >();

    for (const row of matchedRows) {
      for (const endpoint of row.observedEndpoints) {
        const pathKey = (() => {
          try {
            const url = new URL(endpoint.resource);
            return `${url.pathname}${url.search}` || "/";
          } catch {
            return endpoint.resource;
          }
        })();
        const existing = pathMap.get(pathKey) ?? {
          resource: pathKey,
          description: "description" in endpoint ? endpoint.description : undefined,
          method: "method" in endpoint ? endpoint.method : undefined,
          networks: new Set<string>(),
          assets: new Set<string>(),
          transactionCount: 0,
          totalAmountAtomic: 0n,
        };
        for (const network of endpoint.networks) existing.networks.add(network);
        for (const asset of endpoint.assets) existing.assets.add(asset);
        // The old frontend lookup attached the same host-level observed endpoint
        // list to every chain × asset × payTo row for a provider. At the GEO
        // spec granularity, merge chains/assets but keep the observed usage once.
        existing.transactionCount = Math.max(existing.transactionCount, endpoint.transactionCount);
        try {
          const amount = BigInt(endpoint.totalAmountAtomic);
          if (amount > existing.totalAmountAtomic) existing.totalAmountAtomic = amount;
        } catch {
          // Keep the endpoint row even if a historical amount is malformed.
        }
        pathMap.set(pathKey, existing);
      }
    }

    const apiPathsObserved = Array.from(pathMap.values())
      .map((endpoint) => ({
        resource: endpoint.resource,
        method: endpoint.method ?? null,
        description: endpoint.description ?? null,
        chains: Array.from(endpoint.networks).sort(),
        assets: Array.from(endpoint.assets).sort(),
        transactionCount: endpoint.transactionCount,
        observedSpendAtomic: endpoint.totalAmountAtomic.toString(),
      }))
      .sort(
        (a, b) => b.transactionCount - a.transactionCount || a.resource.localeCompare(b.resource),
      );

    return {
      providerFqn: provider.fqn,
      title: provider.title,
      description: provider.description,
      useCase: provider.useCase,
      serviceUrl: provider.serviceUrl,
      category: provider.category,
      endpointCount: provider.endpointCount,
      hasMetering: null,
      hasFreeTier: null,
      registryVersion: null,
      providerSha: null,
      priceRangeUsd: provider.priceRangeUsd ?? null,
      offers: provider.offers.map((offer) => ({
        protocol: offer.protocol,
        chain: offer.chain,
        asset: offer.asset,
        payTo: offer.payTo,
        probePriceUsd: offer.probePriceUsd,
      })),
      apiPathsObserved,
      sourceRowCount: matchedRows.length,
    };
  });

  const payShProviders = atlas.providers.map((provider) => ({
    provider_fqn: provider.fqn,
    title: provider.title,
    description: provider.description,
    use_case: provider.useCase,
    category: provider.category,
    service_url: provider.serviceUrl,
    endpoint_count: provider.endpointCount,
    price_range_min_usd: provider.priceRangeUsd?.min ?? null,
    price_range_max_usd: provider.priceRangeUsd?.max ?? null,
  }));

  const payShPaymentOffers = atlas.providers.flatMap((provider) =>
    provider.offers.map((offer) => ({
      provider_fqn: provider.fqn,
      protocol: offer.protocol,
      chain: offer.chain,
      normalized_network: normalizeOfferNetwork(offer.chain, offer.protocol),
      asset: offer.asset,
      normalized_asset: normalizeOfferAsset(offer.asset),
      pay_to_address: normalizePayTo(
        offer.payTo,
        normalizeOfferNetwork(offer.chain, offer.protocol),
      ),
      raw_pay_to_address: offer.payTo,
      probe_price_usd: offer.probePriceUsd,
      expected_amount_atomic: Math.round(Math.max(offer.probePriceUsd, 0) * 1_000_000).toString(),
    })),
  );

  const payShProviderResources = geoProviders.flatMap((provider) =>
    provider.observedEndpoints.map((endpoint, index) => ({
      provider_fqn: provider.atlas.fqn,
      service_id: provider.serviceId,
      provider_id: provider.providerId,
      resource_url: endpoint.resource,
      resource_index: index,
      description: "description" in endpoint ? endpoint.description : undefined,
      method: "method" in endpoint ? endpoint.method : undefined,
      last_updated: "lastUpdated" in endpoint ? endpoint.lastUpdated : undefined,
      x402_version: "x402Version" in endpoint ? endpoint.x402Version : undefined,
      networks: endpoint.networks,
      assets: endpoint.assets,
      transaction_count: endpoint.transactionCount,
      total_amount_atomic: endpoint.totalAmountAtomic,
    })),
  );

  const counts = {
    atlasProviders: atlas.providers.length,
    analyticsProviderRows: analyticsProviderRows.length,
    intelligenceWallets: Object.keys(input.analytics.intelligenceByAddress ?? {}).length,
    x402EndpointSlots: endpointSlots.length,
    geoProviders: geoProviders.length,
    geoProvidersWithAtlasMatch: geoProviders.filter((provider) => !provider.atlasMissing).length,
    geoProvidersAtlasMissing: geoProviders.filter((provider) => provider.atlasMissing).length,
    geoOffers: geoProviders.reduce((sum, provider) => sum + provider.offers.length, 0),
    observedEndpoints: geoProviders.reduce(
      (sum, provider) => sum + provider.observedEndpoints.length,
      0,
    ),
    payShProviders: payShProviders.length,
    payShPaymentOffers: payShPaymentOffers.length,
    payShProviderResources: payShProviderResources.length,
    geoSpecs: geoSpecs.length,
    geoSpecsWithObservedPaths: geoSpecs.filter((spec) => spec.apiPathsObserved.length > 0).length,
  };

  return {
    generatedAt: input.generatedAt,
    purpose: "Import-ready GEO source payload reconstructed from the pre-DB implementation.",
    oldImplementation: {
      commitBeforeMigrationHint: "fae5d8484400642b0f3943012a168f689f6758c8^",
      sourceFile: "apps/frontend/lib/geo-spec/source.ts",
      sourceInputs: [
        "docs/research/pay-skills-payment-atlas.md",
        "apps/bff/fixtures/generated/analytics.json",
      ],
      mergeMethod:
        "Atlas provider descriptions/offers are matched to analytics provider rows by serviceId, serviceUrl hostname, or hostname apex segment. Observed endpoints are aggregated from intelligenceByAddress[*].x402Services by target host, with provider.resources as fallback.",
    },
    postgresImport: {
      tableOrder: ["pay_sh_providers", "pay_sh_payment_offers", "pay_sh_provider_resources"],
      tables: {
        pay_sh_providers: payShProviders,
        pay_sh_payment_offers: payShPaymentOffers,
        pay_sh_provider_resources: payShProviderResources,
      },
      notes: [
        "BFF postgres live read model reads pay_sh_providers and pay_sh_payment_offers directly.",
        "pay_sh_provider_resources is a JSON staging table proposal for endpoint/resource import; existing BFF resource joins currently use x402_resources and x402_payment_options.",
      ],
    },
    sources: {
      atlasPath: path.relative(REPO_ROOT, input.atlasPath),
      analyticsPath: path.relative(REPO_ROOT, input.analyticsPath),
    },
    counts,
    parsedAtlas: atlas,
    analyticsProviderRows,
    geoProviders,
    geoSpecs,
  };
};

const main = () => {
  const atlasPath = parseArg("atlas", DEFAULT_ATLAS_PATH);
  const analyticsPath = parseArg("analytics", DEFAULT_ANALYTICS_PATH);
  const outputPath = parseArg("output", DEFAULT_OUTPUT_PATH);
  const outputDir = parseArg("output-dir", DEFAULT_OUTPUT_DIR);

  const payload = buildGeoSourcePayload({
    atlasMarkdown: fs.readFileSync(atlasPath, "utf8"),
    analytics: JSON.parse(fs.readFileSync(analyticsPath, "utf8")) as AnalyticsFile,
    generatedAt: new Date().toISOString(),
    atlasPath,
    analyticsPath,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.error(`[build-geo-source-json] wrote ${outputPath}`);

  if (hasFlag("split") || process.argv.includes("--output-dir")) {
    fs.mkdirSync(outputDir, { recursive: true });
    const splitFiles: Record<string, unknown> = {
      "manifest.json": {
        generatedAt: payload.generatedAt,
        purpose: payload.purpose,
        sources: payload.sources,
        oldImplementation: payload.oldImplementation,
        counts: payload.counts,
        files: {
          geoSpecs: "geo-specs.json",
          payShProviders: "pay-sh-providers.json",
          payShPaymentOffers: "pay-sh-payment-offers.json",
          payShProviderResources: "pay-sh-provider-resources.json",
          analyticsProviderRows: "analytics-provider-rows.json",
        },
      },
      "geo-specs.json": payload.geoSpecs,
      "pay-sh-providers.json": payload.postgresImport.tables.pay_sh_providers,
      "pay-sh-payment-offers.json": payload.postgresImport.tables.pay_sh_payment_offers,
      "pay-sh-provider-resources.json": payload.postgresImport.tables.pay_sh_provider_resources,
      "analytics-provider-rows.json": payload.analyticsProviderRows,
    };
    for (const [fileName, value] of Object.entries(splitFiles)) {
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      console.error(`[build-geo-source-json] wrote ${filePath}`);
    }
  }

  console.error(`[build-geo-source-json] counts=${JSON.stringify(payload.counts)}`);
};

if (import.meta.main) main();
