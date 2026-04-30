"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoredProvider } from "@/lib/types";
import {
  getDemoOptedIn,
  getSeedVersion,
  hasInitialized,
  loadStoredProviders,
  markInitialized,
  saveStoredProviders,
  SEED_VERSION,
  setDemoOptedIn as storageSetDemoOptedIn,
  setSeedVersion,
} from "@/lib/storage";
import { SEED_IDS, seedProviders } from "@/lib/providers";

type Ctx = {
  // effective providers (demo + user, demo first)。Sidebar / SavedProviderList の
  // 描画はこちらを使う。
  stored: StoredProvider[];
  // localStorage 保存対象 (user only)。衝突判定 (SetupForm) や source-aware
  // 表示 (isDemoProvider に渡す userIds) で使う。
  userProviders: StoredProvider[];
  hydrated: boolean;
  demoOpted: boolean;
  addProvider: (p: StoredProvider) => void;
  removeProvider: (providerId: string) => void;
  optInDemo: () => void;
  optOutDemo: () => void;
};

const ProvidersContext = createContext<Ctx | null>(null);

export function ProvidersContextProvider({ children }: { children: React.ReactNode }) {
  const [userProviders, setUserProviders] = useState<StoredProvider[]>([]);
  const [demoOpted, setDemoOpted] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  // demo 配列を hydrate 時に 1 回だけ固定化する。seedProviders() は内部で
  // Date.now() を使うため、useMemo の度に呼ぶと createdAt が揺れる。
  const [demoProvidersFixed, setDemoProvidersFixed] = useState<StoredProvider[]>([]);

  useEffect(() => {
    // Phase 4 migration の M1〜M5 をそのまま TS 化したもの。
    // すべての副作用は冪等なので strict mode の double invoke でも安全。
    setDemoProvidersFixed(seedProviders());

    const initialUser = loadStoredProviders();
    const initialInit = hasInitialized();
    const initialDemoOpt = getDemoOptedIn();
    const initialSeedV = getSeedVersion();

    // step 1: init=null && prov=[] → M5 (fresh)
    if (initialUser.length === 0 && !initialInit) {
      setUserProviders([]);
      setDemoOpted(initialDemoOpt);
      setHydrated(true);
      return;
    }

    // step 1b: init=null && prov 非空 → M4 (init=1 を立てて M1〜M3 へ fall-through)
    if (!initialInit && initialUser.length > 0) {
      markInitialized();
    }

    // step 2: prov の中身を seedCount で分類
    const seedCount = initialUser.filter((p) =>
      (SEED_IDS as readonly string[]).includes(p.providerId),
    ).length;
    const userCount = initialUser.length - seedCount;

    if (seedCount === SEED_IDS.length && userCount === 0) {
      // M1: seed 完全保持・user 追加なし → demoOpt=true, prov=[], seedV=SEED_VERSION
      saveStoredProviders([]);
      storageSetDemoOptedIn(true);
      setSeedVersion(SEED_VERSION);
      setUserProviders([]);
      setDemoOpted(true);
      setHydrated(true);
      return;
    }

    if (seedCount >= 1) {
      // M2: partial legacy → 触らない
      setUserProviders(initialUser);
      setDemoOpted(initialDemoOpt);
      setHydrated(true);
      return;
    }

    // seedCount === 0 → M3: user only or 空
    if (initialSeedV !== SEED_VERSION) {
      setSeedVersion(SEED_VERSION);
    }
    setUserProviders(initialUser);
    setDemoOpted(initialDemoOpt);
    setHydrated(true);
  }, []);

  const stored = useMemo<StoredProvider[]>(() => {
    if (!demoOpted) return userProviders;
    const userIds = new Set(userProviders.map((p) => p.providerId));
    // demo first、衝突時は user を採用 (= demo を間引く)。
    const demoFiltered = demoProvidersFixed.filter((p) => !userIds.has(p.providerId));
    return [...demoFiltered, ...userProviders];
  }, [userProviders, demoOpted, demoProvidersFixed]);

  const addProvider = useCallback((p: StoredProvider) => {
    setUserProviders((prev) => {
      const filtered = prev.filter((x) => x.providerId !== p.providerId);
      const next = [...filtered, p];
      saveStoredProviders(next);
      return next;
    });
  }, []);

  const removeProvider = useCallback((providerId: string) => {
    setUserProviders((prev) => {
      const next = prev.filter((p) => p.providerId !== providerId);
      saveStoredProviders(next);
      return next;
    });
  }, []);

  const optInDemo = useCallback(() => {
    setDemoOpted(true);
    storageSetDemoOptedIn(true);
    setSeedVersion(SEED_VERSION);
    // partial legacy (M2) のクリーンアップ: prov に残った seed 由来は demo
    // 配列で再供給するため localStorage から消す。
    setUserProviders((prev) => {
      const filtered = prev.filter(
        (p) => !(SEED_IDS as readonly string[]).includes(p.providerId),
      );
      saveStoredProviders(filtered);
      return filtered;
    });
  }, []);

  const optOutDemo = useCallback(() => {
    setDemoOpted(false);
    storageSetDemoOptedIn(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      stored,
      userProviders,
      hydrated,
      demoOpted,
      addProvider,
      removeProvider,
      optInDemo,
      optOutDemo,
    }),
    [
      stored,
      userProviders,
      hydrated,
      demoOpted,
      addProvider,
      removeProvider,
      optInDemo,
      optOutDemo,
    ],
  );

  return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>;
}

export function useProviders(): Ctx {
  const ctx = useContext(ProvidersContext);
  if (!ctx) throw new Error("useProviders must be used inside ProvidersContextProvider");
  return ctx;
}

export function useActiveProvider(idFromUrl: string | undefined) {
  const { stored, hydrated } = useProviders();
  const active = idFromUrl ? stored.find((p) => p.providerId === idFromUrl) : undefined;
  return { active, hydrated };
}
