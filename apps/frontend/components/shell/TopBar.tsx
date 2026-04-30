"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useActiveProvider } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import type { DashboardMode } from "@/lib/data-mode";
import { formatRelativeAge } from "@/lib/format";

export type Crumb = {
  label: string;
  href?: string;
};

type TopBarProps = {
  providerId?: string;
  fallbackProviderName?: string;
  crumbs: Crumb[];
  // updatedAtUnixSec: BFF が返した最終 observation の時刻 (= freshness 判定対象)。
  // observations / dailyMetrics の両方が空なら呼び出し側が undefined を渡し、
  // TopBar 側で "Updated —" にフォールバックする。
  updatedAtUnixSec?: number;
  // renderedAtUnixSec: page Server Component が描画した時刻 (= 比較基準)。
  // SSR / hydration 直後で同じ値を使うため、freshness を出したい page から渡す。
  // 未指定の場合は "Updated 2m ago" の placeholder を出してフレッシュネス計算しない。
  renderedAtUnixSec?: number;
  // dataMode: Server で cookie を読んだ結果。Step 2 では受け取るだけで挙動には
  // 反映しない (Step 3 で DashboardModeToggle を導入するときに使う)。
  dataMode?: DashboardMode;
};

export function TopBar({
  providerId,
  fallbackProviderName = "Flovia",
  crumbs,
  updatedAtUnixSec,
  renderedAtUnixSec,
  dataMode: _dataMode,
}: TopBarProps) {
  const { active, hydrated } = useActiveProvider(providerId);

  let providerName = fallbackProviderName;
  if (providerId) {
    if (!hydrated) providerName = "…";
    else if (active) providerName = active.name;
    else providerName = providerId;
  }

  // freshness 用の now を保持。Server から渡された renderedAtUnixSec で初期化
  // することで SSR / hydration 直後に同じ値を使い mismatch を回避する。
  // renderedAtUnixSec が無い場合は freshness 計算自体を行わず placeholder を出す。
  const [nowUnixSec, setNowUnixSec] = useState<number | undefined>(renderedAtUnixSec);
  useEffect(() => {
    if (renderedAtUnixSec === undefined) return;
    const tick = () => setNowUnixSec(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [renderedAtUnixSec]);

  const updatedLabel =
    nowUnixSec === undefined ? "Updated 2m ago" : formatRelativeAge(updatedAtUnixSec, nowUnixSec);

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
      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
        {updatedLabel}
      </span>
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
