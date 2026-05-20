"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useProviders } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import { ProviderAvatar } from "@/components/shell/ProviderAvatar";
import { inferBrandDisplayName, inferBrandDomain } from "@/lib/pay-sh/brand";
import { resolvePaySkill, usePaySkills } from "@/lib/pay-sh/skills";
import { findProviderByRouteId, isDemoProvider } from "@/lib/providers";
import type { DashboardMode } from "@/lib/data-mode";
// Phase 9: barrel ではなく leaf module から直 import (sdk-fixtures の他データを引き込まないため).
import { SDK_DEMO_PROVIDER_ID, SDK_DEMO_PROVIDER_NAME } from "@/lib/sdk-fixtures/shared";

// "wallet" is intentionally treated as a child of "customers" for nav
// highlighting — there's no top-level Wallet entry, the wallet detail page
// is reached by drilling in from the customers list.
export type ActiveRoute =
  | "customers"
  | "api-growth"
  | "geo-spec"
  | "machine-payment-routes"
  | "macro-metrics"
  | "metrics-catalog"
  | "showcase"
  | "setup"
  | "wallet"
  | undefined;

type SidebarProps = {
  activeProviderId: string | undefined;
  activeRoute: ActiveRoute;
  dataMode: DashboardMode;
  className?: string;
};

