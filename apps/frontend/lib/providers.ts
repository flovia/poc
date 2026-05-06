import { PaymentRecipientAddressSchema } from "contracts";
import type { StoredProvider } from "@/lib/types";

// demo provider 識別子の単一の真実源。seedProviders() の providerId と一致させる。
export const SEED_IDS = ["northwind-price", "lumen-vec", "halonet"] as const;

// demo 行判定 (source-aware)。
// user が "northwind-price" を名乗って保存した場合、user 側の northwind-price は demo として
// 扱わない。userIds に含まれている providerId は user 由来。
export function isDemoProvider(
  provider: StoredProvider,
  demoOpted: boolean,
  userIds: ReadonlySet<string>,
): boolean {
  if (!demoOpted) return false;
  if (!(SEED_IDS as readonly string[]).includes(provider.providerId)) return false;
  if (userIds.has(provider.providerId)) return false;
  return true;
}

export function slugifyProviderName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "provider";
}

export function ensureUniqueId(desired: string, existing: string[]): string {
  if (!existing.includes(desired)) return desired;
  let i = 2;
  while (existing.includes(`${desired}-${i}`)) i++;
  return `${desired}-${i}`;
}

type ProviderRouteLike = {
  providerId: string;
  name: string;
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceId?: string;
  serviceName?: string;
  serviceUrl?: string;
  hasMetering?: boolean;
  hasFreeTier?: boolean;
  providerSha?: string;
  registryVersion?: string;
  registryGeneratedAt?: string;
  registrySourceUrl?: string;
  priceRangeUsd?: { min: number; max: number };
  offers?: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payToAddress: string;
    probePriceUsd?: number;
  }>;
  payTo?: string;
  network?: string;
  asset?: string;
  endpointCount?: number;
  resources?: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    transactionCount?: number;
    totalAmountAtomic?: string;
  }>;
  paths?: Array<{ payTo: string }>;
};

function rawCandidatePayTos(provider: ProviderRouteLike): string[] {
  if (provider.payTo) return [provider.payTo];
  return (provider.paths ?? []).map((path) => path.payTo);
}

function candidatePayTos(provider: ProviderRouteLike): string[] {
  return rawCandidatePayTos(provider).map((payTo) => payTo.toLowerCase());
}

function providerRouteAliases(provider: ProviderRouteLike): Set<string> {
  const aliases = new Set<string>([provider.providerId.toLowerCase()]);
  const identityCandidates = [
    provider.providerId,
    provider.name,
    provider.serviceId,
    provider.serviceName,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  for (const payTo of candidatePayTos(provider)) {
    for (const identity of identityCandidates) {
      aliases.add(`${identity.toLowerCase()}--${payTo}`);
      aliases.add(`${slugifyProviderName(identity)}--${payTo}`);
      aliases.add(`${slugifyProviderName(identity)}--base--usdc--${payTo}`);
    }
    if (identityCandidates.some((identity) => identity.toLowerCase().includes("coingecko"))) {
      aliases.add(`coingecko--${payTo}`);
      aliases.add(`coingecko--base--usdc--${payTo}`);
    }
  }

  return aliases;
}

function tryDecodeRouteId(value: string): string | null {
  // Next.js dynamic route params can arrive percent-encoded (e.g. when the
  // providerId contains `:` such as MPP rows: `mpp:agentmail::tempo:4217::...`).
  // We try a single decode pass and tolerate malformed sequences.
  if (!value.includes("%")) return null;
  try {
    const decoded = decodeURIComponent(value);
    return decoded === value ? null : decoded;
  } catch {
    return null;
  }
}

export function matchesProviderRouteId(
  provider: ProviderRouteLike,
  routeProviderId: string,
): boolean {
  const aliases = providerRouteAliases(provider);
  if (aliases.has(routeProviderId.toLowerCase())) return true;
  const decoded = tryDecodeRouteId(routeProviderId);
  return decoded !== null && aliases.has(decoded.toLowerCase());
}

export function findProviderByRouteId<T extends ProviderRouteLike>(
  providers: readonly T[],
  routeProviderId: string,
): T | undefined {
  return providers.find((provider) => matchesProviderRouteId(provider, routeProviderId));
}

export function payToFromProviderRouteId(routeProviderId: string): string | undefined {
  const segments = routeProviderId.split("--").reverse();
  for (const segment of segments) {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      decoded = segment;
    }
    const parsed = PaymentRecipientAddressSchema.safeParse(decoded);
    if (parsed.success) return parsed.data;
  }
  return undefined;
}

export function routeIdForProvider(provider: ProviderRouteLike): string {
  if (payToFromProviderRouteId(provider.providerId)) return provider.providerId;
  for (const payTo of rawCandidatePayTos(provider)) {
    const parsed = PaymentRecipientAddressSchema.safeParse(payTo);
    if (parsed.success) return `${provider.providerId}--${parsed.data}`;
  }
  return provider.providerId;
}

// demo provider の payTo は UI 用の表示ダミー値で、本リポジトリの BFF
// (apps/bff) が返す payTo とは整合しない。demo provider は Setup / Sidebar の
// 動線体験を見せるためのモック行であり、On-chain only モードで demo provider を
// クリックしても BFF データには紐付かない (SDK connected モードでは fixture が
// 別軸でデータを返す)。実データに紐付く provider はユーザーが Setup で BFF と
// 整合する payTo を入力して登録する想定。
export function seedProviders(): StoredProvider[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      providerId: "northwind-price",
      name: "Northwind Price API",
      mode: "advanced",
      paths: [
        { apiPath: "/v1/price/history", payTo: "0x4E2c91A9...8Df1" },
        { apiPath: "/v1/price/snapshot", payTo: "0x4E2c91A9...8Df1" },
        { apiPath: "/v1/market/ohlcv", payTo: "0x4E2c91A9...8Df1" },
        { apiPath: "/v1/feeds/orderbook", payTo: "0x4E2c91A9...8Df1" },
      ],
      createdAt: now - 9 * day,
    },
    {
      providerId: "lumen-vec",
      name: "Lumen Vector",
      mode: "simple",
      payTo: "0x91Ab33c0...41B7",
      createdAt: now - 22 * day,
    },
    {
      providerId: "halonet",
      name: "Halonet Geocode",
      mode: "simple",
      payTo: "0x77fE0Bd1...9C03",
      createdAt: now - 41 * day,
    },
  ];
}

export function getDisplayPayTo(p: StoredProvider): string {
  if (p.mode === "simple") return p.payTo;
  return p.paths[0]?.payTo ?? "—";
}

export function getPathCount(p: StoredProvider): number {
  if (p.mode === "simple") return 1;
  return p.paths.length;
}

export function formatPayToShort(payTo: string): string {
  return payTo.length > 6 ? `${payTo.slice(0, 6)}…` : payTo;
}
