"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProviders } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import type { DashboardMode } from "@/lib/data-mode";
import { formatPayToShort, getDisplayPayTo } from "@/lib/providers";

// "wallet" is intentionally treated as a child of "customers" for nav
// highlighting — there's no top-level Wallet entry, the wallet detail page
// is reached by drilling in from the customers list.
type ActiveRoute = "customers" | "patterns" | "setup" | "wallet" | undefined;

type SidebarProps = {
  activeProviderId: string | undefined;
  activeRoute: ActiveRoute;
  // dataMode は呼び出し側 (server component) が cookie 由来で計算して渡す。
  // Step 2 では値を受け取るだけで挙動は変えない。Step 3 で SDK connected mode
  // のサイドバー差分 (空状態の挙動 / Currently viewing dropdown 等) を入れる
  // ときに使う。
  dataMode?: DashboardMode;
};

// When switching providers via the saved-providers list, prefer to keep the
// user on whichever section they were already viewing. Wallet detail can't
// carry over (the wallet address belongs to one provider's view), so it
// falls back to that provider's customers list.
function sectionFor(activeRoute: ActiveRoute): "customers" | "patterns" {
  return activeRoute === "patterns" ? "patterns" : "customers";
}

export function Sidebar({ activeProviderId, activeRoute, dataMode: _dataMode }: SidebarProps) {
  const router = useRouter();
  const { stored, hydrated, removeProvider } = useProviders();

  const current = activeProviderId ? stored.find((p) => p.providerId === activeProviderId) : undefined;
  const currentName = current?.name ?? (hydrated ? "Select a provider" : "Loading…");
  const section = sectionFor(activeRoute);

  const navHrefFor = (segment: "customers" | "patterns") => {
    const id = activeProviderId ?? stored[0]?.providerId;
    return id ? `/providers/${id}/${segment}` : "/setup";
  };

  const handleDelete = (providerId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this browser?`)) return;
    const remaining = stored.filter((p) => p.providerId !== providerId);
    removeProvider(providerId);
    if (providerId === activeProviderId) {
      if (remaining.length > 0) {
        router.replace(`/providers/${remaining[0].providerId}/${section}`);
      } else {
        router.replace("/setup");
      }
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-name">
          Flovia<em>x402 co-usage</em>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-label">Workspace</div>

        <Link
          href={navHrefFor("customers")}
          className="nav-item"
          aria-current={activeRoute === "customers" || activeRoute === "wallet"}
        >
          <Icon.customers />
          My Customers
        </Link>

        <Link href={navHrefFor("patterns")} className="nav-item" aria-current={activeRoute === "patterns"}>
          <Icon.patterns />
          Co-usage Patterns
        </Link>

        <Link href="/setup" className="nav-item" aria-current={activeRoute === "setup"}>
          <Icon.setup />
          Setup
        </Link>

        <div className="provider-block">
          <div className="label">Currently viewing</div>
          <div className="provider-pill">
            <span className="dot" />
            <span className="name">{currentName}</span>
            <span className="caret">▾</span>
          </div>

          <div className="provider-list">
            {!hydrated ? (
              <>
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
                <div className="sk" style={{ height: 22, margin: "4px 0" }} />
              </>
            ) : (
              stored.map((p) => {
                const isActive = p.providerId === activeProviderId;
                return (
                  <div key={p.providerId} className="provider-row" aria-current={isActive}>
                    <Link
                      href={`/providers/${p.providerId}/${section}`}
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
                      <span className="pay">{formatPayToShort(getDisplayPayTo(p))}</span>
                    </Link>
                    <button
                      type="button"
                      className="x"
                      onClick={() => handleDelete(p.providerId, p.name)}
                      title={`Remove ${p.name}`}
                      aria-label={`Remove ${p.name}`}
                    >
                      <Icon.x width="10" height="10" />
                    </button>
                  </div>
                );
              })
            )}

            <Link href="/setup" className="add-pay" style={{ display: "block", textDecoration: "none" }}>
              + Add new pay_to
            </Link>
          </div>
        </div>
      </nav>

      <div className="foot">
        <span className="badge">PoC</span>
        <span>Mock data · v0.4</span>
      </div>
    </aside>
  );
}
