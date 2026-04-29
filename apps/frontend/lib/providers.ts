import type { StoredProvider } from "@/lib/types";

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
