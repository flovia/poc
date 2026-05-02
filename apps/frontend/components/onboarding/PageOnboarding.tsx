"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

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
  visual?: "walletProfile";
};

type PageOnboardingProps = {
  content: PageOnboardingContent;
};

const storagePrefix = "flovia:onboarding:";

export function PageOnboarding({ content }: PageOnboardingProps) {
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

  return (
    <>
      <button
        type="button"
        className="topbar-info-button"
        aria-label={`Show guide for ${content.title}`}
        title="Show page guide"
        onClick={showAgain}
      >
        <Icon.info />
      </button>

      {hydrated && open ? (
        <div className="onboarding-modal-root" role="presentation">
          <button
            type="button"
            className="onboarding-modal-backdrop"
            aria-label="Close guide"
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
              aria-label="Close guide"
              onClick={closeAndRemember}
            >
              <Icon.x />
            </button>
            <div className="onboarding-modal-icon">
              <Icon.bulb />
            </div>
            <h2 id={titleId} className="onboarding-modal-title">
              {content.title}
            </h2>
            <p className="onboarding-modal-description">{content.description}</p>
            <div className="onboarding-modal-metrics">
              {content.metrics.map((metric, index) => (
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
            {content.visual === "walletProfile" ? <WalletProfileOnboardingVisual /> : null}
            {content.note ? (
              <div className="onboarding-modal-note">
                <span>{content.note}</span>
              </div>
            ) : null}
            <button type="button" className="btn primary onboarding-modal-cta" onClick={closeAndRemember}>
              View dashboard
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function WalletProfileOnboardingVisual() {
  return (
    <div className="onboarding-wallet-visual" aria-hidden="true">
      <div className="onboarding-wallet-window-bar">
        <span />
        <span />
        <span />
      </div>
      <div className="onboarding-wallet-mini-table">
        <div className="onboarding-wallet-mini-head">
          <span>Wallet</span>
          <span>Spend</span>
          <span>Providers</span>
        </div>
        <div className="onboarding-wallet-mini-row">
          <div className="onboarding-wallet-mini-wallet">
            <span className="mono">0x15c3...bc2b</span>
            <small>Wallet profile →</small>
          </div>
          <span className="mono">12,450 USDC</span>
          <span className="mono">4</span>
        </div>
        <span className="onboarding-wallet-cursor" />
      </div>

      <div className="onboarding-wallet-opened-label">↓ Click for detail analytics</div>

      <div className="onboarding-wallet-preview-panel">
        <div className="onboarding-wallet-preview-header">
          <div>
            <div className="onboarding-wallet-preview-kicker">Wallet profile</div>
            <div className="mono onboarding-wallet-preview-address">0x15c3...bc2b</div>
          </div>
        </div>
        <div className="onboarding-wallet-preview-grid">
          <OnboardingWalletPreviewItem
            icon={<Icon.spark />}
            label="Spend history"
            value="payments, last seen, 7d trend"
          />
          <OnboardingWalletPreviewItem
            icon={<Icon.bolt />}
            label="AI agent context"
            value="SDK-reported agent metadata"
          />
          <OnboardingWalletPreviewItem
            icon={<Icon.customers />}
            label="Provider network"
            value="other providers this wallet pays"
          />
        </div>
      </div>
    </div>
  );
}

function OnboardingWalletPreviewItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="onboarding-wallet-preview-item">
      <span className="onboarding-wallet-preview-icon">{icon}</span>
      <div>
        <div className="onboarding-wallet-preview-label">{label}</div>
        <div className="onboarding-wallet-preview-value">{value}</div>
      </div>
    </div>
  );
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
