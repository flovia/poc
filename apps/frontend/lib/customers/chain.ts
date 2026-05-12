import type { CustomerListItemDto } from "@/lib/api/types";

// BFF /customers は serviceId 集約モードで chains[] / assets[] / spendByAsset を返す
// (Phase B 拡張)。ここでは画面表示用に正規化 + display metadata を解決する。

export type CustomerChain =
  | "base"
  | "solana"
  | "tempo"
  | "x-layer"
  | "polygon"
  | "polygon-amoy"
  | "base-sepolia"
  | "avalanche"
  | "eip155-other"
  | "other";

export const CUSTOMER_CHAINS: ReadonlyArray<CustomerChain> = [
  "base",
  "solana",
  "tempo",
  "x-layer",
  "polygon",
  "polygon-amoy",
  "base-sepolia",
  "avalanche",
  "eip155-other",
  "other",
];

export type CustomerChainFilter = "all" | CustomerChain;

export type CustomerChainAttribution = {
  chain: CustomerChain;
  asset: string;
  /** All chains the customer was observed on (for the current filter context). */
  chains: CustomerChain[];
  /** All assets the customer paid in. */
  assets: string[];
};

const CHAIN_DISPLAY: Record<CustomerChain, { label: string; short: string; color: string }> = {
  base: { label: "Base", short: "BASE", color: "var(--mesh-blue)" },
  solana: { label: "Solana", short: "SOL", color: "var(--sdk-purple)" },
  tempo: { label: "Tempo", short: "TEMPO", color: "var(--teal)" },
  "x-layer": { label: "X Layer", short: "XLAYER", color: "#6366f1" },
  polygon: { label: "Polygon", short: "POLY", color: "#8b5cf6" },
  "polygon-amoy": { label: "Polygon Amoy", short: "AMOY", color: "#a78bfa" },
  "base-sepolia": { label: "Base Sepolia", short: "B-SEP", color: "#60a5fa" },
  avalanche: { label: "Avalanche", short: "AVAX", color: "#ef4444" },
  "eip155-other": { label: "Other", short: "OTHER", color: "var(--text-mute)" },
  other: { label: "Other", short: "OTHER", color: "var(--text-mute)" },
};

export function describeChain(chain: CustomerChain) {
  return CHAIN_DISPLAY[chain];
}

export function normalizeChain(raw: string | undefined | null): CustomerChain {
  if (!raw) return "other";
  const c = raw.toLowerCase();
  if (c.includes("solana")) return "solana";
  if (c.includes("base sepolia") || c === "base-sepolia") return "base-sepolia";
  if (c === "base") return "base";
  if (c.includes("polygon amoy") || c === "polygon-amoy") return "polygon-amoy";
  if (c === "polygon") return "polygon";
  if (c.includes("tempo")) return "tempo";
  if (c.includes("avalanche")) return "avalanche";
  if (c.includes("x layer") || c === "x-layer") return "x-layer";
  if (c.startsWith("eip155:")) return "other";
  return "other";
}

const prioritizeSolana = (chains: CustomerChain[]): CustomerChain[] => {
  if (!chains.includes("solana")) return chains;
  return ["solana", ...chains.filter((chain) => chain !== "solana")];
};

export function getCustomerChainAttribution(
  customer: CustomerListItemDto,
): CustomerChainAttribution {
  const rawChains = (customer.chains ?? []).filter((x): x is string => typeof x === "string");
  const normalizedChains = rawChains.length
    ? prioritizeSolana(Array.from(new Set(rawChains.map(normalizeChain))))
    : (["base"] as CustomerChain[]);
  const assets = (customer.assets ?? []).filter((x): x is string => typeof x === "string");
  const primaryChain = normalizedChains[0] ?? "base";
  const primaryAsset = assets[0] ?? "USDC";
  return {
    chain: primaryChain,
    asset: primaryAsset,
    chains: normalizedChains,
    assets: assets.length ? assets : ["USDC"],
  };
}
