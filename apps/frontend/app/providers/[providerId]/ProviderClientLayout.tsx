"use client";

import { use, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { useProviders } from "@/app/providers";
import type { DashboardMode } from "@/lib/data-mode";
import { shouldShowProviderLayoutSkeleton } from "./provider-layout-state";

type RouteSegment =
  | "customers"
  | "api-growth"
  | "geo-spec"
  | "machine-payment-routes"
  | "macro-metrics"
  | "metrics-catalog"
  | "wallet";

function deriveActiveRoute(pathname: string): RouteSegment | undefined {
  if (pathname.includes("/wallet/")) return "wallet";
  if (pathname.endsWith("/customers") || pathname.includes("/customers/")) return "customers";
  if (pathname.endsWith("/api-growth") || pathname.includes("/api-growth/")) return "api-growth";
  if (pathname.endsWith("/geo-spec") || pathname.includes("/geo-spec/")) return "geo-spec";
  if (pathname.endsWith("/machine-payment-routes") || pathname.includes("/machine-payment-routes/")) return "machine-payment-routes";
  if (pathname.endsWith("/metrics-catalog") || pathname.includes("/metrics-catalog/")) return "metrics-catalog";
  if (pathname.endsWith("/macro-metrics") || pathname.includes("/macro-metrics/")) return "macro-metrics";
  return undefined;
}

export function ProviderClientLayout({
  children,
  params,
  dataMode,
}: {
  children: React.ReactNode;
  params: Promise<{ providerId: string }>;
  dataMode: DashboardMode;
}) {
  const { providerId } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = deriveActiveRoute(pathname);
  const { stored, hydrated } = useProviders();

  // Phase 9: redirect to /setup は On-chain only モードのみ.
  // SDK connected モードでは fixture が常にデータを返せるので Setup を経由する必要が無い.
  useEffect(() => {
    if (!hydrated) return;
    if (dataMode === "onChainOnly" && stored.length === 0) {
      router.replace("/setup");
    }
  }, [hydrated, dataMode, stored.length, router]);

  // Provider catalog loading should not block the server-rendered page body.
  // Only hide children after hydration confirms an on-chain setup has no providers.
  const showSkeleton = shouldShowProviderLayoutSkeleton({
    hydrated,
    dataMode,
    storedCount: stored.length,
  });

  return (
    <AppShell
      activeProviderId={showSkeleton ? undefined : providerId}
      activeRoute={activeRoute}
      dataMode={dataMode}
    >
        {showSkeleton ? (
          <div style={{ padding: 40 }}>
            <div className="sk" style={{ width: 220, height: 18, marginBottom: 10 }} />
            <div className="sk" style={{ width: 320, height: 14 }} />
          </div>
        ) : (
          children
        )}
    </AppShell>
  );
}
