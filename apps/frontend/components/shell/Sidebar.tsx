"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useProviders } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import { formatPayToShort, getDisplayPayTo, isDemoProvider } from "@/lib/providers";
import type { DashboardMode } from "@/lib/data-mode";
// Phase 9: barrel ではなく leaf module から直 import (sdk-fixtures の他データを引き込まないため).
import { SDK_DEMO_PROVIDER_ID, SDK_DEMO_PROVIDER_NAME } from "@/lib/sdk-fixtures/shared";

// "wallet" is intentionally treated as a child of "customers" for nav
// highlighting — there's no top-level Wallet entry, the wallet detail page
// is reached by drilling in from the customers list.
type ActiveRoute = "customers" | "macro-metrics" | "metrics-catalog" | "setup" | "wallet" | undefined;

type SidebarProps = {
  activeProviderId: string | undefined;
  activeRoute: ActiveRoute;
  dataMode: DashboardMode;
};

// When switching providers via the saved-providers list, prefer to keep the
// user on whichever section they were already viewing. Wallet detail can't
// carry over (the wallet address belongs to one provider's view), so it
// falls back to that provider's customers list.
function sectionFor(activeRoute: ActiveRoute): "customers" | "macro-metrics" | "metrics-catalog" {
  if (activeRoute === "metrics-catalog") return "metrics-catalog";
  if (activeRoute === "macro-metrics") return "macro-metrics";
  return "customers";
}

