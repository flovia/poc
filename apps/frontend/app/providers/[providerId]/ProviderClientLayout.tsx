"use client";

import { use, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { useProviders } from "@/app/providers";
import type { DashboardMode } from "@/lib/data-mode";

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

  // Phase 4 真理表 #3: fresh ブラウザで /providers/X/customers に直アクセスしたとき
  // server component (children) は BFF を叩いて空に近い customers を生成しうるため、
  // hydration が走り終わるまで skeleton で受ける。
  // Phase 9: SDK connected モード時は stored が空でも fixture から表示できるので
  // skeleton で覆わない. On-chain only モード + stored 空の場合のみ skeleton で
  // 隠して useEffect の /setup リダイレクトを待つ.
  const showSkeleton = !hydrated || (dataMode === "onChainOnly" && stored.length === 0);

  return (
    <div className="app">
      <Sidebar
        activeProviderId={showSkeleton ? undefined : providerId}
        activeRoute={activeRoute}
        dataMode={dataMode}
      />
      <main className="main">
        {showSkeleton ? (
          <div style={{ padding: 40 }}>
            <div className="sk" style={{ width: 220, height: 18, marginBottom: 10 }} />
            <div className="sk" style={{ width: 320, height: 14 }} />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
