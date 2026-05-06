"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoredProvider } from "@/lib/types";
import { getProviders as getBffProviders } from "@/lib/api/client";
import {
  getDemoOptedIn,
  getSeedVersion,
  hasInitialized,
  LEGACY_SEED_IDS,
  loadStoredProviders,
  markInitialized,
  saveStoredProviders,
  SEED_VERSION,
  setDemoOptedIn as storageSetDemoOptedIn,
  setSeedVersion,
} from "@/lib/storage";
import { findProviderByRouteId, SEED_IDS, seedProviders, slugifyProviderName } from "@/lib/providers";
import { orderProvidersPinnedFirst } from "@/lib/providers/order";
import { STATIC_PROVIDER_CAPABILITIES } from "@/lib/providers/static-capabilities";
import { extractBrandKey } from "@/lib/pay-sh/brand";

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
  const [providerCatalogSettled, setProviderCatalogSettled] = useState<boolean>(false);
  const [generatedProviders, setGeneratedProviders] = useState<StoredProvider[]>([]);
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

    // step 2: prov の中身を seedCount で分類。
    // SEED_VERSION bump 時は旧 SEED_IDS も seed と見なすことで、旧版フル保持 (M1)
    // を正しく検出し、saveStoredProviders([]) で旧 demo 行ごと localStorage から消す。
    // ユーザーが偶然旧 seed と同じ providerId で登録していたケースは M2 に落ち、
    // 削除されない (この経路では SEED_VERSION も更新しないので将来のリトライが効く)。
    const isLegacy = initialSeedV !== SEED_VERSION;
    const recognizedSeedIds: readonly string[] = isLegacy
      ? [...SEED_IDS, ...LEGACY_SEED_IDS]
      : SEED_IDS;
    const seedCount = initialUser.filter((p) =>
      recognizedSeedIds.includes(p.providerId),
    ).length;
    const userCount = initialUser.length - seedCount;

    // 旧版フル保持と新版フル保持はどちらも 3 件 (SEED_IDS と同サイズ)。
    // 旧版は LEGACY_SEED_IDS の 1 件が SEED_IDS の差分 1 件と置換された形なので、
    // 期待件数は常に SEED_IDS.length で揃う。
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

  useEffect(() => {
    let cancelled = false;
    getBffProviders()
      .then((providers) => {
        if (cancelled) return;
        // Dedup providers describing the same brand (cross-catalog +
        // cross-chain) so the picker shows ONE entry per provider.
        //
        // Key precedence:
        //   1. brand-key (serviceId reduced to its brand label) so that
        //      Pay.sh `agentmail/email` and MPP `agentmail` collapse together;
        //      `merit-systems/stablesocial/social-data` and MPP `stablesocial`
        //      collapse together; etc.
        //   2. display name (lower-cased) when no brand-key can be derived —
        //      preserves prior behavior for legacy rows.
        // Within a group: the winner is the row preferred for click-through.
        // We prefer Pay.sh atlas rows (catalogSource !== "mpp_registry") so
        // existing provider URLs stay stable. If no Pay.sh row exists, the MPP
        // row wins by default. Tie-breakers: hasCustomerFacts > transactionCount.
        type CatalogItem = (typeof providers)[number];
        type Protocol = "x402" | "MPP";
        const groups = new Map<
          string,
          {
            winner: CatalogItem;
            networks: Set<string>;
            protocols: Set<Protocol>;
            catalogSources: Set<string>;
          }
        >();
        const groupKey = (p: CatalogItem): string => {
          const brand = extractBrandKey(p.serviceId);
          if (brand) return `brand:${brand}`;
          return `name:${(p.name ?? p.serviceId ?? p.providerId).toLowerCase()}`;
        };
        const isPaySh = (p: CatalogItem): boolean =>
          p.catalogSource !== "mpp_registry" && !p.providerId.startsWith("mpp:");
        const score = (p: CatalogItem): number => {
          const paysh = isPaySh(p) ? 1_000_000_000_000 : 0;
          const facts = p.hasCustomerFacts ? 1_000_000_000 : 0;
          return paysh + facts + p.transactionCount;
        };
        for (const provider of providers) {
          const key = groupKey(provider);
          const existing = groups.get(key);
          if (!existing) {
            const networks = new Set<string>();
            if (provider.network) networks.add(provider.network);
            const protocols = new Set<Protocol>();
            if (provider.protocol) protocols.add(provider.protocol);
            const catalogSources = new Set<string>();
            if (provider.catalogSource) catalogSources.add(provider.catalogSource);
            groups.set(key, { winner: provider, networks, protocols, catalogSources });
            continue;
          }
          if (provider.network) existing.networks.add(provider.network);
          if (provider.protocol) existing.protocols.add(provider.protocol);
          if (provider.catalogSource) existing.catalogSources.add(provider.catalogSource);
          if (score(provider) > score(existing.winner)) {
            existing.winner = provider;
          }
        }
        const deduped = Array.from(groups.values());
        const generated = deduped.map(({ winner, networks, protocols, catalogSources }) => {
          const capability = winner.serviceId
            ? STATIC_PROVIDER_CAPABILITIES.find((entry) => entry.serviceId === winner.serviceId)
            : undefined;
          // Union capability + aggregated values rather than override. Static
          // capability may know about networks/protocols the live BFF row
          // doesn't (e.g. legacy Solana-only capability), but the brand-key
          // dedup also adds rows from sibling catalogs (Pay.sh + MPP) whose
          // networks/protocols MUST also surface. Override would erase TEMPO
          // and MPP badges for AgentMail.
          const mergedNetworks = Array.from(
            new Set<string>([...(capability?.networks ?? []), ...networks]),
          );
          const mergedProtocols = Array.from(
            new Set<"x402" | "MPP">([...(capability?.protocols ?? []), ...protocols]),
          );
          // Pay.sh tag wins over MPP for display when both are present (the
          // group is being represented by a Pay.sh row); otherwise carry MPP.
          const mergedCatalogSource =
            winner.catalogSource ??
            (catalogSources.has("mpp_registry") ? "mpp_registry" : undefined) ??
            capability?.catalogSource;
          // Preserve every catalogSource that contributed to this group so the
          // picker can show e.g. both Pay.sh + MPP badges on AgentMail.
          const knownCatalogSources: ReadonlyArray<
            "base_curated" | "pay_sh_curated" | "raw_x402" | "mpp_registry"
          > = ["base_curated", "pay_sh_curated", "raw_x402", "mpp_registry"];
          const aggregatedCatalogSources = knownCatalogSources.filter((c) =>
            catalogSources.has(c),
          );
          if (winner.catalogSource && !aggregatedCatalogSources.includes(winner.catalogSource)) {
            aggregatedCatalogSources.unshift(winner.catalogSource);
          }
          if (
            capability?.catalogSource &&
            !aggregatedCatalogSources.includes(capability.catalogSource)
          ) {
            aggregatedCatalogSources.push(capability.catalogSource);
          }
          return {
            providerId: winner.providerId,
            name: winner.name,
            mode: "simple" as const,
            payTo: winner.payTo,
            createdAt: Date.now(),
            source: "generated" as const,
            network: capability?.network ?? winner.network,
            networks: mergedNetworks,
            catalogSource: mergedCatalogSource,
            catalogSources:
              aggregatedCatalogSources.length > 0 ? aggregatedCatalogSources : undefined,
            protocols: mergedProtocols,
            asset: winner.asset,
            serviceId: winner.serviceId,
            serviceName: winner.serviceName,
            serviceUrl: winner.serviceUrl,
            transactionCount: winner.transactionCount,
            uniqueSenderCount: winner.uniqueSenderCount,
            hasCustomerFacts: winner.hasCustomerFacts,
          };
        });
        const existingServiceIds = new Set(generated.map((provider) => provider.serviceId));
        const staticOnly = STATIC_PROVIDER_CAPABILITIES.filter(
          (provider) => !existingServiceIds.has(provider.serviceId),
        ).map((provider) => ({
          providerId: `static-${slugifyProviderName(provider.serviceId)}`,
          name: provider.name,
          mode: "simple" as const,
          payTo: provider.payTo,
          createdAt: Date.now(),
          source: "generated" as const,
          network: provider.network,
          networks: provider.networks,
          catalogSource: provider.catalogSource,
          protocols: provider.protocols,
          asset: provider.asset,
          serviceId: provider.serviceId,
          serviceName: provider.name,
          transactionCount: provider.transactionCount,
          uniqueSenderCount: provider.uniqueSenderCount,
          hasCustomerFacts: provider.transactionCount > 0,
        }));
        setGeneratedProviders(orderProvidersPinnedFirst([...generated, ...staticOnly]));
      })
      .catch(() => {
        if (!cancelled) setGeneratedProviders([]);
      })
      .finally(() => {
        if (!cancelled) setProviderCatalogSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stored = useMemo<StoredProvider[]>(() => {
    if (generatedProviders.length > 0) return [...generatedProviders, ...userProviders];
    if (!demoOpted) return userProviders;
    const userIds = new Set(userProviders.map((p) => p.providerId));
    // demo first、衝突時は user を採用 (= demo を間引く)。
    const demoFiltered = demoProvidersFixed.filter((p) => !userIds.has(p.providerId));
    return [...demoFiltered, ...userProviders];
  }, [userProviders, demoOpted, demoProvidersFixed, generatedProviders]);

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
    // SEED_VERSION bump 後の旧 SEED_IDS (LEGACY_SEED_IDS) も同時に除去して、
    // M2 経由のブラウザでも明示的 opt-in 時に旧 seed が完全置換される。
    const seedLikeIds = new Set<string>([...SEED_IDS, ...LEGACY_SEED_IDS]);
    setUserProviders((prev) => {
      const filtered = prev.filter((p) => !seedLikeIds.has(p.providerId));
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
      hydrated: hydrated && providerCatalogSettled,
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
      providerCatalogSettled,
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
  const active = idFromUrl ? findProviderByRouteId(stored, idFromUrl) : undefined;
  return { active, hydrated };
}
