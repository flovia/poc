import type { StoredProvider } from "@/lib/types";

// demo provider 識別子の単一の真実源。seedProviders() の providerId と一致させる。
export const SEED_IDS = ["acme-price", "lumen-vec", "halonet"] as const;

// demo 行判定 (source-aware)。
// user が "acme-price" を名乗って保存した場合、user 側の acme-price は demo として
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
      providerId: "acme-price",
      name: "Acme Price API",
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
