"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useActiveProvider } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";

export type Crumb = {
  label: string;
  href?: string;
};

type TopBarProps = {
  providerId?: string;
  fallbackProviderName?: string;
  crumbs: Crumb[];
};

export function TopBar({ providerId, fallbackProviderName = "Flovia", crumbs }: TopBarProps) {
  const { active, hydrated } = useActiveProvider(providerId);

  let providerName = fallbackProviderName;
  if (providerId) {
    if (!hydrated) providerName = "…";
    else if (active) providerName = active.name;
    else providerName = providerId;
  }

  return (
    <header className="topbar">
      <div className="crumb">
        <span style={{ color: "var(--text-3)" }}>{providerName}</span>
        <span className="sep">/</span>
        {crumbs.map(({ label, href }, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {href ? (
              <Link href={href} className="ghost" style={{ color: "var(--text-2)" }}>
                {label}
              </Link>
            ) : (
              <span className="cur">{label}</span>
            )}
          </Fragment>
        ))}
      </div>
      <div className="spacer" />
      <button className="btn" style={{ padding: "4px 9px", fontSize: 11.5, color: "var(--text-2)" }}>
        <Icon.calendar width="12" height="12" /> Last 30d
        <span style={{ color: "var(--text-mute)", marginLeft: 4 }}>▾</span>
      </button>
      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>Updated 2m ago</span>
      <span className="pill">
        <span className="dot" />
        LIVE
      </span>
      <button className="icon-btn" title="Search">
        <Icon.search />
      </button>
      <button className="icon-btn" title="Filters">
        <Icon.filter />
      </button>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 3,
          background: "#1D4ED8",
          display: "grid",
          placeItems: "center",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 11,
        }}
      >
        F
      </div>
    </header>
  );
}
