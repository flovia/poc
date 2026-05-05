"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useProviders } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import { ProviderAvatar } from "@/components/shell/ProviderAvatar";
import { inferBrandDomain } from "@/lib/pay-sh/brand";
import { resolvePaySkill, usePaySkills } from "@/lib/pay-sh/skills";
import { isDemoProvider } from "@/lib/providers";
import type { DashboardMode } from "@/lib/data-mode";
// Phase 9: barrel ではなく leaf module から直 import (sdk-fixtures の他データを引き込まないため).
import { SDK_DEMO_PROVIDER_ID, SDK_DEMO_PROVIDER_NAME } from "@/lib/sdk-fixtures/shared";

// "wallet" is intentionally treated as a child of "customers" for nav
// highlighting — there's no top-level Wallet entry, the wallet detail page
// is reached by drilling in from the customers list.
type ActiveRoute = "customers" | "api-growth" | "geo-spec" | "macro-metrics" | "metrics-catalog" | "setup" | "wallet" | undefined;

type SidebarProps = {
  activeProviderId: string | undefined;
  activeRoute: ActiveRoute;
  dataMode: DashboardMode;
};

export function Sidebar({ activeProviderId, activeRoute, dataMode }: SidebarProps) {
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

  const current = activeProviderId ? stored.find((p) => p.providerId === activeProviderId) : undefined;
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
    ?? current?.name
    ?? (isViewingSdkDemo || isSdkEmpty
      ? SDK_DEMO_PROVIDER_NAME
      : hydrated
        ? "Select a provider"
        : "Loading…");
  const currentBrandDomain = inferBrandDomain({
    fqn: currentSkill?.fqn ?? currentServiceId,
    serviceUrl: currentSkill?.service_url,
  }).domain;
  const currentIsDemo = current ? isDemoProvider(current, demoOpted, userIds) : false;
  const currentIsPaySh =
    current?.source === "generated" && current.serviceId !== "pro-api.coingecko.com";

  // hydration 後に provider が一つも無いとき My Customers を disabled 表示。
  // SSR (hydrated=false) では通常 Link を出すことで mismatch を避ける。
  // Phase 9: SDK connected モードでは disabled にしない.
  const navDisabled = isOnChainOnlyEmpty;

  const customersGroupActive = activeRoute === "customers" || activeRoute === "wallet";

  const navHrefFor = (segment: "customers" | "api-growth" | "geo-spec" | "macro-metrics" | "metrics-catalog") => {
    const id =
      activeProviderId
      ?? stored[0]?.providerId
      ?? (dataMode === "sdkConnected" ? SDK_DEMO_PROVIDER_ID : undefined);
    return id ? `/providers/${id}/${segment}` : "/setup";
  };

  return (
    <aside className="sidebar">
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
          Flovia<em>x402 analytics</em>
        </div>
      </div>

      <Link
        href="/providers"
        className="provider-picker"
        aria-label="Change API provider"
      >
        <ProviderAvatar
          name={currentName}
          serviceId={currentServiceId}
          brandDomain={currentBrandDomain}
          size={28}
        />
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
        <div className="nav-label">Workspace</div>

        {navDisabled ? (
          <span
            role="link"
            className="nav-item disabled"
            aria-disabled="true"
            aria-label="My Customers, setup required"
          >
            <Icon.customers />
            <span style={{ flex: 1 }}>My Customers</span>
            <RealNavBadge />
          </span>
        ) : (
          <>
            <div className="nav-row">
              <Link
                href={navHrefFor("customers")}
                className="nav-item nav-item--with-toggle"
                aria-current={customersGroupActive}
              >
                <Icon.customers />
                <span style={{ flex: 1 }}>My Customers</span>
                <RealNavBadge />
              </Link>
            </div>
            {(() => {
              const id =
                activeProviderId
                ?? stored[0]?.providerId
                ?? (dataMode === "sdkConnected" ? SDK_DEMO_PROVIDER_ID : undefined);
              if (!id) return null;
              const coUsageHref = `/providers/${id}/customers/co-usage-providers`;
              return (
                <div
                  id="nav-sub-customers"
                  className="nav-sub"
                >
                  <Link
                    href={coUsageHref}
                    className="nav-item nav-item--sub"
                    aria-current={pathname === coUsageHref}
                  >
                    Co-Usage Providers
                  </Link>
                </div>
              );
            })()}
          </>
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
        Generative Engine Optimization
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

function RealNavBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 5px",
        borderRadius: 3,
        background: "rgba(45,127,249,0.14)",
        color: "var(--mesh-blue)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      real
    </span>
  );
}
