"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useActiveProvider } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import { formatRelativeAge } from "@/lib/format";
import type { DashboardMode } from "@/lib/data-mode";
import {
  DASHBOARD_MODE_STORAGE_KEY,
  migrateLegacyDashboardMode,
  readClientDashboardMode,
} from "@/lib/data-mode";
import { DashboardModeToggle } from "./DashboardModeToggle";

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
  // SSR / hydration 直後で同じ値を使うため、各 page から必ず渡す。
  renderedAtUnixSec: number;
  // dataMode: Server で cookie を読んだ結果。Phase 7 で追加。
  dataMode: DashboardMode;
};

export function TopBar({
  providerId,
  fallbackProviderName = "Flovia",
  crumbs,
  updatedAtUnixSec,
  renderedAtUnixSec,
  dataMode,
}: TopBarProps) {
  const { active, hydrated } = useActiveProvider(providerId);

  let providerName = fallbackProviderName;
  if (providerId) {
    if (!hydrated) providerName = "…";
    else if (active) providerName = active.name;
    else providerName = providerId;
  }

  // 初期 now は Server から渡される renderedAtUnixSec で初期化することで
  // SSR / hydration 直後に同じ値を使い mismatch を回避する。
  const [nowUnixSec, setNowUnixSec] = useState<number>(renderedAtUnixSec);
  useEffect(() => {
    const tick = () => setNowUnixSec(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const updatedLabel = formatRelativeAge(updatedAtUnixSec, nowUnixSec);

  // Phase 8: hydration 後に Phase 7 → 8 migration を 1 回だけ実行 + cookie → localStorage 再同期.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // 1. Phase 7 の旧 cookie/localStorage を新 key に移して旧 key を削除 (idempotent).
    migrateLegacyDashboardMode();
    // 2. cookie → localStorage の片方向再同期 (Phase 7 と同じロジック、key 名は新形式).
    const cookieMode = readClientDashboardMode();
    let lsMode: DashboardMode = "onChainOnly";
    try {
      const raw = window.localStorage.getItem(DASHBOARD_MODE_STORAGE_KEY);
      lsMode = raw === "sdkConnected" ? "sdkConnected" : "onChainOnly";
    } catch {
      lsMode = "onChainOnly";
    }
    if (cookieMode !== lsMode) {
      try {
        window.localStorage.setItem(DASHBOARD_MODE_STORAGE_KEY, cookieMode);
      } catch {
        // ignore quota
      }
    }
  }, []);

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
      <span
        className="btn"
        style={{ padding: "4px 9px", fontSize: 11.5, color: "var(--text-2)", cursor: "default" }}
        title="BFF returns cumulative aggregates only"
      >
        <Icon.calendar width="12" height="12" /> All time
      </span>
      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
        {updatedLabel}
      </span>
      <DashboardModeToggle mode={dataMode} />
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
