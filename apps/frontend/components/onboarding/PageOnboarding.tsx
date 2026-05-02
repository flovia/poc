"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useFrontendLocale } from "@/lib/frontend-locale";

export type PageOnboardingMetric = {
  label: string;
  description: string;
  icon?: "activity" | "customers" | "external" | "growth" | "repeat" | "spark";
};

export type PageOnboardingContent = {
  id: string;
  title: string;
  description: string;
  metrics: PageOnboardingMetric[];
  note?: string;
};

type PageOnboardingProps = {
  content: PageOnboardingContent;
};

const storagePrefix = "flovia:onboarding:";

export function PageOnboarding({ content }: PageOnboardingProps) {
  const { text } = useFrontendLocale();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!window.localStorage.getItem(`${storagePrefix}${content.id}`)) {
      setOpen(true);
    }
  }, [content.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndRemember();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closeAndRemember = () => {
    window.localStorage.setItem(`${storagePrefix}${content.id}`, "seen");
    setOpen(false);
  };

  const showAgain = () => setOpen(true);
  const localized = localizeContent(content, text);

  return (
    <>
      <button
        type="button"
        className="topbar-info-button"
        aria-label={text(`Show guide for ${content.title}`, `${localized.title}のガイドを表示`)}
        title={text("Show page guide", "ページガイドを表示")}
        onClick={showAgain}
      >
        <Icon.info />
      </button>

      {hydrated && open ? (
        <div className="onboarding-modal-root" role="presentation">
          <button
            type="button"
            className="onboarding-modal-backdrop"
            aria-label={text("Close guide", "ガイドを閉じる")}
            onClick={closeAndRemember}
          />
          <section
            className="onboarding-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <button
              type="button"
              className="onboarding-modal-close"
              aria-label={text("Close guide", "ガイドを閉じる")}
              onClick={closeAndRemember}
            >
              <Icon.x />
            </button>
            <div className="onboarding-modal-icon">
              <Icon.bulb />
            </div>
            <h2 id={titleId} className="onboarding-modal-title">
              {localized.title}
            </h2>
            <p className="onboarding-modal-description">{localized.description}</p>
            <div className="onboarding-modal-metrics">
              {localized.metrics.map((metric, index) => (
                <div key={metric.label} className="onboarding-modal-metric">
                  <span className="onboarding-modal-metric-icon">
                    <MetricIcon icon={metric.icon} fallbackIndex={index} />
                  </span>
                  <div>
                    <div className="onboarding-modal-metric-label">{metric.label}</div>
                    <div className="onboarding-modal-metric-description">
                      {metric.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {localized.note ? (
              <div className="onboarding-modal-note">
                <span>{localized.note}</span>
              </div>
            ) : null}
            <button type="button" className="btn primary onboarding-modal-cta" onClick={closeAndRemember}>
              {text("View dashboard", "ダッシュボードを見る")}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

function localizeContent(
  content: PageOnboardingContent,
  text: (english: string, japanese: string) => string,
): PageOnboardingContent {
  if (content.id === "api-growth") {
    return {
      ...content,
      title: text("Track API growth intelligence", "API growth intelligence を確認"),
      description: text(
        "Understand where adoption comes from, what users repeat, and where packaging can unlock more growth.",
        "adoption がどこから来て、ユーザーが何を繰り返し、どの packaging が成長を広げるかを確認します。",
      ),
      metrics: [
        { label: text("Source quality", "Source quality（流入元の質）"), description: text("Which channels bring meaningful API activity.", "どのチャネルが意味のある API activity を生むか。"), icon: "spark" },
        { label: text("Endpoint frequency", "Endpoint frequency（頻度）"), description: text("What users call often enough to become habits.", "ユーザーが habit になるほど頻繁に呼ぶもの。"), icon: "activity" },
        { label: text("Repeat usage", "Repeat usage（リピート利用）"), description: text("Why wallets return after the first interaction.", "初回 interaction 後に wallet が戻る理由。"), icon: "repeat" },
        { label: text("Growth opportunities", "Growth opportunities（成長機会）"), description: text("Where to improve activation, packaging, or positioning.", "activation / packaging / positioning の改善箇所。"), icon: "growth" },
      ],
      note: text(
        'The "API Growth" menu is designed to come alive by connecting your internal data with the Flovia SDK. Until your data is connected, we are showing tentative demo data for reference.',
        "API Growth は Flovia SDK で internal data を接続すると本来の価値が出る画面です。未接続の間は reference 用の demo data を表示しています。",
      ),
    };
  }

  return content;
}

function MetricIcon({
  icon,
  fallbackIndex,
}: {
  icon: PageOnboardingMetric["icon"];
  fallbackIndex: number;
}) {
  if (icon === "activity") return <Icon.bolt />;
  if (icon === "customers") return <Icon.customers />;
  if (icon === "external") return <Icon.external />;
  if (icon === "growth") return <Icon.arrow />;
  if (icon === "repeat") return <Icon.refresh />;
  if (icon === "spark") return <Icon.spark />;

  return <span className="onboarding-modal-metric-fallback">{fallbackIndex + 1}</span>;
}
