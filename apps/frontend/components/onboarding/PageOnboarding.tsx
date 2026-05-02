"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type PageOnboardingMetric = {
  label: string;
  description: string;
};

export type PageOnboardingContent = {
  id: string;
  title: string;
  description: string;
  metrics: PageOnboardingMetric[];
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
              <Icon.spark />
            </div>
            <h2 id={titleId} className="onboarding-modal-title">
              {content.title}
            </h2>
            <p className="onboarding-modal-description">{content.description}</p>
            <div className="onboarding-modal-metrics">
              {content.metrics.map((metric) => (
                <div key={metric.label} className="onboarding-modal-metric">
                  <span className="onboarding-modal-metric-dot" />
                  <div>
                    <div className="onboarding-modal-metric-label">{metric.label}</div>
                    <div className="onboarding-modal-metric-description">
                      {metric.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn primary onboarding-modal-cta" onClick={closeAndRemember}>
              View dashboard
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
