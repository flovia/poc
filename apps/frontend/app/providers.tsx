"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoredProvider } from "@/lib/types";
import {
  hasInitialized,
  loadStoredProviders,
  markInitialized,
  saveStoredProviders,
} from "@/lib/storage";
import { seedProviders } from "@/lib/providers";

type Ctx = {
  stored: StoredProvider[];
  hydrated: boolean;
  addProvider: (p: StoredProvider) => void;
  removeProvider: (providerId: string) => void;
};

const ProvidersContext = createContext<Ctx | null>(null);

export function ProvidersContextProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredProvider[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial = loadStoredProviders();
    if (initial.length === 0 && !hasInitialized()) {
      initial = seedProviders();
      saveStoredProviders(initial);
      markInitialized();
    }
    setStored(initial);
    setHydrated(true);
  }, []);

  const addProvider = useCallback((p: StoredProvider) => {
    setStored((prev) => {
      const filtered = prev.filter((x) => x.providerId !== p.providerId);
      const next = [...filtered, p];
      saveStoredProviders(next);
      return next;
    });
  }, []);

  const removeProvider = useCallback((providerId: string) => {
    setStored((prev) => {
      const next = prev.filter((p) => p.providerId !== providerId);
      saveStoredProviders(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ stored, hydrated, addProvider, removeProvider }),
    [stored, hydrated, addProvider, removeProvider],
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
