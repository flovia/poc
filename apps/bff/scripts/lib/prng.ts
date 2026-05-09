export type Rng = () => number;

export const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seedFromString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const randomInt = (rng: Rng, minInclusive: number, maxInclusive: number): number => {
  return Math.floor(rng() * (maxInclusive - minInclusive + 1)) + minInclusive;
};

export const pickOne = <T>(rng: Rng, items: readonly T[]): T => {
  if (items.length === 0) throw new Error("pickOne: empty array");
  return items[Math.floor(rng() * items.length)] as T;
};
