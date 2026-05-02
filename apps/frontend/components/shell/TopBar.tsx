"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useActiveProvider } from "@/app/providers";
import { PageOnboarding, type PageOnboardingContent } from "@/components/onboarding/PageOnboarding";
import { DevLocaleToggle } from "@/components/shell/DevLocaleToggle";
import type { DashboardMode } from "@/lib/data-mode";
import { useFrontendLocale } from "@/lib/frontend-locale";

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
  onboarding?: PageOnboardingContent;
};

export function TopBar({
  providerId,
  fallbackProviderName = "Flovia",
  crumbs,
  onboarding,
}: TopBarProps) {
  const { text } = useFrontendLocale();
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
                {topBarLabel(label, text)}
              </Link>
            ) : (
              <span className="cur">{topBarLabel(label, text)}</span>
            )}
          </Fragment>
        ))}
      </div>
      <div className="spacer" />
      <DevLocaleToggle />
      {onboarding ? <PageOnboarding content={onboarding} /> : null}
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

function topBarLabel(label: string, text: (english: string, japanese: string) => string) {
  if (label === "Setup") return text("Setup", "セットアップ");
  if (label === "Customers") return text("Customers", "Customers（顧客）");
  if (label === "Co-Usage Providers") return text("Co-Usage Providers", "Co-Usage Providers（併用プロバイダー）");
  if (label === "API Growth") return text("API Growth", "API Growth（API成長）");
  if (label === "Macro Metrics") return text("Macro Metrics", "Macro Metrics（マクロ指標）");
  if (label === "Metrics Catalog") return text("Metrics Catalog", "Metrics Catalog（指標カタログ）");
  return label;
}
