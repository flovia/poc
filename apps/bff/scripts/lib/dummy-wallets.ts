import { mulberry32, randomInt, type Rng } from "./prng";

const HEX_CHARS = "0123456789abcdef";
const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export type ChainKind = "evm" | "solana";

export const generateEvmAddress = (rng: Rng): string => {
  let hex = "";
  for (let i = 0; i < 40; i++) {
    hex += HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)];
  }
  return `0x${hex}`;
};

export const generateSolanaAddress = (rng: Rng): string => {
  const length = randomInt(rng, 32, 44);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE58_CHARS[Math.floor(rng() * BASE58_CHARS.length)];
  }
  return out;
};

export type GenerateDummyPayerWalletsArgs = {
  chainKind: ChainKind;
  count: number;
  seed: number;
};

export const generateDummyPayerWallets = ({
  chainKind,
  count,
  seed,
}: GenerateDummyPayerWalletsArgs): string[] => {
  const rng = mulberry32(seed);
  const addresses = new Set<string>();
  while (addresses.size < count) {
    const addr = chainKind === "evm" ? generateEvmAddress(rng) : generateSolanaAddress(rng);
    addresses.add(addr);
  }
  return Array.from(addresses);
};
