import type { StoredProvider } from "@/lib/types";

export const STORAGE_KEY = "flovia:providers";
export const SEED_SENTINEL_KEY = "flovia:initialized";

const isBrowser = () => typeof window !== "undefined";

export function loadStoredProviders(): StoredProvider[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredProvider[];
  } catch {
    return [];
  }
}

export function saveStoredProviders(list: StoredProvider[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / serialization failures in PoC
  }
}

export function hasInitialized(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(SEED_SENTINEL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInitialized(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SEED_SENTINEL_KEY, "1");
  } catch {
    // ignore
  }
}
