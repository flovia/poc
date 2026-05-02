"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useActiveProvider } from "@/app/providers";
import type { DashboardMode } from "@/lib/data-mode";

export type Crumb = {
  label: string;
  href?: string;
};

type TopBarProps = {
  providerId?: string;
  fallbackProviderName?: string;
  crumbs: Crumb[];
  // dataMode: Server で cookie を読んだ結果。Phase 7 で追加。
  dataMode: DashboardMode;
};

export function TopBar({
  providerId,
  fallbackProviderName = "Flovia",
  crumbs,
}: TopBarProps) {
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
      {/*
        グローバル UI 要素 (期間セレクタ / freshness インジケータ) は撤去済み。
        いずれもページ単独で意味を持つので、ページ内 Toolbar / Header に再配置する
        か、period filter と一緒に再設計する予定。詳細は docs/future-work.md を参照。
      */}
      {/*
        Search / Filters のアイコンボタンと、右上の "F" アバター placeholder も
        撤去済み。グローバル検索 / ページ横断フィルター / ユーザーメニューはいずれも
        現状要件ではなく、PoC は localStorage ベースで login / multi-workspace の
        概念が無い。詳細は docs/future-work.md を参照。
      */}
    </header>
  );
}
