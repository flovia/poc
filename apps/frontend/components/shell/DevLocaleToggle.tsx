"use client";

import { useFrontendLocale } from "@/lib/frontend-locale";

export function DevLocaleToggle() {
  const { enabled, locale, toggleLocale } = useFrontendLocale();
  if (!enabled) return null;

  const nextLocale = locale === "en" ? "ja" : "en";

  return (
    <button
      type="button"
      className="topbar-locale-toggle"
      aria-label={`Switch debug locale to ${nextLocale}`}
      title={`Debug locale: ${locale.toUpperCase()}`}
      onClick={toggleLocale}
    >
      <span className={locale === "en" ? "active" : undefined}>EN</span>
      <span aria-hidden="true">/</span>
      <span className={locale === "ja" ? "active" : undefined}>JA</span>
    </button>
  );
}