export function Sidebar({ activeProviderId, activeRoute, dataMode }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { stored, userProviders, hydrated, removeProvider, demoOpted, optOutDemo } = useProviders();
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
  const currentName =
    current?.name
    ?? (isViewingSdkDemo || isSdkEmpty
      ? SDK_DEMO_PROVIDER_NAME
      : hydrated
        ? "Select a provider"
        : "Loading…");
  const section = sectionFor(activeRoute);
  // hydration 後に provider が一つも無いとき My Customers を disabled 表示。
  // SSR (hydrated=false) では通常 Link を出すことで mismatch を避ける。
  // Phase 9: SDK connected モードでは disabled にしない.
  const navDisabled = isOnChainOnlyEmpty;

  // Phase 6: Currently viewing dropdown (disclosure) の開閉 state。
  const [open, setOpen] = useState(false);

  // My Customers サブナビは default 展開. localStorage で永続化, アクティブ時は強制展開.
  const customersGroupActive = activeRoute === "customers" || activeRoute === "wallet";
  const [customersSubOpen, setCustomersSubOpen] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem("flovia.sidebar.customersSubOpen");
      if (v === "0") setCustomersSubOpen(false);
    } catch {}
  }, []);
  const toggleCustomersSub = useCallback(() => {
    setCustomersSubOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("flovia.sidebar.customersSubOpen", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);
  const customersSubVisible = customersGroupActive || customersSubOpen;
  const providerBlockRef = useRef<HTMLDivElement>(null);
  const pillId = useId();
  const providerListId = useId();
  // 表示判定: stored が 0 になった瞬間に open を残さない。useEffect でも下記で false に戻す。
  const effectiveOpen = stored.length > 0 && open;

  const close = useCallback(() => setOpen(false), []);

  // stored が 0 になった瞬間に open を強制リセット (例: 最後の provider を削除/Reset した場合)。
  useEffect(() => {
    if (stored.length === 0 && open) setOpen(false);
  }, [stored.length, open]);

  // 開いている間だけ outside-click と Esc を監視する。
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const root = providerBlockRef.current;
      if (root && !root.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const navHrefFor = (segment: "customers" | "macro-metrics" | "metrics-catalog") => {
    const id =
      activeProviderId
      ?? stored[0]?.providerId
      ?? (dataMode === "sdkConnected" ? SDK_DEMO_PROVIDER_ID : undefined);
    return id ? `/providers/${id}/${segment}` : "/setup";
  };

  // Phase 9: SDK connected モードでは provider が 0 件になっても /setup に飛ばさず
  // 仮想 sdk-demo に留める. fallbackHref は section + dataMode で決まる.
  const fallbackHrefAfterEmpty = () =>
    dataMode === "sdkConnected"
      ? `/providers/${SDK_DEMO_PROVIDER_ID}/${section}`
      : "/setup";

  const handleDelete = (providerId: string, name: string, isDemo: boolean) => {
    if (isDemo) {
      if (!window.confirm("Reset demo data? Your own providers will be kept.")) return;
      optOutDemo();
      // demo を全 off にすると user provider が無ければ active が消えるため fallback へ。
      // user provider があれば最初の user provider のページへ遷移する。
      if (providerId === activeProviderId) {
        if (userProviders.length > 0) {
          router.replace(`/providers/${userProviders[0].providerId}/${section}`);
        } else {
          router.replace(fallbackHrefAfterEmpty());
        }
      }
      return;
    }
    if (!window.confirm(`Remove ${name} from this browser?`)) return;
    const remaining = stored.filter((p) => p.providerId !== providerId);
    removeProvider(providerId);
    if (providerId === activeProviderId) {
      if (remaining.length > 0) {
        router.replace(`/providers/${remaining[0].providerId}/${section}`);
      } else {
        router.replace(fallbackHrefAfterEmpty());
      }
    }
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
          Flovia<em>x402 co-usage</em>
        </div>
      </div>

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
            My Customers
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
                My Customers
              </Link>
              <button
                type="button"
                className="nav-toggle"
                aria-expanded={customersSubVisible}
                aria-controls="nav-sub-customers"
                aria-label={customersSubVisible ? "Collapse My Customers" : "Expand My Customers"}
                onClick={toggleCustomersSub}
                disabled={customersGroupActive}
                title={customersGroupActive ? "Sub-pages of the active section" : undefined}
              >
                <span className="caret" aria-hidden="true">{customersSubVisible ? "▾" : "▸"}</span>
              </button>
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
                  hidden={!customersSubVisible}
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
            aria-label="Macro Metrics, setup required"
          >
            <Icon.bolt width={16} height={16} />
            Macro Metrics
          </span>
        ) : (
          <Link
            href={navHrefFor("macro-metrics")}
            className="nav-item"
            aria-current={activeRoute === "macro-metrics" || activeRoute === "metrics-catalog"}
          >
            <Icon.bolt width={16} height={16} />
            Macro Metrics
          </Link>
        )}

        <Link href="/setup" className="nav-item" aria-current={activeRoute === "setup"}>
          <Icon.setup />
          Setup
        </Link>

        <div className="provider-block" ref={providerBlockRef}>
          <div className="label">Currently viewing</div>

          {!hydrated ? (
            <>
              <div className="sk" style={{ height: 32, marginBottom: 8 }} />
              <div className="provider-list">
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                id={pillId}
                className="provider-pill"
                aria-expanded={!isSdkEmpty && stored.length > 0 ? effectiveOpen : undefined}
                aria-controls={!isSdkEmpty && stored.length > 0 ? providerListId : undefined}
                aria-disabled={isOnChainOnlyEmpty ? "true" : undefined}
                disabled={isOnChainOnlyEmpty}
                onClick={() => {
                  // Phase 9: SDK connected モード + stored 空のとき pill は read-only (click で何もしない).
                  if (isOnChainOnlyEmpty) return;
                  if (isSdkEmpty) return;
                  setOpen((v) => !v);
                }}
              >
                <span className="dot" />
                <span className="name">{currentName}</span>
                {!isSdkEmpty && (
                  <span className="caret">{effectiveOpen ? "▴" : "▾"}</span>
                )}
              </button>

              {effectiveOpen && (
                <div id={providerListId} className="provider-list" aria-labelledby={pillId}>
                  {stored.map((p) => {
                    const isActive = p.providerId === activeProviderId;
                    const isDemo = isDemoProvider(p, demoOpted, userIds);
                    const isGenerated = p.source === "generated";
                    return (
                      <div key={p.providerId} className="provider-row" aria-current={isActive}>
                        <Link
                          href={`/providers/${p.providerId}/${section}`}
                          onClick={close}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 0,
                            color: "inherit",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isActive ? "var(--teal)" : "var(--text-mute)",
                              boxShadow: "none",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </span>
                          {isDemo && (
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
                          )}
                          {isGenerated && (
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
                          )}
                          <span className="pay">{formatPayToShort(getDisplayPayTo(p))}</span>
                        </Link>
                        {!isGenerated && (
                          <button
                            type="button"
                            className="x"
                            onClick={() => handleDelete(p.providerId, p.name, isDemo)}
                            title={isDemo ? "Reset demo data" : `Remove ${p.name}`}
                            aria-label={isDemo ? "Reset demo data" : `Remove ${p.name}`}
                          >
                            <Icon.x width="10" height="10" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <Link
                    href="/setup"
                    className="add-pay"
                    onClick={close}
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    + Add new pay_to
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      <div className="foot">
        <span className="badge">PoC</span>
        <span>Mock data · v0.4</span>
      </div>
    </aside>
  );
}
