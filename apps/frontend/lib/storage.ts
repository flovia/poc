import type { StoredProvider } from "@/lib/types";

export const STORAGE_KEY = "flovia:providers";
export const SEED_SENTINEL_KEY = "flovia:initialized";
export const SEED_VERSION_KEY = "flovia:seed-version";
export const DEMO_OPTED_IN_KEY = "flovia:demo-opted-in";
// demo provider は localStorage に書き込まずメモリ上で管理するモデル。
// SEED_VERSION は demo 定義に互換性のない変更が入ったときに bump し、
// 既存ブラウザの localStorage 上の demo 関連状態を再初期化する基準として使う。
export const SEED_VERSION = 4;

// 過去 SEED_VERSION で使われていたが現在は使わない providerId。
// version bump 時のクリーンアップで除去対象にする。
export const LEGACY_SEED_IDS: readonly string[] = ["acme-price"];

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

export function getSeedVersion(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = window.localStorage.getItem(SEED_VERSION_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setSeedVersion(version: number): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SEED_VERSION_KEY, String(version));
  } catch {
    // ignore
  }
}

export function getDemoOptedIn(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(DEMO_OPTED_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoOptedIn(value: boolean): void {
  if (!isBrowser()) return;
  try {
    if (value) {
      window.localStorage.setItem(DEMO_OPTED_IN_KEY, "1");
    } else {
      window.localStorage.removeItem(DEMO_OPTED_IN_KEY);
    }
  } catch {
    // ignore
  }
}
