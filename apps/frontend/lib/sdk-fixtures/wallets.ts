export type ChainKind = "evm" | "solana";

const HEX_CHARS = "0123456789abcdef";
const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

type Rng = () => number;

const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedFromString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const randomInt = (rng: Rng, minInclusive: number, maxInclusive: number): number =>
  Math.floor(rng() * (maxInclusive - minInclusive + 1)) + minInclusive;

const generateEvmAddress = (rng: Rng): string => {
  let hex = "";
  for (let i = 0; i < 40; i++) {
    hex += HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)];
  }
  return `0x${hex}`;
};

const generateSolanaAddress = (rng: Rng): string => {
  const length = randomInt(rng, 32, 44);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE58_CHARS[Math.floor(rng() * BASE58_CHARS.length)];
  }
  return out;
};

export function chainKindFromNetwork(network: string): ChainKind {
  return network.toLowerCase().includes("solana") ? "solana" : "evm";
}

export function syntheticAddress(seed: string, chainKind: ChainKind = "evm"): string {
  const rng = mulberry32(seedFromString(seed));
  return chainKind === "solana" ? generateSolanaAddress(rng) : generateEvmAddress(rng);
}

export const isSyntheticEvmAddress = (value: string): boolean => /^0x[0-9a-f]{40}$/.test(value);

export const isSyntheticSolanaAddress = (value: string): boolean =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