export function Sidebar({ activeProviderId, activeRoute, dataMode, className }: SidebarProps) {
  const pathname = usePathname();
  const { stored, userProviders, hydrated, demoOpted } = useProviders();
  const userIds = useMemo(
    () => new Set(userProviders.map((p) => p.providerId)),
    [userProviders],
  );

  // Phase 9: dataMode で stored 空の挙動を分岐.
  //   - On-chain only + stored 空 = Phase 4/5/6 と同一 (nav disabled, pill disabled)
  //   - SDK connected + stored 空 = nav active, pill は read-only (enabled だが click で開かない)
  //   - stored 1 件以上 (mode 問わず) = 通常挙動
  const isOnChainOnlyEmpty = hydrated && dataMode === "onChainOnly" && stored.length === 0;
  const isSdkEmpty = hydrated && dataMode === "sdkConnected" && stored.length === 0;

  const current = activeProviderId ? findProviderByRouteId(stored, activeProviderId) : undefined;
  // Phase 9: activeProviderId が sdk-demo (= stored 不在の仮想 provider) の場合も
  // Northwind Price API を表示する. SDK モード + stored>0 + /providers/sdk-demo/* 直アクセス
  // のケースでも仮想 provider 名で揃える.
  const isViewingSdkDemo =
    dataMode === "sdkConnected" && activeProviderId === SDK_DEMO_PROVIDER_ID && !current;
  const currentServiceId = current?.serviceId;
  const skills = usePaySkills();
  const currentSkill = resolvePaySkill(skills, currentServiceId);
  const currentName =
    currentSkill?.title
    ?? inferBrandDisplayName({ fqn: currentServiceId })
    ?? current?.name
    ?? (isViewingSdkDemo || isSdkEmpty
      ? SDK_DEMO_PROVIDER_NAME
      : hydrated
        ? "Select a provider"
        : "Loading…");
  const currentBrand = inferBrandDomain({
    fqn: currentSkill?.fqn ?? currentServiceId,
    serviceUrl: currentSkill?.service_url,
  });
  const currentIsDemo = current ? isDemoProvider(current, demoOpted, userIds) : false;
  const currentIsPaySh = current?.catalogSource === "pay_sh_curated";
  const showProviderPlaceholderIcon =
    !current && !isViewingSdkDemo && !isSdkEmpty && !currentServiceId;

  // hydration 後に provider が一つも無いとき My Customers を disabled 表示。
  // SSR (hydrated=false) では通常 Link を出すことで mismatch を避ける。
  // Phase 9: SDK connected モードでは disabled にしない.
  const providerRouteId = activeProviderId ?? (isSdkEmpty ? SDK_DEMO_PROVIDER_ID : undefined);
  const navDisabled = isOnChainOnlyEmpty || !providerRouteId;

  const customerOverviewHref = providerRouteId ? `/providers/${providerRouteId}/customers` : undefined;
  const coUsageHref = providerRouteId ? `/providers/${providerRouteId}/customers/co-usage-providers` : undefined;
  const customerOverviewActive = pathname === customerOverviewHref || activeRoute === "wallet";
  const customersSectionActive = customerOverviewActive || pathname === coUsageHref;
  const showcaseSectionActive = pathname === "/showcase" || pathname.startsWith("/showcase/");

  const navHrefFor = (
    segment: "api-growth" | "geo-spec" | "machine-payment-routes" | "macro-metrics" | "metrics-catalog",
  ) => {
    return providerRouteId ? `/providers/${providerRouteId}/${segment}` : "/setup";
  };

  return (
    <aside className={className ? `sidebar ${className}` : "sidebar"}>
      <div className="brand">
        <Image
          className="brand-mark"
          src="/logo.png"
          alt=""
          width={44}
          height={44}
          priority
        />
        <div className="brand-name">
          <span>Flovia</span>
          <em>Commercial Analytics</em>
          <span className="brand-tags" aria-label="Supported protocols">
            <span className="brand-tag">x402</span>
            <span className="brand-tag">MPP</span>
          </span>
        </div>
      </div>

      <Link
        href="/providers"
        className="provider-picker"
        aria-label="Change API provider"
      >
        {showProviderPlaceholderIcon ? (
          <span className="provider-picker__placeholder-icon" aria-hidden>
            <Icon.provider />
          </span>
        ) : (
          <ProviderAvatar
            name={currentName}
            serviceId={currentServiceId}
            brandDomain={currentBrand.domain}
            brandIconUrl={currentBrand.iconUrl}
            size={28}
          />
        )}
        <span className="provider-picker__body">
          <span className="provider-picker__eyebrow">Current provider</span>
          <span className="provider-picker__name" title={currentName}>
            {currentName}
          </span>
        </span>
        {(currentIsDemo || currentIsPaySh) && (
          <span className="provider-picker__badge" aria-hidden>
            {currentIsDemo ? "demo" : "Pay.sh"}
          </span>
        )}
        <span className="provider-picker__caret" aria-hidden>
          ›
        </span>
      </Link>

      <nav className="nav">
        {navDisabled ? (
          <span
            role="link"
            className="nav-item disabled"
            aria-disabled="true"
            aria-label="My Customers, setup required"
          >
            <Icon.customers />
            <span style={{ flex: 1 }}>My Customers</span>
          </span>
        ) : (
          <>
            <div className="nav-row">
              <span
                className={`nav-item nav-item--with-toggle nav-item--category${customersSectionActive ? " nav-item--category-active" : ""}`}
              >
                <Icon.customers />
                <span style={{ flex: 1 }}>My Customers</span>
              </span>
            </div>
            {customerOverviewHref && coUsageHref ? (
              <div
                id="nav-sub-customers"
                className="nav-sub"
              >
                <Link
                  href={customerOverviewHref}
                  className="nav-item nav-item--sub"
                  aria-current={customerOverviewActive}
                >
                  Customer Overview
                </Link>
                <Link
                  href={coUsageHref}
                  className="nav-item nav-item--sub"
                  aria-current={pathname === coUsageHref}
                >
                  Co-Usage Providers
                </Link>
              </div>
            ) : null}
          </>
        )}

        {navDisabled ? (
          <span
            role="link"
            className="nav-item disabled"
            aria-disabled="true"
            aria-label="Machine Payment Routes, setup required"
          >
            <Icon.bolt width={16} height={16} />
            <span style={{ flex: 1 }}>Payment Routes</span>
            <DemoNavBadge />
          </span>
        ) : (
          <Link
            href={navHrefFor("machine-payment-routes")}
            className="nav-item"
            aria-current={activeRoute === "machine-payment-routes"}
          >
            <Icon.bolt width={16} height={16} />
            <span style={{ flex: 1 }}>Payment Routes</span>
            <DemoNavBadge />
          </Link>
        )}

        {navDisabled ? (
          <span
            role="link"
            className="nav-item disabled"
            aria-disabled="true"
            aria-label="API Growth (demo), setup required"
          >
            <Icon.spark width={16} height={16} />
            <span style={{ flex: 1 }}>API Growth</span>
            <DemoNavBadge />
          </span>
        ) : (
          <Link
            href={navHrefFor("api-growth")}
            className="nav-item"
            aria-current={activeRoute === "api-growth"}
          >
            <Icon.spark width={16} height={16} />
            <span style={{ flex: 1 }}>API Growth</span>
            <DemoNavBadge />
          </Link>
        )}

        {navDisabled ? (
          <span
            role="link"
            className="nav-item disabled"
            aria-disabled="true"
            aria-label="GEO (Generative Engine Optimization), setup required"
          >
            <Icon.geo width={16} height={16} />
            <GeoNavLabel />
          </span>
        ) : (
          <Link
            href={navHrefFor("geo-spec")}
            className="nav-item"
            aria-current={activeRoute === "geo-spec"}
          >
            <Icon.geo width={16} height={16} />
            <GeoNavLabel />
          </Link>
        )}

        <div className="nav-label" style={{ marginTop: 18 }}>
          Showcase
        </div>
        <div className="nav-row">
          <span
            className={`nav-item nav-item--with-toggle nav-item--category${showcaseSectionActive ? " nav-item--category-active" : ""}`}
          >
            <Icon.external width={16} height={16} />
            <span style={{ flex: 1 }}>MPP Showcase</span>
            <DemoNavBadge />
          </span>
        </div>
        <div id="nav-sub-showcase" className="nav-sub">
          <Link href="/showcase" className="nav-item nav-item--sub" aria-current={pathname === "/showcase"}>
            Overview
          </Link>
          <Link
            href="/showcase/stripe-mpp"
            className="nav-item nav-item--sub"
            aria-current={pathname === "/showcase/stripe-mpp"}
          >
            Stripe MPP
          </Link>
          <Link
            href="/showcase/hitpay-mpp"
            className="nav-item nav-item--sub"
            aria-current={pathname === "/showcase/hitpay-mpp"}
          >
            HitPay MPP
          </Link>
          <Link
            href="/showcase/solana-mpp"
            className="nav-item nav-item--sub"
            aria-current={pathname === "/showcase/solana-mpp"}
          >
            Solana MPP
          </Link>
        </div>

      </nav>

      <div className="foot">
        <span className="badge">PoC</span>
        <span>Mock data · v0.4</span>
      </div>
    </aside>
  );
}

function GeoNavLabel() {
  return (
    <span style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
      <span>GEO</span>
      <span style={{ fontSize: 11, color: "var(--text-mute)", fontWeight: 400 }}>
        SEO for AI agents
      </span>
    </span>
  );
}

function DemoNavBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 5px",
        borderRadius: 3,
        background: "rgba(148,163,184,0.18)",
        color: "var(--text-3)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      demo
    </span>
  );
}
