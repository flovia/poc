export { sumAtomic } from "contracts";

export const latestTimestamp = (items: Array<string | undefined>) =>
  items.filter((item) => item !== undefined).sort((left, right) => right.localeCompare(left))[0];

export const firstTimestamp = (items: Array<string | undefined>) =>
  items.filter((item) => item !== undefined).sort((left, right) => left.localeCompare(right))[0];

export const serviceIdForKey = (serviceKey: string) =>
  serviceKey.toLowerCase().includes("coingecko") ? "coingecko" : serviceKey.toLowerCase();

export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "provider";
